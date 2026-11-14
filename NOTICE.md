# 来源与许可

本仓库首个示例来自对 Koodo Reader 本地追更功能的提炼。基础项目为 https://github.com/koodo-reader/koodo-reader，原项目使用 GNU Affero General Public License version 3；保留原项目及相关贡献者的权利声明。

- `demos/state/expiring-unread/reader-source.cjs`：2026-11-14 本地 `src/utils/serial/model.js` 中的原始函数选段，增加说明注释及测试核对用导出。该追更功能来自本地未提交改动，上游基础 HEAD 为 `38d405b8c565aaaa0df7ca7238644f995c5a5830`；上游地址仅说明许可证来源，不作为实际使用代码链接。
- `demos/state/expiring-unread/demo.mjs`：2026-11-14 在该逻辑基础上缩小输入合同、规范空返回值，并增加展示映射、合成样例和运行入口。
- 博客、地图和回归测试：本仓库新编写的解释及验证材料。

整个仓库按根目录 `LICENSE` 中的 AGPL-3.0 分发。实际采用项目直接登记作者自有 GitHub 仓库中的代码地址。
