"""将当前候选按显式重叠关系分批，提炼自 Parlant 的 AUTO 分支。
来源 https://github.com/xxs9331/parlant/blob/main/src/parlant/core/engines/alpha/tool_calling/default_tool_call_batcher.py
运行 python3 overlap-batches.py 。输出共同判断的候选，不调用模型。
"""


def judgment_batches(candidates, overlaps):
    neighbors = {tool: [] for tool in candidates}
    for left, right in overlaps:
        if left in neighbors and right in neighbors:
            neighbors[left].append(right)
            neighbors[right].append(left)

    batches = []
    seen = set()
    for tool in neighbors:
        if tool in seen:
            continue
        batch = [tool]
        seen.add(tool)
        for current in batch:
            for other in neighbors[current]:
                if other not in seen:
                    seen.add(other)
                    batch.append(other)
        batches.append(batch)
    return batches


if __name__ == "__main__":
    tools = ["订单", "物流", "发票"]
    relations = [("订单", "物流")]
    batches = judgment_batches(tools, relations)
    assert batches == [["订单", "物流"], ["发票"]]
    print(batches)
    assert judgment_batches(tools, relations + [("订单", "发票")]) == [tools]
    assert judgment_batches(["物流"], relations) == [["物流"]]
