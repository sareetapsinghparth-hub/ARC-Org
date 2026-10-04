"""ReasonLens API Layer.

Logical Component 6: API
Exposes:
- GET  /health     -> Check service and index status
- POST /retrieve   -> Retrieval-only testing endpoint
- POST /ask        -> Complete end-to-end text RAG question answering pipeline
- POST /ask-image  -> Multimodal image understanding + RAG question answering pipeline
"""

import io
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image

from ml.retriever import ReasonLensRetriever
from ml.generator import RAGGenerator
from ml.video_processor import (
    validate_video_file,
    extract_representative_frames,
    VideoProcessingError,
    MAX_VIDEO_SIZE_BYTES,
)


app = FastAPI(title="ReasonLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize logical components (reusing existing pre-indexed data)
try:
    retriever = ReasonLensRetriever()
    generator = RAGGenerator()
except Exception as init_err:
    print(f"Warning during startup initialization: {init_err}")
    retriever = None
    generator = None

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
SUPPORTED_MIME_TYPES = {
    "image/png": "image/png",
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/webp": "image/webp",
}


class QueryRequest(BaseModel):
    question: str
    top_k: int = Field(default=5, ge=1, le=20)


@app.get("/health")
def health():
    """Health check endpoint showing vector store metrics."""
    if retriever is None:
        raise HTTPException(
            status_code=500,
            detail="Retriever is not initialized. Check FAISS index and metadata files."
        )
    return {
        "status": "ok",
        "vectors": retriever.index.ntotal,
        "dimensions": retriever.index.d,
        "metadata": len(retriever.metadata),
    }


@app.post("/retrieve")
def retrieve(request: QueryRequest):
    """Retrieval-only endpoint for semantic search testing."""
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if retriever is None:
        raise HTTPException(
            status_code=500,
            detail="Retriever is not initialized. Check FAISS index and metadata files."
        )

    try:
        results = retriever.search(
            request.question,
            top_k=request.top_k
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding or FAISS retrieval error: {str(e)}"
        )

    return {
        "question": request.question,
        "results": results,
    }


@app.post("/ask")
def ask(request: QueryRequest):
    """Complete RAG pipeline: retrieval + Gemini grounded answer generation."""
    # 1. Validate question
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if retriever is None or generator is None:
        raise HTTPException(
            status_code=500,
            detail="ReasonLens services are not fully initialized."
        )

    # 2. Retrieve top-k relevant chunks from FAISS
    try:
        results = retriever.search(
            request.question,
            top_k=request.top_k
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding or FAISS retrieval error: {str(e)}"
        )

    # 3. Generate grounded answer with Gemini
    try:
        generation = generator.generate_answer(
            question=request.question,
            chunks=results
        )
    except ValueError as e:
        # Handles missing GEMINI_API_KEY or configuration errors
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        # Handles external API errors gracefully
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error: {str(e)}"
        )

    # 4. Return grounded answer and source citations
    return {
        "question": request.question,
        "answer": generation["answer"],
        "sources": generation["sources"],
        # Additional metadata fields
        "source_pdf": generation["source_pdf"],
        "page_numbers": generation["page_numbers"],
        "citations": generation["citations"],
        "relevant_chunks": generation["relevant_chunks"],
        "results": results,
    }


@app.post("/ask-image")
async def ask_image(
    image: UploadFile = File(...),
    question: Optional[str] = Form(None),
    top_k: int = Form(5)
):
    """Multimodal RAG pipeline: image understanding + FAISS retrieval + grounded Gemini answer."""
    if retriever is None or generator is None:
        raise HTTPException(
            status_code=500,
            detail="ReasonLens services are not fully initialized."
        )

    # 1. Validate MIME type / extension
    content_type = (image.content_type or "").lower()
    if content_type not in SUPPORTED_MIME_TYPES:
        filename = (image.filename or "").lower()
        if filename.endswith(".png"):
            content_type = "image/png"
        elif filename.endswith((".jpg", ".jpeg")):
            content_type = "image/jpeg"
        elif filename.endswith(".webp"):
            content_type = "image/webp"
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported image format. Please upload a PNG, JPG/JPEG, or WEBP image."
            )

    # 2. Read file bytes and validate size limit
    image_bytes = await image.read()
    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Image size exceeds the 15MB limit. Please upload a smaller image."
        )

    # 3. Verify image integrity with PIL
    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        pil_image.verify()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid or readable image."
        )

    # 4. Extract content and formulate search query with Gemini
    clean_question = question.strip() if (question and question.strip()) else None

    try:
        image_analysis = generator.analyze_image_and_extract(
            image_bytes=image_bytes,
            mime_type=content_type,
            user_question=clean_question
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini vision analysis error: {str(e)}"
        )

    # 5. Query FAISS vector index with extracted query
    search_query = image_analysis.get("search_query") or clean_question or "Engineering Physics concept"
    try:
        results = retriever.search(search_query, top_k=top_k)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"FAISS retrieval error during image search: {str(e)}"
        )

    # 6. Generate grounded multimodal explanation
    effective_question = clean_question or image_analysis.get("extracted_question") or "Explain the concept shown in this image"
    try:
        generation = generator.generate_image_grounded_answer(
            image_bytes=image_bytes,
            mime_type=content_type,
            question=effective_question,
            chunks=results,
            image_analysis=image_analysis
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini grounded answer generation error: {str(e)}"
        )

    return {
        "question": effective_question,
        "answer": generation["answer"],
        "sources": generation["sources"],
        "source_pdf": generation["source_pdf"],
        "page_numbers": generation["page_numbers"],
        "citations": generation["citations"],
        "relevant_chunks": generation["relevant_chunks"],
        "image_analysis": generation["image_analysis"],
        "results": results,
    }


@app.post("/ask-video")
async def ask_video(
    video: UploadFile = File(...),
    question: Optional[str] = Form(None),
    top_k: int = Form(5)
):
    """Video RAG pipeline: format validation + keyframe sampling + Gemini timeline analysis + FAISS retrieval + grounded answer."""
    if retriever is None or generator is None:
        raise HTTPException(
            status_code=500,
            detail="ReasonLens services are not fully initialized."
        )

    # 1. Read video bytes
    try:
        video_bytes = await video.read()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read uploaded video: {str(e)}"
        )

    # 2. Validate video format and size
    try:
        validate_video_file(
            file_bytes=video_bytes,
            filename=video.filename or "video.mp4",
            content_type=video.content_type
        )
    except VideoProcessingError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    # 3. Extract representative frames across video duration
    try:
        frames_info = extract_representative_frames(
            video_bytes=video_bytes,
            filename=video.filename or "video.mp4",
            num_frames=8
        )
    except VideoProcessingError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Video frame extraction error: {str(e)}"
        )

    clean_question = question.strip() if (question and question.strip()) else None

    # 4. Analyze video frames & timeline with Gemini
    try:
        video_analysis = generator.analyze_video_frames(
            frames_info=frames_info,
            user_question=clean_question
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini video analysis error: {str(e)}"
        )

    # 5. Query FAISS index using extracted video concepts
    search_query = video_analysis.get("search_query") or clean_question or "Engineering Physics concept"
    try:
        results = retriever.search(search_query, top_k=top_k)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"FAISS retrieval error during video search: {str(e)}"
        )

    # 6. Generate grounded tutor answer with timestamps and textbook citations
    effective_question = clean_question or "Explain the key physics concepts, formulas, and demonstrations shown in this video"
    try:
        generation = generator.generate_video_grounded_answer(
            frames_info=frames_info,
            question=effective_question,
            chunks=results,
            video_analysis=video_analysis
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini video grounded answer generation error: {str(e)}"
        )

    return {
        "question": effective_question,
        "answer": generation["answer"],
        "sources": generation["sources"],
        "source_pdf": generation["source_pdf"],
        "page_numbers": generation["page_numbers"],
        "citations": generation["citations"],
        "relevant_chunks": generation["relevant_chunks"],
        "video_analysis": generation["video_analysis"],
        "duration_formatted": generation.get("duration_formatted"),
        "results": results,
    }

