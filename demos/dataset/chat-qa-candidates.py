"""从单群、按时间排列的消息生成待审核的问答 ID 对。运行：python3 chat-qa-candidates.py

提炼自作者项目 https://github.com/xxs9331/conversation-data-governance
本地来源 qa/independent/sessions.py 与 candidates.py。时间简化为相对秒。
示例只输出候选；显式引用、语义匹配、审核和导出由其他环节负责。
预期：连续提问匹配第一次客服回复。插入另一用户后，可能把回复配错人。
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Message:
    id: str
    second: int
    role: str
    sender: str
    text: str


def candidates(messages, gap=60):
    """输入约定：同一群、ID 唯一、按时间排列。输出保留原始消息 ID。"""
    if gap < 0:
        raise ValueError("gap 必须非负")
    pending = []
    participant = previous = None
    for m in messages:
        if previous is not None and m.second - previous > gap:
            pending.clear()
            participant = None
        if m.role == "user":
            if m.sender != participant:
                pending.clear()
                participant = m.sender
            pending.append(m.id)
        else:
            if pending and m.role == "assistant":
                yield tuple(pending), m.id
            pending.clear()
        previous = m.second


if __name__ == "__main__":
    first = Message("m1", 0, "user", "A", "基础版怎么收费？")
    extra = Message("m2", 2, "user", "A", "含维护吗？")
    other = Message("m3", 3, "user", "B", "我的申请进度呢？")
    reply = Message("m4", 5, "assistant", "客服", "@A 每月100元。")
    follow = Message("m5", 6, "assistant", "客服", "包含基础维护。")
    for name, messages, expected in [
        ("连续补问", [first, extra, reply, follow], [(("m1", "m2"), "m4")]),
        ("插话错配", [first, extra, other, reply, follow], [(("m3",), "m4")]),
        ("恰好到限", [first, Message("r", 60, "assistant", "客服", "100元")], [(("m1",), "r")]),
        ("超过间隔", [first, Message("r", 61, "assistant", "客服", "100元")], []),
    ]:
        result = list(candidates(messages))
        assert result == expected
        print(name, result)
