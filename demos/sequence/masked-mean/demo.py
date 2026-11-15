"""变长序列组批时排除补齐位置。

数据链路：不同长度的特征序列 -> 右侧补齐并保留长度 -> 掩码平均 -> 每条序列一个向量。
运行：Python 3.12；安装 CPU 依赖后执行 python demo.py，无需 GPU、模型权重或数据集。
依赖：python -m pip install torch==2.5.1+cpu --index-url https://download.pytorch.org/whl/cpu
预期：直接平均的第一行为 [1.5, 1.5]，掩码平均为 [3.0, 3.0]；末尾自检通过。
约定：输入为非空浮点张量 [B,T,D]，长度为同设备的 int64 [B]，且 1 <= length <= T。
True 表示应排除的位置；只支持右侧补齐。零长度序列报错，由上游决定其业务含义。
来源：本地 NERlabs/eznlp 的 seq_lens2mask 与 sequence_pooling(mean)，提炼并增加输入检查。
本地源码：D:/projects/NERlabs/eznlp/eznlp/nn/functional.py（提交 001904b78d0888490a1c096961559c2601c8e453）。
作者自己的项目也使用同类机制，注意它的 sup_mask 中 True 表示参与聚合，方向相反：
https://github.com/xxs9331/DiffusionNER/blob/4727ebb87a5f04c448aca6463da2d03ed4f84f02/diffusionner/util.py#L253
https://github.com/xxs9331/DiffusionNER/blob/4727ebb87a5f04c448aca6463da2d03ed4f84f02/diffusionner/models.py#L768
配套博客仍在审稿，发布后补充正式文章地址。
"""

import torch
from torch.nn.utils.rnn import pad_sequence


def seq_lens2mask(seq_lens, max_len):
    steps = torch.arange(max_len, device=seq_lens.device)
    return steps.unsqueeze(0) >= seq_lens.unsqueeze(1)


def masked_mean(x, seq_lens):
    if x.ndim != 3 or seq_lens.shape != (x.size(0),):
        raise ValueError("需要 x[B,T,D] 和 seq_lens[B]")
    if not x.is_floating_point() or seq_lens.dtype != torch.long:
        raise ValueError("x 必须为浮点数，seq_lens 必须为 int64")
    if x.device != seq_lens.device:
        raise ValueError("特征与长度必须位于同一设备")
    if min(x.shape) == 0 or ((seq_lens <= 0) | (seq_lens > x.size(1))).any():
        raise ValueError("批次及特征维度须非空，每条有效长度须位于 [1,T]")
    padding_mask = seq_lens2mask(seq_lens, x.size(1))
    # 同时排除补齐数值与补齐位置的计数，避免均值随批次宽度变化。
    total = x.masked_fill(padding_mask.unsqueeze(-1), 0).sum(dim=1)
    return total / seq_lens.unsqueeze(1)


def run_demo():
    sequences = [
        torch.tensor([[0.0, 2.0], [6.0, 4.0]]),
        torch.tensor([[1.0, 3.0], [3.0, 5.0], [5.0, 7.0], [7.0, 9.0]]),
    ]
    seq_lens = torch.tensor([len(sequence) for sequence in sequences])
    x = pad_sequence(sequences, batch_first=True, padding_value=0.0)
    padding_mask = seq_lens2mask(seq_lens, x.size(1))
    pooled = masked_mean(x, seq_lens)
    print("batch shape:", list(x.shape))
    print("lengths:", seq_lens.tolist())
    print("padding mask (True = exclude):", padding_mask.tolist())
    print("plain mean:", x.mean(dim=1).tolist())
    print("masked mean:", pooled.tolist())

    expected = torch.stack([sequence.mean(dim=0) for sequence in sequences])
    torch.testing.assert_close(pooled, expected)
    # 有效位置包含数值 0；掩码依据长度，与数值无关。
    changed_padding = x.masked_fill(padding_mask.unsqueeze(-1), 999.0)
    torch.testing.assert_close(masked_mean(changed_padding, seq_lens), expected)
    nan_padding = x.masked_fill(padding_mask.unsqueeze(-1), float("nan"))
    torch.testing.assert_close(masked_mean(nan_padding, seq_lens), expected)

    alone = sequences[0].unsqueeze(0)
    alone_lengths = seq_lens[:1]
    torch.testing.assert_close(masked_mean(alone, alone_lengths)[0], pooled[0])
    print("same sequence alone / batched:", alone.mean(dim=1)[0].tolist(), pooled[0].tolist())

    with_grad = x.clone().requires_grad_(True)
    masked_mean(with_grad, seq_lens).sum().backward()
    expected_grad = (~padding_mask).unsqueeze(-1).expand_as(x) / seq_lens[:, None, None]
    torch.testing.assert_close(with_grad.grad, expected_grad)
    print("first sequence gradient:", with_grad.grad[0].tolist())

    for invalid in (torch.tensor([0, 4]), torch.tensor([2, 5])):
        try:
            masked_mean(x, invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("零长度和越界长度应报错")
    print("self-checks passed")


if __name__ == "__main__":
    run_demo()
