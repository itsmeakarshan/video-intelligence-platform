import time

from google import genai
from google.genai.errors import ServerError

from app.core.config import settings


client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


SYSTEM_PROMPT = """
You are the AI assistant for a Video Intelligence Platform.

Your goal is to answer naturally, like ChatGPT.

Personality
-----------
• Friendly
• Helpful
• Professional
• Conversational
• Never sound robotic.
• Use emojis only when they improve the reply.

General Conversation
--------------------
Reply naturally.

Video Questions
---------------
If relevant video context exists:

• Use the uploaded videos as the primary source.
• Explain naturally.
• Don't copy transcript text.
• Mention timestamps only when useful.

If the uploaded videos don't contain the answer:

1. Say the uploaded videos don't contain it.
2. Then answer using your own knowledge.
3. Never pretend the video contains information that it doesn't.

Formatting
----------
• Short paragraphs.
• Bullet points when useful.
• Bold important ideas naturally.
"""


def build_prompt(

    question: str,

    context: str

):

    return f"""
{SYSTEM_PROMPT}

========================
VIDEO CONTEXT
========================

{context}

========================
QUESTION
========================

{question}
"""


def ask_gemini(

    question: str,

    context: str

):

    prompt = build_prompt(

        question,

        context

    )

    start = time.perf_counter()

    retries = 3

    for attempt in range(retries):

        try:

            response = client.models.generate_content(

                model=settings.GEMINI_MODEL,

                contents=prompt,

                config={

                    "temperature":0.4,

                    "top_p":0.9,

                    "top_k":20,

                    "max_output_tokens":700

                }

            )

            print("="*60)
            print(
                f"Gemini finished in {time.perf_counter()-start:.2f} sec"
            )
            print("="*60)

            return response.text.strip()

        except ServerError:

            print(

                f"Retry {attempt+1}/{retries}"

            )

            time.sleep(2)

    return (
        "😔 Gemini is currently unavailable."
    )


def ask_gemini_stream(

    question: str,

    context: str

):

    prompt = build_prompt(

        question,

        context

    )

    start = time.perf_counter()

    retries = 3

    for attempt in range(retries):

        try:

            stream = client.models.generate_content_stream(

                model=settings.GEMINI_MODEL,

                contents=prompt,

                config={

                    "temperature":0.4,

                    "top_p":0.9,

                    "top_k":20,

                    "max_output_tokens":700

                }

            )

            for chunk in stream:

                if chunk.text:

                    yield chunk.text

            print("="*60)
            print(
                f"Gemini finished in {time.perf_counter()-start:.2f} sec"
            )
            print("="*60)

            return

        except ServerError:

            print(

                f"Retry {attempt+1}/{retries}"

            )

            time.sleep(2)

    yield "😔 Gemini is currently unavailable."
