"""用固定等待窗口合并用户的连续消息。

场景：同一个群里，A 连续询问费用和维护，B/C 穿插讨论申请进度。
数据链路：逐条接收群消息 -> 按用户暂存 -> 到期组装当前输入与共享群聊上下文。
运行：Python 3.10+，标准库即可；python message-coalescing.py，约需 3 秒。
窗口设为 2 秒只是演示参数，没有测量证明它最合适。
预期：生成 A/B/C 三份请求；A 的当前输入含 m1/m3，上下文含 B/C 的 m2/m4。
规则：每位用户从首条消息起独立等待，追加不延长期限；其他人照常进入群上下文。
到期由事件循环主动触发，单条消息也会出请求，不需要新消息或手动取批。
群上下文在组装请求时取快照，并去掉已作为当前输入的消息，避免重复。
消息标识约定在本群内唯一；输入是合成数据，输出请求不调用大模型。
固定窗口可能截断后续补充，也会让孤立消息等待；本例不判断话题或语义完整性。
shortcut: 仅使用单进程内存；接入真实服务前增加上下文裁剪、持久化和失败恢复。
来源：借鉴 Parlant/方格的独立等待任务与临时上下文机制，按讨论确认的业务改写。
原桥接服务按群积累待处理消息，本例改为按用户等待；没有修改或部署原服务。
https://github.com/xxs9331/parlant/blob/e49ae5d4d289542c01f32d5c3c38ceff25f78933/examples/fangge_congbao/group_chat_bridge.py#L1293
https://github.com/xxs9331/parlant/blob/e49ae5d4d289542c01f32d5c3c38ceff25f78933/examples/fangge_congbao/group_chat_bridge.py#L511
配套博客尚在审稿，发布后补充正式文章地址。
"""

import asyncio
from dataclasses import asdict, dataclass, field
import json
import math
import time


@dataclass(frozen=True)
class Message:
    id: str
    sender: str
    text: str


@dataclass
class GenerationRequest:
    sender: str
    current_messages: list[Message]
    context: list[Message]


@dataclass
class PendingInput:
    ready_at: float
    timer: asyncio.TimerHandle
    messages: list[Message] = field(default_factory=list)


class WindowBuffer:
    def __init__(self, window: float) -> None:
        if (
            isinstance(window, bool)
            or not isinstance(window, (int, float))
            or not math.isfinite(window)
            or window <= 0
        ):
            raise ValueError("window 必须是有限正数，单位为秒")
        self.window = window
        self.loop = asyncio.get_running_loop()
        self.context: list[Message] = []
        self.pending: dict[str, PendingInput] = {}
        self.requests: asyncio.Queue[GenerationRequest] = asyncio.Queue()

    def offer(self, message: Message) -> None:
        now = self.loop.time()
        pending = self.pending.get(message.sender)
        # 定时回调尚未执行时，到期后的补充也应进入下一轮。
        if pending is not None and pending.ready_at <= now:
            self._emit(message.sender)
        self.context.append(message)
        if message.sender not in self.pending:
            deadline = now + self.window
            self.pending[message.sender] = PendingInput(
                deadline, self.loop.call_at(deadline, self._emit, message.sender)
            )
        self.pending[message.sender].messages.append(message)

    def _emit(self, sender: str) -> None:
        pending = self.pending.pop(sender, None)
        if pending is None:
            return
        pending.timer.cancel()
        current_ids = {message.id for message in pending.messages}
        self.requests.put_nowait(
            GenerationRequest(
                sender,
                pending.messages,
                [message for message in self.context if message.id not in current_ids],
            )
        )


async def run_demo() -> None:
    buffer = WindowBuffer(window=2)
    arrivals = [
        (0.0, Message("m1", "A", "这个服务怎么收费？")),
        (0.4, Message("m2", "B", "我昨天提交的申请还没通过。")),
        (0.8, Message("m3", "A", "包含后续维护吗？")),
        (1.2, Message("m4", "C", "我的申请也没通过。")),
    ]
    started = buffer.loop.time()
    a_deadline = None
    for at, message in arrivals:
        await asyncio.sleep(max(0, started + at - buffer.loop.time()))
        buffer.offer(message)
        if message.id == "m1":
            a_deadline = buffer.pending["A"].ready_at
        assert buffer.pending["A"].ready_at == a_deadline

    # 后面不再发送消息，只等待定时器自动产出请求。
    requests = [
        await asyncio.wait_for(buffer.requests.get(), timeout=10)
        for _ in range(3)
    ]
    for request in requests:
        print(json.dumps(asdict(request), ensure_ascii=False))

    by_sender = {request.sender: request for request in requests}
    assert set(by_sender) == {"A", "B", "C"}
    assert by_sender["A"].current_messages == [arrivals[0][1], arrivals[2][1]]
    assert by_sender["A"].context == [arrivals[1][1], arrivals[3][1]]
    assert by_sender["B"].current_messages == [arrivals[1][1]]
    assert by_sender["C"].current_messages == [arrivals[3][1]]
    assert [message.id for message in by_sender["C"].context] == ["m1", "m2", "m3"]
    assert not buffer.pending and buffer.requests.empty()

    probe = WindowBuffer(0.02)
    first = Message("p1", "A", "第一个问题")
    second = Message("p2", "A", "到期后继续补充")
    probe.offer(first)
    time.sleep(0.03)  # 故意让期限先过、定时回调还未执行，检查接收处的到期边界。
    probe.offer(second)
    first_request = await asyncio.wait_for(probe.requests.get(), timeout=10)
    second_request = await asyncio.wait_for(probe.requests.get(), timeout=10)
    assert first_request.current_messages == [first]
    assert first_request.context == []
    assert second_request.current_messages == [second]
    assert second_request.context == [first]
    assert not probe.pending and probe.requests.empty()
    for invalid in (0, -1, True, float("nan"), float("inf")):
        try:
            WindowBuffer(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("无效窗口应报错")
    print("self-checks passed")


if __name__ == "__main__":
    asyncio.run(run_demo())
