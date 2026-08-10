from app.core.model_registry import get_reranker


def rerank(
    query: str,
    matches: list[dict],
    top_k: int = 5
):

    if not matches:
        return []

    model = get_reranker()

    print("=" * 60)
    print("CROSS ENCODER INPUT")
    print("=" * 60)
    print(f"Query : {query}")
    print("=" * 60)

    pairs = []

    for match in matches:

        print(
            f'Chunk {match["chunk_index"]} | '
            f'{match["start_time"]:.2f}-{match["end_time"]:.2f}'
        )

        print(match["text"])
        print("-" * 60)

        pairs.append(
            (
                query,
                match["text"]
            )
        )

    scores = model.predict(
        pairs
    )

    reranked = []

    print("=" * 60)
    print("CROSS ENCODER SCORES")
    print("=" * 60)

    for match, score in zip(
        matches,
        scores
    ):

        print(
            f'Chunk {match["chunk_index"]} : {float(score):.4f}'
        )

        item = match.copy()

        item["rerank_score"] = float(score)

        reranked.append(item)

    reranked.sort(
        key=lambda x: x["rerank_score"],
        reverse=True
    )

    print("=" * 60)
    print("TOP CHUNKS")
    print("=" * 60)

    for item in reranked[:top_k]:

        print(
            f'Chunk {item["chunk_index"]} | '
            f'{item["start_time"]:.2f}-{item["end_time"]:.2f} | '
            f'{item["rerank_score"]:.4f}'
        )

    print("=" * 60)

    return reranked[:top_k]