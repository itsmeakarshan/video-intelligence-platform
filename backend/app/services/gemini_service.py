import json
import logging
import asyncio
from datetime import datetime
from typing import AsyncGenerator, Optional, Tuple
import httpx
from app.config import settings
from app.database import SessionLocal
from app.models.system_setting import SystemSetting
from app.services import prompt_service

logger = logging.getLogger(__name__)

_cached_api_key: Optional[str] = None


def _init_cached_api_key() -> None:
    global _cached_api_key
    if _cached_api_key is not None:
        return
    try:
        db = SessionLocal()
        try:
            setting = db.query(SystemSetting).filter(SystemSetting.key == "gemini_api_key").first()
            if setting and setting.value and setting.value.strip():
                _cached_api_key = setting.value.strip()
        finally:
            db.close()
    except Exception:
        pass

    if not _cached_api_key and settings.GEMINI_API_KEY:
        _cached_api_key = settings.GEMINI_API_KEY.strip()


_init_cached_api_key()


def get_active_api_key() -> Optional[str]:
    _init_cached_api_key()
    return _cached_api_key


def get_masked_api_key() -> str:
    key = get_active_api_key()
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}...{key[-4:]}"


def update_api_key(new_key: str) -> bool:
    global _cached_api_key
    if not new_key or not new_key.strip():
        return False
    clean = new_key.strip()
    _cached_api_key = clean

    try:
        db = SessionLocal()
        try:
            setting = db.query(SystemSetting).filter(SystemSetting.key == "gemini_api_key").first()
            if not setting:
                setting = SystemSetting(key="gemini_api_key", value=clean, updated_at=datetime.utcnow())
                db.add(setting)
            else:
                setting.value = clean
                setting.updated_at = datetime.utcnow()
            db.commit()
            logger.info("Gemini API key saved in system_settings database table.")
            return True
        finally:
            db.close()
    except Exception as ex:
        logger.error(f"Failed to save Gemini API key in database: {ex}")
        return False


def remove_api_key() -> bool:
    global _cached_api_key
    _cached_api_key = None
    try:
        db = SessionLocal()
        try:
            setting = db.query(SystemSetting).filter(SystemSetting.key == "gemini_api_key").first()
            if setting:
                db.delete(setting)
                db.commit()
            return True
        finally:
            db.close()
    except Exception as ex:
        logger.error(f"Failed to remove Gemini API key from database: {ex}")
        return False


async def test_api_key_async(test_key: Optional[str] = None) -> Tuple[bool, str, Optional[str]]:
    key_to_use = test_key.strip() if test_key and test_key.strip() else get_active_api_key()
    if not key_to_use:
        return False, "No API key provided to test. Please enter a Gemini API key.", None

    model = settings.GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key_to_use}"

    request_obj = {
        "contents": [{"parts": [{"text": "Respond with 'OK' if you can read this."}]}],
        "generationConfig": {"maxOutputTokens": 10},
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=request_obj)

            if response.is_success:
                return True, f"Connection successful! {model} is responsive.", model

            try:
                err_data = response.json()
                msg = err_data.get("error", {}).get("message", response.text)
                return False, f"Gemini API Error ({response.status_code}): {msg}", model
            except Exception:
                return False, f"Gemini API returned status {response.status_code}: {response.reason_phrase}", model
    except Exception as ex:
        return False, f"Connection error: {str(ex)}", model


async def generate_content_async(
    prompt: str,
    max_tokens: int = 4096,
    system_instruction: Optional[str] = None,
    response_mime_type: Optional[str] = None,
    thinking_budget: Optional[int] = None,
) -> str:
    api_key = get_active_api_key()
    if not api_key:
        return (
            "Gemini API key is not configured. Please add your Gemini API key using the 'Gemini API Key' "
            "button in the chat header."
        )

    model = settings.GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    generation_config: dict = {
        "maxOutputTokens": max_tokens,
    }

    if thinking_budget is not None:
        generation_config["thinkingConfig"] = {"thinkingBudget": thinking_budget}

    request_obj = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": generation_config,
    }

    if response_mime_type:
        request_obj["generationConfig"]["responseMimeType"] = response_mime_type

    if system_instruction:
        request_obj["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, json=request_obj)

                if response.status_code == 429:
                    return (
                        "The AI service has reached its current Gemini API quota. Please wait for the quota "
                        "to reset or use a Gemini API project with available quota."
                    )

                if not response.is_success:
                    error_body = response.text
                    logger.warning(f"Gemini error (attempt {attempt}): {response.status_code} - {error_body}")
                    if response.status_code >= 500 and attempt < 2:
                        await asyncio.sleep(2**attempt)
                        continue
                    return "The AI service could not process the request. Please check the Gemini API configuration."

                data = response.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    return "I couldn't generate an answer from the available information."

                content = candidates[0].get("content", {})
                parts = content.get("parts", [])

                text_parts = []
                for p in parts:
                    if p.get("thought") is True:
                        continue
                    t = p.get("text")
                    if t:
                        text_parts.append(t)

                if text_parts:
                    return "".join(text_parts).strip()
                elif parts:
                    for p in reversed(parts):
                        t = p.get("text")
                        if t:
                            return t.strip()

                return "I couldn't generate an answer from the available information."

        except Exception as ex:
            logger.error(f"Exception calling Gemini API (attempt {attempt}): {ex}")
            if attempt >= 2:
                return "An unexpected error occurred while generating the AI response."
            await asyncio.sleep(2**attempt)

    return "Sorry, Gemini is currently unavailable."


async def stream_content_async(
    prompt: str,
    max_tokens: int = 4096,
    system_instruction: Optional[str] = None,
    thinking_budget: Optional[int] = 0,
) -> AsyncGenerator[str, None]:
    api_key = get_active_api_key()
    if not api_key:
        yield (
            "Gemini API key is not configured. Please add your Gemini API key using the 'Gemini API Key' "
            "button in the chat header."
        )
        return

    model = settings.GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={api_key}"

    generation_config: dict = {"maxOutputTokens": max_tokens}
    if thinking_budget is not None:
        generation_config["thinkingConfig"] = {"thinkingBudget": thinking_budget}

    request_obj = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": generation_config,
    }

    if system_instruction:
        request_obj["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, json=request_obj) as response:
                if not response.is_success:
                    err = await response.aread()
                    logger.error(f"Gemini stream returned error {response.status_code}: {err.decode('utf-8', errors='ignore')}")
                    yield "Error calling Gemini streaming API."
                    return

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        json_str = line[6:].strip()
                        if json_str == "[DONE]":
                            break
                        try:
                            node = json.loads(json_str)
                            candidates = node.get("candidates", [{}])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                for p in parts:
                                    if p.get("thought") is True:
                                        continue
                                    chunk_text = p.get("text", "")
                                    if chunk_text:
                                        yield chunk_text
                        except Exception:
                            pass
    except Exception as ex:
        logger.error(f"Stream exception: {ex}")
        yield f"Streaming connection error: {str(ex)}"


async def ask_gemini_async(question: str, context: str) -> str:
    prompt = prompt_service.build_chat_prompt(question, context)
    return await generate_content_async(
        prompt, max_tokens=4096, system_instruction=prompt_service.CHAT_SYSTEM_INSTRUCTION
    )


async def ask_summary_async(context: str) -> str:
    prompt = prompt_service.build_summary_prompt(context)
    return await generate_content_async(prompt, max_tokens=4096)


async def ask_notes_async(context: str) -> str:
    prompt = prompt_service.build_notes_prompt(context)
    return await generate_content_async(prompt, max_tokens=4096)


async def ask_quiz_async(
    context: str, difficulty: str = "Medium", questions: int = 10, skills: Optional[list] = None
) -> str:
    prompt = prompt_service.build_quiz_prompt(context, difficulty, questions, skills)
    return await generate_content_async(prompt, max_tokens=8192, response_mime_type="application/json")


async def ask_course_skills_async(course_title: str, context: str) -> str:
    prompt = prompt_service.build_course_skills_prompt(course_title, context)
    return await generate_content_async(prompt, max_tokens=8192, response_mime_type="application/json")
