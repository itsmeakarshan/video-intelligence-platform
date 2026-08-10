from app.services.gemini_service import ask_gemini


def rewrite_question(
    question: str,
    history: list[dict]
):

    if not history:
        return question

    conversation = []

    for message in history[-6:]:

        role = message.get(
            "role",
            "user"
        )

        text = message.get(
            "text",
            ""
        )

        conversation.append(
            f"{role}: {text}"
        )

    prompt = f"""
You rewrite follow-up questions.

Conversation:

{chr(10).join(conversation)}

Latest Question:

{question}

Rewrite the latest question so that it is completely standalone.

Rules:

- Preserve the original meaning.
- Replace pronouns like it, this, they, that.
- Do not answer.
- Return only the rewritten question.

Examples:

React?
Who created it?

↓

Who created React?

CSS Grid?
When was it introduced?

↓

When was CSS Grid introduced?
"""

    rewritten = ask_gemini(
        question=prompt,
        context=""
    )

    return rewritten.strip()