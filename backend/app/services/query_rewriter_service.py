import re
import logging
from typing import List, Tuple
from app.services import gemini_service

logger = logging.getLogger(__name__)

FOLLOW_UP_PATTERNS = [
    r'\b(it|its|they|them|their|he|she|him|her)\b',
    r'\b(what about|how about|tell me more|explain more|more details)\b',
    r'\b(why is that|how does that|what does that mean|why so|how come)\b',
    r'\b(continue|go on|elaborate|and then|what else)\b',
    r'\b(previous|earlier|above|before|the same)\b',
]


def is_follow_up_question(question: str) -> bool:
    if not question:
        return False
    q = question.lower().strip()

    # Remove generic scope phrases like 'in this video', 'in this course' before testing for isolated demonstratives
    sanitized = re.sub(
        r'\b(in\s+|about\s+|from\s+)?(this|the|that)\s+(video|course|lesson|clip|lecture|transcript|chapter)\b',
        '',
        q,
    ).strip()

    if not sanitized:
        return True

    tokens = sanitized.split()
    if len(tokens) <= 2:
        return True

    return any(re.search(p, sanitized) for p in FOLLOW_UP_PATTERNS)


async def rewrite_question_async(question: str, history: List[Tuple[str, str]]) -> str:
    if not history or not is_follow_up_question(question):
        return question

    hist_lines = []
    for role, text in history[-4:]:
        hist_lines.append(f"{role.upper()}: {text}")
    history_str = "\n".join(hist_lines)

    prompt = f"""Given the following chat history and a follow-up user question, rewrite the follow-up question into a complete, standalone question that includes the necessary context (such as subject, topic, or concept) from the conversation history.

Rules:
1. Return ONLY the rewritten question.
2. Do not add explanations or formatting.
3. If the question is already complete and standalone, return it unchanged.

CHAT HISTORY:
{history_str}

USER QUESTION:
{question}

STANDALONE QUESTION:"""

    try:
        rewritten = await gemini_service.generate_content_async(
            prompt, max_tokens=512, thinking_budget=0
        )
        clean = rewritten.strip().strip('"').strip("'")
        if clean.lower().startswith("standalone question:"):
            clean = clean[len("standalone question:"):].strip()

        # Validate that the response is an actual question, not an error message
        invalid_prefixes = (
            "error", "sorry", "i couldn't", "the ai service", "gemini",
            "an unexpected", "unable", "cannot"
        )
        if clean and len(clean) > 3 and not any(clean.lower().startswith(p) for p in invalid_prefixes):
            return clean
    except Exception as ex:
        logger.warning(f"Query rewrite failed: {ex}")

    return question
