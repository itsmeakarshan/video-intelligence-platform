import re
import json
import asyncio
import logging
from datetime import datetime
from typing import AsyncGenerator, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.course import Course
from app.models.course_skill import CourseSkill
from app.models.transcript import Transcript
from app.models.video import Video
from app.schemas.chat import ChatResponseDto, SourceDto
from app.schemas.skill import CourseSkillDto
from app.services import (
    gemini_service,
    memory_service,
    prompt_service,
    query_rewriter_service,
    search_service,
)

logger = logging.getLogger(__name__)

GENERAL_PATTERNS = [
    r'\bhi\b', r'\bhello\b', r'\bhey\b', r'\bhiya\b', r'\bhow are you\b',
    r'\bwhat\'s up\b', r'\bwhats up\b', r'\bgood morning\b', r'\bgood afternoon\b',
    r'\bgood evening\b', r'\bthanks\b', r'\bthank you\b', r'\bbye\b', r'\bgoodbye\b',
    r'\bwho are you\b', r'\bwhat can you do\b', r'\bhelp\b'
]


def is_general_chat(question: str) -> bool:
    if not question:
        return False
    q = question.lower().strip()
    return any(re.search(p, q) for p in GENERAL_PATTERNS)


def get_accessible_video_ids(
    video_ids: Optional[List[int]],
    course_id: Optional[int],
    db: Session,
) -> Optional[List[int]]:
    query = db.query(Video.id)

    if course_id is not None:
        query = query.filter(Video.course_id == course_id)

    if video_ids:
        clean = list(set(video_ids))
        query = query.filter(Video.id.in_(clean))
    elif course_id is not None:
        return [row[0] for row in query.all()]
    else:
        return None

    existing = [row[0] for row in query.all()]
    return existing if existing else None


async def chat_with_ai_async(
    question: str,
    user_id: int,
    conversation_id: Optional[str] = None,
    video_ids: Optional[List[int]] = None,
    course_id: Optional[int] = None,
    db: Session = None,
) -> ChatResponseDto:
    conversation = memory_service.get_or_create_conversation(
        user_id=user_id, conversation_id=conversation_id, course_id=course_id, db=db
    )
    conv_id = conversation.id
    accessible_vids = get_accessible_video_ids(video_ids, course_id, db)
    history = memory_service.get_history(conv_id, user_id, db)

    answer: str = ""
    sources: List[SourceDto] = []

    if is_general_chat(question):
        answer = await gemini_service.generate_content_async(
            question, max_tokens=2048, system_instruction=prompt_service.CHAT_SYSTEM_INSTRUCTION
        )
    else:
        rewritten_q = await query_rewriter_service.rewrite_question_async(question, history)
        search_res = search_service.search(
            rewritten_q, db, user_id, accessible_vids, course_id
        )
        sources = search_res.sources

        if search_res.is_mention_question:
            if search_res.mention_occurrences:
                occ_blocks = [
                    f"OCCURRENCE {idx + 1}\nTimestamp: {occ.timestamp_str}\nStart Seconds: {occ.start_time:.1f}\nVideo Title: {occ.video_title}\nTranscript Text: {occ.text}"
                    for idx, occ in enumerate(search_res.mention_occurrences)
                ]
                occ_summary = "\n\n".join(occ_blocks)
                mention_prompt = prompt_service.build_mention_prompt(
                    rewritten_q, occ_summary, len(search_res.mention_occurrences)
                )
                answer = await gemini_service.generate_content_async(
                    mention_prompt, max_tokens=4096, system_instruction=prompt_service.CHAT_SYSTEM_INSTRUCTION
                )
            else:
                answer = (
                    "I couldn't find a relevant mention of the requested topic in this course's video transcripts."
                    if course_id
                    else "I couldn't find a relevant mention of the requested topic in the available transcript."
                )
        else:
            if search_res.context == "NO_RELEVANT_VIDEO_CONTEXT" or not search_res.context.strip():
                answer = (
                    "I couldn't find enough relevant information in this course's videos to answer your question."
                    if course_id
                    else "I couldn't find enough relevant information in the uploaded video to answer your question."
                )
            else:
                answer = await gemini_service.ask_gemini_async(rewritten_q, search_res.context)

    memory_service.add_message(conv_id, user_id, "User", question, db)
    memory_service.add_message(conv_id, user_id, "Assistant", answer, db)

    return ChatResponseDto(
        answer=answer,
        sources=sources,
        conversation_id=conv_id,
    )


async def chat_with_ai_stream_async(
    question: str,
    user_id: int,
    conversation_id: str,
    video_ids: Optional[List[int]],
    course_id: Optional[int],
    db: Session,
) -> AsyncGenerator[str, None]:
    accessible_vids = get_accessible_video_ids(video_ids, course_id, db)
    history = memory_service.get_history(conversation_id, user_id, db)

    full_answer: str = ""
    if is_general_chat(question):
        full_answer = await gemini_service.generate_content_async(
            question, max_tokens=2048, system_instruction=prompt_service.CHAT_SYSTEM_INSTRUCTION
        )
    else:
        rewritten_q = await query_rewriter_service.rewrite_question_async(question, history)
        search_res = search_service.search(
            rewritten_q, db, user_id, accessible_vids, course_id
        )

        if search_res.is_mention_question:
            if search_res.mention_occurrences:
                occ_blocks = [
                    f"OCCURRENCE {idx + 1}\nTimestamp: {occ.timestamp_str}\nStart Seconds: {occ.start_time:.1f}\nVideo Title: {occ.video_title}\nTranscript Text: {occ.text}"
                    for idx, occ in enumerate(search_res.mention_occurrences)
                ]
                occ_summary = "\n\n".join(occ_blocks)
                mention_prompt = prompt_service.build_mention_prompt(
                    rewritten_q, occ_summary, len(search_res.mention_occurrences)
                )
                full_answer = await gemini_service.generate_content_async(
                    mention_prompt, max_tokens=4096, system_instruction=prompt_service.CHAT_SYSTEM_INSTRUCTION
                )
            else:
                full_answer = (
                    "I couldn't find a relevant mention of the requested topic in this course's video transcripts."
                    if course_id
                    else "I couldn't find a relevant mention of the requested topic in the available transcript."
                )
        elif search_res.context == "NO_RELEVANT_VIDEO_CONTEXT" or not search_res.context.strip():
            full_answer = (
                "I couldn't find enough relevant information in this course's videos to answer your question."
                if course_id
                else "I couldn't find enough relevant information in the uploaded video to answer your question."
            )
        else:
            full_answer = await gemini_service.ask_gemini_async(rewritten_q, search_res.context)

    memory_service.add_message(conversation_id, user_id, "User", question, db)
    memory_service.add_message(conversation_id, user_id, "Assistant", full_answer, db)

    words = full_answer.split(" ")
    if not words:
        yield full_answer
    else:
        for i, word in enumerate(words):
            piece = word if i == len(words) - 1 else word + " "
            yield piece
            await asyncio.sleep(0.015)


def build_full_video_context(
    video_ids: Optional[List[int]],
    db: Session,
) -> Tuple[str, List[SourceDto]]:
    accessible_vids = get_accessible_video_ids(video_ids, None, db)

    query = db.query(Transcript, Video).join(Video, Transcript.video_id == Video.id)
    if accessible_vids:
        query = query.filter(Transcript.video_id.in_(accessible_vids))

    transcripts_with_videos = query.limit(10).all()
    if not transcripts_with_videos:
        return "NO_RELEVANT_VIDEO_CONTEXT", []

    context_blocks = []
    sources: List[SourceDto] = []

    for idx, (transcript, video) in enumerate(transcripts_with_videos, start=1):
        title = video.original_filename or video.filename or f"Video_{video.id}"
        block = f"""VIDEO #{idx}
TITLE: {title}
VIDEO ID: {video.id}

TRANSCRIPT:
{transcript.transcript.strip()}"""
        context_blocks.append(block)

        sources.append(
            SourceDto(
                video_id=video.id,
                video_title=title,
                start_time=0.0,
                end_time=0.0,
            )
        )

    context_str = "\n\n" + "\n\n---\n\n".join(context_blocks) + "\n"
    return context_str, sources


async def summary_with_ai_async(
    user_id: int, video_ids: Optional[List[int]], db: Session
) -> ChatResponseDto:
    context, sources = build_full_video_context(video_ids, db)
    answer = await gemini_service.ask_summary_async(context)
    return ChatResponseDto(answer=answer, sources=sources)


async def notes_with_ai_async(
    user_id: int, video_ids: Optional[List[int]], db: Session
) -> ChatResponseDto:
    accessible_vids = get_accessible_video_ids(video_ids, None, db)

    if accessible_vids and len(accessible_vids) > 1:
        all_notes = []
        all_sources = []

        for idx, vid_id in enumerate(accessible_vids, start=1):
            vid_context, vid_sources = build_full_video_context([vid_id], db)
            if not vid_sources:
                continue

            video = db.query(Video).filter(Video.id == vid_id).first()
            title = video.original_filename or video.filename or f"Video #{idx}"
            vid_answer = await gemini_service.ask_notes_async(vid_context)
            all_notes.append(f"# Video #{idx}: {title}\n\n{vid_answer}")
            all_sources.extend(vid_sources)

        if all_notes:
            return ChatResponseDto(
                answer="\n\n---\n\n".join(all_notes),
                sources=all_sources,
            )

    single_context, single_sources = build_full_video_context(accessible_vids, db)
    answer = await gemini_service.ask_notes_async(single_context)
    return ChatResponseDto(answer=answer, sources=single_sources)


async def quiz_with_ai_async(
    user_id: int,
    difficulty: str = "Medium",
    questions: int = 10,
    video_ids: Optional[List[int]] = None,
    course_id: Optional[int] = None,
    db: Session = None,
) -> ChatResponseDto:
    if (not course_id or course_id <= 0) and video_ids:
        first_vid = db.query(Video).filter(Video.id.in_(video_ids), Video.course_id.isnot(None)).first()
        if first_vid:
            course_id = first_vid.course_id

    context, sources = build_full_video_context(video_ids, db)

    skill_names: Optional[List[str]] = None
    if course_id and course_id > 0:
        skills = (
            db.query(CourseSkill)
            .filter(CourseSkill.course_id == course_id)
            .order_by(CourseSkill.order_index.asc())
            .all()
        )
        if skills:
            skill_names = [s.name for s in skills]

    raw_answer = await gemini_service.ask_quiz_async(context, difficulty, questions, skill_names)
    validated_json = validate_quiz_response(raw_answer, context, difficulty, questions, skill_names)

    return ChatResponseDto(
        answer=validated_json,
        sources=sources,
    )


def validate_quiz_response(
    answer: str,
    context: str,
    difficulty: str,
    requested_count: int,
    skills: Optional[List[str]] = None,
) -> str:
    if not answer or not answer.strip():
        return generate_fallback_quiz(context, requested_count, skills)

    cleaned = answer.strip()

    # Strip markdown code fences
    if "```" in cleaned:
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned, re.IGNORECASE)
        if match:
            cleaned = match.group(1).strip()
        else:
            first_fence = cleaned.find("```")
            last_fence = cleaned.rfind("```")
            if first_fence >= 0 and last_fence > first_fence:
                inner = cleaned[first_fence + 3 : last_fence].strip()
                if inner.lower().startswith("json"):
                    inner = inner[4:].strip()
                cleaned = inner

    first_brace = cleaned.find('{')
    first_bracket = cleaned.find('[')
    start_idx = -1
    if first_brace >= 0 and first_bracket >= 0:
        start_idx = min(first_brace, first_bracket)
    elif first_brace >= 0:
        start_idx = first_brace
    elif first_bracket >= 0:
        start_idx = first_bracket

    last_brace = cleaned.rfind('}')
    last_bracket = cleaned.rfind(']')
    end_idx = max(last_brace, last_bracket)

    if start_idx >= 0 and end_idx > start_idx:
        cleaned = cleaned[start_idx : end_idx + 1].strip()

    try:
        data = json.loads(cleaned)
    except Exception:
        return generate_fallback_quiz(context, requested_count, skills)

    questions_list = []
    if isinstance(data, list):
        questions_list = data
    elif isinstance(data, dict):
        if "questions" in data and isinstance(data["questions"], list):
            questions_list = data["questions"]
        elif "quiz" in data and isinstance(data["quiz"], list):
            questions_list = data["quiz"]
        elif "quiz_questions" in data and isinstance(data["quiz_questions"], list):
            questions_list = data["quiz_questions"]
        else:
            for v in data.values():
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    questions_list = v
                    break

    if not questions_list:
        return generate_fallback_quiz(context, requested_count, skills)

    normalized_list = []
    for i, q in enumerate(questions_list):
        if not isinstance(q, dict):
            continue

        q_text = (
            q.get("question")
            or q.get("question_text")
            or q.get("prompt")
            or ""
        ).strip()
        if not q_text:
            continue

        options = []
        raw_options = q.get("options", [])
        if isinstance(raw_options, list):
            options = [str(opt).strip() for opt in raw_options if opt is not None]
        elif isinstance(raw_options, dict):
            options = [str(v).strip() for v in raw_options.values() if v is not None]

        if len(options) < 2:
            continue

        while len(options) < 4:
            if len(options) == 2:
                options.append("Both A and B")
            elif len(options) == 3:
                options.append("None of the above")
            else:
                options.append(f"Option {len(options) + 1}")
        if len(options) > 4:
            options = options[:4]

        # Resolve correct answer
        raw_ans = q.get("correct_answer") if "correct_answer" in q else q.get("answer", q.get("correct_option"))
        ans_idx = 0
        if raw_ans is not None:
            if isinstance(raw_ans, int):
                ans_idx = raw_ans if 0 <= raw_ans <= 3 else (raw_ans - 1 if 1 <= raw_ans <= 4 else 0)
            else:
                str_ans = str(raw_ans).strip().upper()
                if str_ans in ("0", "A", "OPTION A"):
                    ans_idx = 0
                elif str_ans in ("1", "B", "OPTION B"):
                    ans_idx = 1
                elif str_ans in ("2", "C", "OPTION C"):
                    ans_idx = 2
                elif str_ans in ("3", "D", "OPTION D"):
                    ans_idx = 3
                else:
                    try:
                        parsed = int(str_ans)
                        ans_idx = parsed if 0 <= parsed <= 3 else (parsed - 1 if 1 <= parsed <= 4 else 0)
                    except ValueError:
                        try:
                            m_idx = [o.lower() for o in options].index(str(raw_ans).lower().strip())
                            if 0 <= m_idx <= 3:
                                ans_idx = m_idx
                        except ValueError:
                            ans_idx = 0

        topic = q.get("topic", "Core Concept")
        if skills:
            matched = next(
                (s for s in skills if s.lower() == topic.lower() or s.lower() in topic.lower() or topic.lower() in s.lower()),
                None,
            )
            topic = matched if matched else skills[i % len(skills)]

        explanation = q.get("explanation", f"Option {ans_idx + 1} is correct according to the video lesson.")

        normalized_list.append({
            "question": q_text,
            "options": options,
            "correct_answer": ans_idx,
            "answer": ans_idx,
            "topic": topic.strip(),
            "explanation": str(explanation).strip(),
        })

    if not normalized_list:
        return generate_fallback_quiz(context, requested_count, skills)

    return json.dumps({"questions": normalized_list})


def generate_fallback_quiz(context: str, count: int, skills: Optional[List[str]] = None) -> str:
    clean_context = context.replace("NO_RELEVANT_VIDEO_CONTEXT", "").strip()
    raw_lines = re.split(r'[\n\.\?]', clean_context)
    lines = [
        l.strip()
        for l in raw_lines
        if len(l.strip()) > 25
        and not l.strip().startswith("VIDEO")
        and not l.strip().startswith("TITLE")
        and not l.strip().startswith("TRANSCRIPT")
    ]
    unique_lines = list(dict.fromkeys(lines))[: max(5, count)]

    if not unique_lines:
        unique_lines = [
            "Computers process digital instructions to execute user tasks.",
            "Hardware components work in coordination with system software.",
            "Input devices translate user actions into digital signals.",
            "Storage devices retain data persistently for software execution.",
            "Network connections allow devices to exchange data and access web resources.",
        ]

    questions = []
    for i in range(min(len(unique_lines), max(5, count))):
        line = unique_lines[i]
        q_text = "Which of the following statements is supported by the video content?"
        if len(line) < 90:
            q_text = f'Based on the video lesson, which statement accurately describes: "{line}"?'

        topic = skills[i % len(skills)] if skills else "Video Knowledge Check"
        questions.append({
            "question": q_text,
            "options": [
                line,
                "This concept is not relevant to modern computing systems.",
                "Hardware functions completely independently without instruction.",
                "None of the above statements are accurate.",
            ],
            "correct_answer": 0,
            "answer": 0,
            "topic": topic,
            "explanation": f"According to the video lesson: {line}",
        })

    return json.dumps({"questions": questions})


async def extract_course_skills_async(course_id: int, db: Session) -> List[CourseSkillDto]:
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise ValueError("Course not found.")

    completed_videos = (
        db.query(Video)
        .filter(Video.course_id == course_id, Video.status == "completed")
        .order_by(Video.order_index.asc())
        .all()
    )
    if not completed_videos:
        raise ValueError("No completed videos found for this course. Please process at least one video first.")

    blocks = []
    for v in completed_videos:
        transcript = db.query(Transcript).filter(Transcript.video_id == v.id).first()
        if transcript and transcript.transcript.strip():
            blocks.append(f"=== Lesson Video: {v.title} ===\n{transcript.transcript.strip()}\n")

    context = "\n".join(blocks).strip()
    if not context:
        for v in completed_videos:
            blocks.append(f"=== Lesson: {v.title} ===")
        context = "\n".join(blocks).strip()

    raw_json = ""
    try:
        raw_json = await gemini_service.ask_course_skills_async(course.title, context)
    except Exception as ex:
        logger.warning(f"Gemini ask_course_skills failed: {ex}. Using fallback.")

    parsed_skills = _parse_course_skills_json(raw_json, course.title, completed_videos)

    # Replace existing skills
    db.query(CourseSkill).filter(CourseSkill.course_id == course_id).delete()
    db.commit()

    new_entities = []
    for order, s in enumerate(parsed_skills, start=1):
        entity = CourseSkill(
            course_id=course_id,
            name=s["name"].strip(),
            description=s.get("description", f"Comprehensive grasp of {s['name']}").strip(),
            category=s.get("category", "Core Concepts").strip(),
            order_index=order,
            created_at=datetime.utcnow(),
        )
        db.add(entity)
        new_entities.append(entity)

    db.commit()

    return [
        CourseSkillDto(
            id=e.id,
            course_id=e.course_id,
            name=e.name,
            description=e.description,
            category=e.category,
            order_index=e.order_index,
            created_at=e.created_at,
        )
        for e in new_entities
    ]


def _parse_course_skills_json(raw_json: str, course_title: str, videos: List[Video]) -> List[dict]:
    result = []
    if raw_json and raw_json.strip():
        cleaned = raw_json.strip()
        if "```" in cleaned:
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned, re.IGNORECASE)
            if match:
                cleaned = match.group(1).strip()

        first_brace = cleaned.find('{')
        last_brace = cleaned.rfind('}')
        if first_brace >= 0 and last_brace > first_brace:
            cleaned = cleaned[first_brace : last_brace + 1].strip()

        try:
            node = json.loads(cleaned)
            skills_arr = node.get("skills", [])
            if isinstance(skills_arr, list):
                for item in skills_arr:
                    if isinstance(item, dict):
                        name = str(item.get("name", "")).strip()
                        desc = str(item.get("description", "")).strip()
                        cat = str(item.get("category", "")).strip()
                        if name:
                            result.append({
                                "name": name,
                                "description": desc or f"Understanding of {name}",
                                "category": cat or "Core Concepts",
                            })
        except Exception:
            pass

    if not result:
        cats = ["Core Concepts", "Hardware & Architecture", "Software Systems", "Practical Operations"]
        for idx, v in enumerate(videos):
            title = (v.title or v.filename or "Topic").replace(".mp4", "").replace(".avi", "").strip()
            if len(title) > 35:
                title = title[:35]
            result.append({
                "name": title,
                "description": f"Mastery of core lecture principles covered in '{v.title}'.",
                "category": cats[idx % len(cats)],
            })

        if len(result) < 5:
            result.append({
                "name": f"{course_title} Fundamentals",
                "description": "Foundational principles and key concepts of the curriculum.",
                "category": "Core Concepts",
            })
            result.append({
                "name": f"{course_title} Problem Solving",
                "description": "Applying concepts to solve practical technical questions and exercises.",
                "category": "Problem Solving",
            })

    return result
