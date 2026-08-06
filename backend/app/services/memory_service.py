from collections import defaultdict

MAX_HISTORY = 20

memory = defaultdict(list)


def add_message(
    conversation_id: str,
    role: str,
    text: str
):

    memory[conversation_id].append(

        {
            "role": role,
            "text": text
        }

    )

    if len(memory[conversation_id]) > MAX_HISTORY:

        memory[conversation_id] = (

            memory[conversation_id][-MAX_HISTORY:]

        )


def get_history(
    conversation_id: str
):

    return memory.get(
        conversation_id,
        []
    )


def clear_history(
    conversation_id: str
):

    memory.pop(
        conversation_id,
        None
    )


def get_last_messages(
    conversation_id: str,
    limit: int = 6
):

    return memory.get(
        conversation_id,
        []
    )[-limit:]


def get_last_user_message(
    conversation_id: str
):

    history = memory.get(
        conversation_id,
        []
    )

    for message in reversed(history):

        if message["role"].lower() == "user":

            return message["text"]

    return ""


def get_last_assistant_message(
    conversation_id: str
):

    history = memory.get(
        conversation_id,
        []
    )

    for message in reversed(history):

        if message["role"].lower() == "assistant":

            return message["text"]

    return ""


def conversation_exists(
    conversation_id: str
):

    return conversation_id in memory


def total_conversations():

    return len(memory)