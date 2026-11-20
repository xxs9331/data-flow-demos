"""Run with Python 3: python3 conversation-query.py.

Compare query inputs on one synthetic BM25 index. The four output rows expose
a missed reference, history noise, a wrong rewrite, and a clarification.
All tokens and rewrites are fixtures. No model inference or API calls.
Source case: https://github.com/xxs9331/parlant/blob/87c81e2f3d6af9e9c77036f1bb212b768feb36e5/examples/fangge_congbao/knowledge.py#L4706
Article: 多轮检索时怎样使用对话历史
"""
from collections import Counter
from math import log

DOCS = {
    "A-用法": ("A", "用法", "配件", "开关"),
    "B-用法": ("B", "用法", "操作", "按钮"),
    "A-保修": ("A", "保修", "期限", "换新"),
    "B-保修": ("B", "保修", "期限", "换新"),
}
PRODUCTS = {"A", "B"}


def retrieve(query, product=None):
    # shortcut: fixed equal-length documents omit length normalization, add it for varied lengths.
    scores = []
    for doc_id, tokens in DOCS.items():
        if product and tokens[0] != product:
            continue
        terms = Counter(tokens)
        score = 0.0
        for term in query:
            matches = sum(term in doc for doc in DOCS.values())
            idf = log(1 + (len(DOCS) - matches + 0.5) / (matches + 0.5))
            frequency = terms[term]
            score += idf * (frequency * 2.2) / (frequency + 1.2)
        if score > 0:
            scores.append((score, doc_id))
    return [doc_id for _, doc_id in sorted(scores, key=lambda row: (-row[0], row[1]))]


def resolve(question, history):
    products = PRODUCTS.intersection(question) or PRODUCTS.intersection(history)
    if len(products) != 1:
        return "待澄清"
    product = next(iter(products))
    query = (*question, product) if product not in question else question
    return retrieve(query, product)


def main():
    cases = [
        ("省略对象", ("B", "操作"), ("用法",), ("B", "用法"), "B-用法"),
        ("明确换题", ("A", "A", "配件", "开关"), ("B", "用法"), ("B", "用法"), "B-用法"),
        ("改写串题", ("A", "开关"), ("B", "用法"), ("A", "用法"), "B-用法"),
        ("指代不明", ("A", "B", "配件"), ("用法",), ("A", "用法"), "待澄清"),
    ]
    for label, history, question, rewrite, expected in cases:
        original = retrieve(question)
        joined = retrieve((*history, *question))
        rewritten = retrieve(rewrite)
        resolved = resolve(question, history)
        print(f"{label} | 原问题 {original} | 拼接 {joined} | 改写回放 {rewritten} | 按需补全 {resolved}")
        if isinstance(resolved, str):
            assert resolved == expected
        else:
            assert resolved[0] == expected
        if label == "明确换题":
            assert joined[0] == "A-用法"
        if label == "改写串题":
            assert rewritten[0] == "A-用法"
    assert retrieve(("无命中词",)) == []
    assert resolve(("用法",), ()) == "待澄清"


if __name__ == "__main__":
    main()
