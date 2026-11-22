# 个人技术 Demo 库

先看数据链路，再看数据处理。按处理问题分目录，每个 demo 保持独立运行。

| 数据链路 | Demo |
| --- | --- |
| 完成状态 + 领取记录 + 时间 → 当前未读状态 | [带有效期记录的未读判定](demos/state/expiring-unread.mjs) |
| 变长特征序列 + 有效长度 → 右侧补齐与掩码 → 平均特征 | [排除补齐位置的平均池化](demos/sequence/masked-mean.py) |
| 单群消息 + 发送者 → 按用户固定等待 → 当前输入与共享群聊上下文 | [合并用户的连续消息](demos/events/message-coalescing.py) |
| 用户问题 + 事实依据 + 已有回答 → 内容审查与有限修订 → 短回复或显式回退 | [缩短回答时保留必要信息](demos/text/reply-refinement.py) |
| 当前问题 + 对话历史 → 查询补全与产品范围判定 → 排序结果或澄清 | [多轮检索中的查询补全](demos/retrieval/conversation-query.py) |
| 聊天消息流 → 会话边界 → 待审核的问题与回复 ID | [从聊天记录提取候选问答](demos/dataset/chat-qa-candidates.py) |
| 候选工具 + 显式重叠关系 → 共同判断的工具批次 | [工具功能重叠时按需调用](demos/tools/overlap-batches.py) |

扩充时，在 `demos/<分类>/` 添加以具体处理方法命名的独立代码文件，例如 `sequence/masked-mean.py`，并在此登记入口。目录按数据处理问题分类，文件名区分具体技术，不另建与文件同名的目录。输入输出、处理规则、运行方式、外部博客链接（如有）和实际项目代码链接直接写在代码注释中。优先使用语言标准库。

本仓库使用 [AGPL-3.0](LICENSE)，各 demo 的来源见文件注释。
