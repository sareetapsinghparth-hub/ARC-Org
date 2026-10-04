"""Document Ingestion Module for ReasonLens.

Handles: PDF -> text -> chunked data with metadata.
"""

from pathlib import Path
import json
import pymupdf


BASE_DIR = Path(__file__).resolve().parent.parent
DOCUMENTS_DIR = BASE_DIR / "data" / "documents"
PROCESSED_DIR = BASE_DIR / "data" / "processed"


def extract_pages_from_pdf(pdf_path: Path | str) -> list[dict]:
    """Extract page number and raw text from a PDF file."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found at {pdf_path}")

    doc = pymupdf.open(str(pdf_path))
    pages = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            pages.append({
                "page": page_num + 1,
                "text": text
            })
    doc.close()
    return pages


def chunk_page_text(pages: list[dict], source_name: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """Split page text into chunks with metadata."""
    chunks = []
    chunk_index = 1

    for item in pages:
        page_num = item["page"]
        text = item["text"]
        words = text.split()

        if not words:
            continue

        step = max(1, chunk_size - overlap)
        for i in range(0, len(words), step):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            if chunk_text.strip():
                chunk_id = f"{Path(source_name).stem}_page{page_num}_chunk{chunk_index}"
                chunks.append({
                    "id": chunk_id,
                    "text": chunk_text,
                    "source": source_name,
                    "page": page_num,
                    "subject": None,
                    "topic": None,
                    "concept": None,
                    "prerequisites": []
                })
                chunk_index += 1

    return chunks


def save_chunks_to_jsonl(chunks: list[dict], output_path: Path | str):
    """Save processed chunks into a JSONL file."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")


def ingest_document(pdf_name: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """Ingest a document from data/documents and return chunk list."""
    pdf_path = DOCUMENTS_DIR / pdf_name
    pages = extract_pages_from_pdf(pdf_path)
    chunks = chunk_page_text(pages, source_name=pdf_name, chunk_size=chunk_size, overlap=overlap)
    return chunks
