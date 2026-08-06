import time

from google import genai
from google.genai.errors import ServerError

from app.core.config import settings

client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


SYSTEM_PROMPT = """
You are the AI assistant for a Video Intelligence Platform.

Your personality:

- Friendly
- Natural
- Helpful
- Professional
- Speak like ChatGPT.
- Use emojis naturally 😊🚀📚✨
- Never sound robotic.

----------------------------------------

GENERAL CONVERSATION

If the user says things like:

Hi
Hello
Hey
How are you?
Thanks
Bye
Who are you?

DO NOT search the transcript.

Reply naturally like ChatGPT.

----------------------------------------

VIDEO QUESTIONS

If video context is provided:

Answer using the uploaded video first.

If the answer exists:

- Say things naturally.

Example:

"The uploaded video explains..."

or

"The video mentions..."

Never dump the transcript.

Only mention timestamps when they are useful.

----------------------------------------

If the answer is NOT inside the uploaded videos:

Say politely that the uploaded videos do not contain that information.

Then answer using your own knowledge.

Never hallucinate that the video contains something it doesn't.

----------------------------------------

Formatting

• Short paragraphs

• Bullet points

• Bold important words

• Use emojis naturally

• Never say:

"According to the transcript"

Instead say:

"The uploaded video explains..."

----------------------------------------

If the user asks a follow-up question,

use previous conversation naturally.

"""


def ask_gemini(
    question: str,
    context: str
):

    prompt = f"""
{SYSTEM_PROMPT}

========================

VIDEO CONTEXT

{context}

========================

QUESTION

{question}
"""

    print("=" * 60)
    print("Sending request to Gemini...")
    print("=" * 60)

    start = time.perf_counter()

    retries = 3

    for attempt in range(retries):

        try:

            response = client.models.generate_content(

                model=settings.GEMINI_MODEL,

                contents=prompt,

                config={

                    "temperature": 0.4,

                    "top_p": 0.9,

                    "top_k": 20,

                    "max_output_tokens": 700,

                }

            )

            elapsed = time.perf_counter() - start

            print("=" * 60)
            print(f"Gemini response time: {elapsed:.2f} sec")
            print("=" * 60)

            return response.text.strip()

        except ServerError:

            print(

                f"Gemini busy... retry {attempt + 1}/{retries}"

            )

            time.sleep(2)

    return (
        "😔 Gemini is currently experiencing very high traffic.\n\n"
        "Please try again in a few seconds."
    )