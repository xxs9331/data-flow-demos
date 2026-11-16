"""用固定等待窗口合并连续消息。

数据链路：已接收消息 -> 按分组键暂存 -> 到期取出整批 -> 交给后续处理。
运行：Python 3.10+，标准库即可；python message-coalescing.py。
预期：A 组在 10 输出 m1/m3/m4，B 组在 12 输出 m2，A 组在 20 输出 m5。
约定：窗口为正整数；时间是非负且不递减的接收时刻，单位一致。
新消息不会延长等待期限；恰好到期时先取出旧批次，再接收新消息。
本例按组合批，保留每条消息的发送者与标识，不能把整批解释为同一人的发言。
限制：单进程内存、显式推进时间，无真实定时器、异步生成、持久化和重试。
来源：提炼 Parlant/方格中等待阶段的消息合并机制，未复制完整桥接服务。
https://github.com/xxs9331/parlant/blob/e49ae5d4d289542c01f32d5c3c38ceff25f78933/examples/fangge_congbao/group_chat_bridge.py#L1293
https://github.com/xxs9331/parlant/blob/e49ae5d4d289542c01f32d5c3c38ceff25f78933/examples/fangge_congbao/group_chat_bridge.py#L1342
原项目使用协程和锁；生成耗时会影响后续轮次，本例只演示等待与取批。
配套博客尚在审稿，发布后补充正式文章地址。
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Message:
    group: str
    id: str
    sender: str
    text: str


@dataclass
class Batch:
    group: str
    ready_at: int
    messages: list[Message]


class WindowBuffer:
    def __init__(self, window: int) -> None:
        if type(window) is not int or window <= 0:
            raise ValueError("window 必须是正整数")
        self.window = window
        self.last_time = -1
        self.pending: dict[str, Batch] = {}

    def take_ready(self, now: int) -> list[Batch]:
        if type(now) is not int or now < 0 or now < self.last_time:
            raise ValueError("时间必须是非负且不递减的整数")
        self.last_time = now
        ready = sorted(
            (batch for batch in self.pending.values() if batch.ready_at <= now),
            key=lambda batch: (batch.ready_at, batch.group),
        )
        for batch in ready:
            del self.pending[batch.group]
        return ready

    def offer(self, message: Message, now: int) -> list[Batch]:
        # 先结算到期批次，边界时刻的新消息进入下一批。
        ready = self.take_ready(now)
        if message.group not in self.pending:
            self.pending[message.group] = Batch(message.group, now + self.window, [])
        self.pending[message.group].messages.append(message)
        return ready


def run_demo() -> None:
    buffer = WindowBuffer(window=10)
    arrivals = [
        (0, Message("A", "m1", "u1", "想了解这个服务")),
        (2, Message("B", "m2", "u1", "另一组的问题")),
        (4, Message("A", "m3", "u1", "还想问一下费用")),
        (9, Message("A", "m4", "u2", "我补充一个问题")),
        (10, Message("A", "m5", "u1", "这是下一批消息")),
    ]
    emitted: list[Batch] = []
    for now, message in arrivals:
        emitted.extend(buffer.offer(message, now))
    emitted.extend(buffer.take_ready(12))
    emitted.extend(buffer.take_ready(20))
    for batch in emitted:
        print(f"group={batch.group} ready_at={batch.ready_at}",
              [(message.id, message.sender, message.text) for message in batch.messages])

    assert [(batch.group, batch.ready_at, [m.id for m in batch.messages]) for batch in emitted] == [
        ("A", 10, ["m1", "m3", "m4"]), ("B", 12, ["m2"]), ("A", 20, ["m5"]),
    ]
    assert not buffer.pending
    assert buffer.take_ready(20) == []
    assert [m.sender for m in emitted[0].messages] == ["u1", "u1", "u2"]
    delayed = WindowBuffer(10)
    assert delayed.offer(arrivals[0][1], 0) == []
    assert delayed.take_ready(25)[0].ready_at == 10
    for invalid in (0, -1, 1.5):
        try:
            WindowBuffer(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("无效窗口应报错")
    try:
        buffer.take_ready(19)
    except ValueError:
        pass
    else:
        raise AssertionError("时间倒退应报错")
    print("self-checks passed")


if __name__ == "__main__":
    run_demo()
