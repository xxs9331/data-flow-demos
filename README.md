# 个人技术 Demo 库

先看数据链路，再看数据处理。按处理问题分目录，每个 demo 保持独立运行。

| 数据链路 | Demo |
| --- | --- |
| 完成状态 + 领取记录 + 时间 → 当前未读状态 | [带有效期记录的未读判定](demos/state/expiring-unread/expiring-unread.mjs) |
| 变长特征序列 + 有效长度 → 右侧补齐与掩码 → 平均特征 | [排除补齐位置的平均池化](demos/sequence/masked-mean/masked-mean.py) |

扩充时，在 `demos/<分类>/<名称>/` 添加独立代码文件，文件名使用所属文件夹名加语言扩展名，例如 `masked-mean/masked-mean.py`，并在此登记入口。输入输出、处理规则、运行方式、外部博客链接（如有）和实际项目代码链接直接写在代码注释中。优先使用语言标准库。

本仓库使用 [AGPL-3.0](LICENSE)，各 demo 的来源见文件注释。
