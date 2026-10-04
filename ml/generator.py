"""RAG Generator Module for ReasonLens.

Handles:
- Text Q&A: question + retrieved chunks -> Gemini -> grounded answer with source citations.
- Image Q&A: image + question -> Gemini vision extraction -> FAISS search -> grounded answer.
Reads GEMINI_API_KEY from environment or .env file (server-side only).
"""

import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv()


class RAGGenerator:
    """Generates grounded answers from retrieved context and images using Gemini."""

    def __init__(self, api_key: str | None = None, model_name: str | None = None):
        self._explicit_api_key = api_key
        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    def get_client(self) -> genai.Client:
        """Initialize and return Gemini client with server-side API key."""
        api_key = self._explicit_api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY environment variable is not set. "
                "Please configure GEMINI_API_KEY in your environment or .env file."
            )
        return genai.Client(api_key=api_key)

    def _call_gemini_with_fallback(self, contents: list | str) -> str:
        """Calls Gemini with automatic model failover."""
        client = self.get_client()
        models_to_try = [
            self.model_name,
            "gemini-3.8-flash",
            "gemini-flash-latest",
            "gemini-3.5-flash",
            "gemini-flash-lite-latest",
            "gemini-2.5-pro",
        ]
        seen = set()
        models = []
        for m in models_to_try:
            if m and m not in seen:
                seen.add(m)
                models.append(m)

        last_error = None
        for model in models:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                )
                if response and response.text:
                    return response.text
                elif response:
                    return ""
            except Exception as e:
                last_error = e
                err_msg = str(e)
                retry_keywords = ["NOT_FOUND", "404", "UNAVAILABLE", "503", "RESOURCE_EXHAUSTED", "429", "high demand"]
                if any(k.lower() in err_msg.lower() for k in retry_keywords):
                    continue
                raise e

        if last_error:
            raise last_error
        return ""

    def build_prompt(self, question: str, chunks: list[dict]) -> str:
        """Construct prompt with chunk citations and strict grounding instructions."""
        context_blocks = []
        for i, chunk in enumerate(chunks, 1):
            source = chunk.get("source", "Unknown")
            page = chunk.get("page", "Unknown")
            text = chunk.get("text", "").strip()
            context_blocks.append(f"[Context Chunk {i}] (Source: {source}, Page: {page})\n{text}")

        context_str = "\n\n".join(context_blocks) if context_blocks else "No relevant context found."

        return (
            "You are ReasonLens, an AI physics tutor. You answer student questions based on retrieved sections of their Engineering Physics study material.\n\n"
            "STRICT GROUNDING INSTRUCTIONS:\n"
            "- Answer the question using the retrieved context as your primary source.\n"
            "- Do not invent facts that are not supported by the retrieved context.\n"
            "- Explain the answer clearly for a student.\n"
            "- Preserve important formulas, terminology, and definitions from the retrieved material.\n"
            "- If the retrieved context does not contain enough information to answer the question, explicitly say that the available study material does not contain enough information.\n"
            "- Do not pretend that information came from the uploaded textbook if it did not.\n\n"
            f"--- RETRIEVED CONTEXT ---\n{context_str}\n\n"
            f"--- STUDENT QUESTION ---\n{question}\n\n"
            "--- GROUNDED ANSWER ---"
        )

    def generate_answer(self, question: str, chunks: list[dict]) -> dict:
        """Call Gemini to generate a grounded answer from retrieved chunks."""
        prompt = self.build_prompt(question, chunks)
        answer_text = self._call_gemini_with_fallback(prompt)

        # Format deduplicated sources list of { "source": ..., "page": ... }
        seen_pairs = set()
        sources = []
        for c in chunks:
            src = c.get("source")
            pg = c.get("page")
            pair = (src, pg)
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                sources.append({
                    "source": src,
                    "page": pg
                })

        unique_sources = sorted(list({c.get("source") for c in chunks if c.get("source")}))
        unique_pages = sorted(list({int(c.get("page")) for c in chunks if c.get("page") is not None}))

        citations = [
            {
                "id": c.get("id"),
                "source": c.get("source"),
                "page": c.get("page"),
                "similarity": c.get("similarity"),
            }
            for c in chunks
        ]

        return {
            "answer": answer_text,
            "sources": sources,
            "source_pdf": unique_sources[0] if len(unique_sources) == 1 else unique_sources,
            "page_numbers": unique_pages,
            "citations": citations,
            "relevant_chunks": chunks,
        }

    def analyze_image_and_extract(
        self,
        image_bytes: bytes,
        mime_type: str,
        user_question: str | None = None
    ) -> dict:
        """Analyze an uploaded image to extract content, identify the question, and generate a search query."""
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        user_note = f"\nStudent provided note/question: \"{user_question}\"" if user_question else ""

        extraction_prompt = (
            "You are ReasonLens, an AI physics tutor analyzing an image uploaded by a student.\n"
            "The image may be a photograph of a textbook question, handwritten problem, physics diagram, graph, mathematical derivation, or numerical problem.\n"
            f"{user_note}\n\n"
            "Analyze the image carefully and output valid JSON with the following three fields:\n"
            "1. detected_content: A detailed description of all visible text, formulas, equations, symbols, diagrams, and numerical values. If anything is blurry or unreadable, explicitly mention that. Do not hallucinate.\n"
            "2. extracted_question: The explicit question or mathematical problem to be solved/explained. If no explicit question is written, determine what the student is asking about the concept or diagram shown.\n"
            "3. search_query: A targeted search query (1-2 sentences with key physics terms, concept names, and equation terms) to retrieve relevant sections from an Engineering Physics textbook.\n\n"
            "Respond ONLY with a JSON object like:\n"
            "{\n"
            "  \"detected_content\": \"...\",\n"
            "  \"extracted_question\": \"...\",\n"
            "  \"search_query\": \"...\"\n"
            "}"
        )

        raw_response = self._call_gemini_with_fallback([image_part, extraction_prompt])

        # Parse JSON from response
        try:
            # Strip markdown fences if present
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw_response.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
            data = json.loads(cleaned)
            return {
                "detected_content": str(data.get("detected_content", "")).strip(),
                "extracted_question": str(data.get("extracted_question", "")).strip() or (user_question or "Explain the concept shown in this image"),
                "search_query": str(data.get("search_query", "")).strip() or user_question or "physics concept"
            }
        except Exception:
            # Fallback if model returned unstructured text
            return {
                "detected_content": raw_response.strip(),
                "extracted_question": user_question or "Explain the problem or concept shown in the image",
                "search_query": user_question or raw_response[:100].strip()
            }

    def generate_image_grounded_answer(
        self,
        image_bytes: bytes,
        mime_type: str,
        question: str,
        chunks: list[dict],
        image_analysis: dict
    ) -> dict:
        """Generates a grounded teaching response combining image understanding and retrieved textbook passages."""
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        context_blocks = []
        for i, chunk in enumerate(chunks, 1):
            source = chunk.get("source", "Unknown")
            page = chunk.get("page", "Unknown")
            text = chunk.get("text", "").strip()
            context_blocks.append(f"[Course Passage {i}] (Source: {source}, Page: {page})\n{text}")

        context_str = "\n\n".join(context_blocks) if context_blocks else "No relevant textbook passages retrieved."

        detected_content = image_analysis.get("detected_content", "")
        extracted_question = image_analysis.get("extracted_question", question)

        tutor_prompt = (
            "You are ReasonLens, an AI physics tutor. A student has uploaded an image containing a physics problem, diagram, or derivation.\n\n"
            "--- IMAGE ANALYSIS ---\n"
            f"Detected Content: {detected_content}\n"
            f"Question to Explain: {extracted_question}\n"
            f"Student's Note: {question}\n\n"
            "--- RETRIEVED TEXTBOOK MATERIAL (SMS1001 Engineering Physics) ---\n"
            f"{context_str}\n\n"
            "--- TEACHING & GROUNDING RULES ---\n"
            "1. Teach the student step-by-step as an expert personal tutor sitting beside them.\n"
            "2. If the image contains a derivation or numerical problem, walk through each step clearly with formulas and calculations.\n"
            "3. If the image contains a diagram or graph, explain the physical meaning of the components, axes, and curves.\n"
            "4. Ground your explanations, definitions, and formulas in the retrieved Engineering Physics material where relevant.\n"
            "5. Cite the source document and page number(s) from the textbook material whenever referencing standard definitions or equations.\n"
            "6. If parts of the image are illegible or cannot be determined with certainty, explicitly tell the student.\n"
            "7. Conclude with a helpful concept check question to test the student's understanding.\n\n"
            "--- TUTOR LESSON ---"
        )

        answer_text = self._call_gemini_with_fallback([image_part, tutor_prompt])

        seen_pairs = set()
        sources = []
        for c in chunks:
            src = c.get("source")
            pg = c.get("page")
            pair = (src, pg)
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                sources.append({
                    "source": src,
                    "page": pg
                })

        unique_sources = sorted(list({c.get("source") for c in chunks if c.get("source")}))
        unique_pages = sorted(list({int(c.get("page")) for c in chunks if c.get("page") is not None}))

        citations = [
            {
                "id": c.get("id"),
                "source": c.get("source"),
                "page": c.get("page"),
                "similarity": c.get("similarity"),
            }
            for c in chunks
        ]

        return {
            "answer": answer_text,
            "sources": sources,
            "source_pdf": unique_sources[0] if len(unique_sources) == 1 else unique_sources,
            "page_numbers": unique_pages,
            "citations": citations,
            "relevant_chunks": chunks,
            "image_analysis": {
                "detected_content": detected_content,
                "extracted_question": extracted_question
            }
        }

    def analyze_video_frames(
        self,
        frames_info: dict,
        user_question: str | None = None
    ) -> dict:
        """Analyze sampled video keyframes to extract topics, key moments with timestamps, and formulate a RAG query."""
        contents: list = []
        frames = frames_info.get("frames", [])
        duration_str = frames_info.get("duration_formatted", "unknown")

        contents.append(
            f"You are ReasonLens, an AI physics tutor. You are analyzing an educational physics video lecture or demonstration with duration {duration_str}.\n"
            "Below are sampled representative keyframes extracted sequentially across the video's duration."
        )

        for i, f in enumerate(frames, 1):
            ts = f.get("timestamp", "00:00")
            sec = f.get("seconds", 0)
            contents.append(f"\n[Keyframe {i} at {ts} ({sec} seconds)]:")
            contents.append(types.Part.from_bytes(data=f["frame_bytes"], mime_type="image/jpeg"))

        user_note = f"\nStudent question or topic focus: \"{user_question}\"" if user_question else ""

        extraction_prompt = (
            f"{user_note}\n\n"
            "Analyze the sequence of video keyframes and extract:\n"
            "1. summary: A thorough overview of what is taught or demonstrated in the video clip.\n"
            "2. detected_topics: A list of specific physics concepts, equations, physical phenomena, or laws shown.\n"
            "3. key_moments: A list of key moments with timestamps, corresponding seconds, and what is specifically occurring at that point (e.g. formula derivation, diagram explanation, experiment setup).\n"
            "4. search_query: A targeted search query (1-2 sentences with key physics terms, concept names, and equation terms) to retrieve relevant sections from the Engineering Physics textbook (SMS1001).\n\n"
            "Output your analysis strictly as a valid JSON object matching this schema:\n"
            "{\n"
            "  \"summary\": \"...\",\n"
            "  \"detected_topics\": [\"...\", \"...\"],\n"
            "  \"key_moments\": [\n"
            "    {\"timestamp\": \"MM:SS\", \"seconds\": 0, \"description\": \"...\"}\n"
            "  ],\n"
            "  \"search_query\": \"...\"\n"
            "}"
        )
        contents.append(extraction_prompt)

        raw_response = self._call_gemini_with_fallback(contents)

        try:
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw_response.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
            data = json.loads(cleaned)

            key_moments = []
            for km in data.get("key_moments", []):
                key_moments.append({
                    "timestamp": str(km.get("timestamp", "00:00")),
                    "seconds": int(km.get("seconds", 0)),
                    "description": str(km.get("description", "")),
                })

            if not key_moments and frames:
                for f in frames[:4]:
                    key_moments.append({
                        "timestamp": f.get("timestamp", "00:00"),
                        "seconds": f.get("seconds", 0),
                        "description": "Video keyframe observation"
                    })

            return {
                "summary": str(data.get("summary", "")).strip() or "Educational physics video lecture.",
                "detected_topics": data.get("detected_topics", []),
                "key_moments": key_moments,
                "search_query": str(data.get("search_query", "")).strip() or user_question or "Engineering Physics concept"
            }
        except Exception:
            default_moments = [
                {"timestamp": f.get("timestamp", "00:00"), "seconds": f.get("seconds", 0), "description": f"Keyframe at {f.get('timestamp')}"}
                for f in frames[:4]
            ]
            return {
                "summary": raw_response.strip()[:300],
                "detected_topics": ["Physics Lecture"],
                "key_moments": default_moments,
                "search_query": user_question or raw_response[:100].strip() or "Physics concepts"
            }

    def generate_video_grounded_answer(
        self,
        frames_info: dict,
        question: str,
        chunks: list[dict],
        video_analysis: dict
    ) -> dict:
        """Generates a grounded teaching response combining video timeline analysis and retrieved textbook passages."""
        contents: list = []
        frames = frames_info.get("frames", [])
        duration_str = frames_info.get("duration_formatted", "unknown")

        context_blocks = []
        for i, chunk in enumerate(chunks, 1):
            source = chunk.get("source", "Unknown")
            page = chunk.get("page", "Unknown")
            text = chunk.get("text", "").strip()
            context_blocks.append(f"[Course Passage {i}] (Source: {source}, Page: {page})\n{text}")

        context_str = "\n\n".join(context_blocks) if context_blocks else "No relevant textbook passages retrieved."

        contents.append(
            f"You are ReasonLens, an AI physics tutor. A student has uploaded a video lecture/demonstration (duration: {duration_str}).\n"
            "Below are representative keyframes from the video:"
        )

        for i, f in enumerate(frames, 1):
            ts = f.get("timestamp", "00:00")
            sec = f.get("seconds", 0)
            contents.append(f"\n[Keyframe {i} at {ts} ({sec}s)]:")
            contents.append(types.Part.from_bytes(data=f["frame_bytes"], mime_type="image/jpeg"))

        summary = video_analysis.get("summary", "")
        moments_str = "\n".join([
            f"- [{m.get('timestamp', '00:00')}] {m.get('description', '')}"
            for m in video_analysis.get("key_moments", [])
        ])

        tutor_prompt = (
            "--- VIDEO ANALYSIS SUMMARY ---\n"
            f"{summary}\n\n"
            "--- DETECTED TIMESTAMPS & MOMENTS ---\n"
            f"{moments_str}\n\n"
            f"--- STUDENT'S QUESTION / FOCUS ---\n"
            f"{question}\n\n"
            "--- RETRIEVED TEXTBOOK MATERIAL (SMS1001 Engineering Physics) ---\n"
            f"{context_str}\n\n"
            "--- TEACHING & GROUNDING RULES ---\n"
            "1. Teach as an expert personal tutor sitting beside the student.\n"
            "2. Structure your lesson clearly:\n"
            "   - **Lecture Overview**: Explain the core physics phenomena or principles shown in the video.\n"
            "   - **Timeline Breakdown**: Walk through the video chronologically, explicitly referencing timestamps like `[00:15]` or `[01:30]` so the student can correlate your notes with what happens on screen.\n"
            "   - **Textbook Grounding & Theory**: Connect the video's presentation to the retrieved SMS1001 Engineering Physics course material. Ground definitions and equations in the textbook, and explicitly cite the source document and page number(s).\n"
            "   - **Key Equations & Formulations**: State relevant formulas cleanly using KaTeX math syntax ($...$ for inline, $$...$$ for display).\n"
            "   - **Tutor Concept Check**: Conclude with an engaging thought question or concept check for the student.\n"
            "3. Clearly distinguish what was shown in the video versus what the textbook proves or defines.\n"
            "4. Do not invent facts that are not supported by the video or course material.\n\n"
            "--- TUTOR LESSON ---"
        )
        contents.append(tutor_prompt)

        answer_text = self._call_gemini_with_fallback(contents)

        seen_pairs = set()
        sources = []
        for c in chunks:
            src = c.get("source")
            pg = c.get("page")
            pair = (src, pg)
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                sources.append({
                    "source": src,
                    "page": pg
                })

        unique_sources = sorted(list({c.get("source") for c in chunks if c.get("source")}))
        unique_pages = sorted(list({int(c.get("page")) for c in chunks if c.get("page") is not None}))

        citations = [
            {
                "id": c.get("id"),
                "source": c.get("source"),
                "page": c.get("page"),
                "similarity": c.get("similarity"),
            }
            for c in chunks
        ]

        return {
            "answer": answer_text,
            "sources": sources,
            "source_pdf": unique_sources[0] if len(unique_sources) == 1 else unique_sources,
            "page_numbers": unique_pages,
            "citations": citations,
            "relevant_chunks": chunks,
            "video_analysis": video_analysis,
            "duration_formatted": duration_str,
        }

