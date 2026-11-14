# 真实案例：追更阅读器读完后未读红点仍然存在

[博客](../../demos/state/expiring-unread/blog.md) · [Demo](../../demos/state/expiring-unread/README.md) · [数据地图](../../maps/reader-state.md)

## 触发过程

同一章第一次临时领取后，没有读完并过期；第二次重新领取并读完。第一条领取记录仍然保留 `completed: false`，而书籍的 `completed` 已经包含该章。

旧判断把“这条领取记录未完成”和“这个章节现在可访问”组合起来。章节读完后会永久可访问，导致早已过期的旧领取记录又被算作未读。

修复选择领取记录时，分别检查记录自身的有效性和章节最终完成状态。调用方共用这一判定。

## 当前真实调用链

| 环节 | 阅读器源码位置 | 与本例的关系 |
| --- | --- | --- |
| 状态输入 | `src/utils/serial/model.js` 中的账本结构 | 提供书籍、领取记录和时间 |
| 有效未读记录 | `model.js:190` 的 `unreadGrant` | 本例 `findUnreadGrant` 的来源 |
| 展示快照 | `model.js:197` 的 `snapshot` | 使用 `!!unreadGrant(...)` |
| 阅读入口 | `src/utils/main/serial-util.js:126` 的 `enter` 分支 | 使用同一 helper 选择目标章节 |
| 任务栏状态 | `src/utils/serial/taskbar.js` 的 `taskbarSnapshot` | 展示未读，另外叠加“可领取”条件 |
| 回归案例 | `src/utils/serial/taskbar.test.ts:39` | 过期、重领、完成后旧记录仍在，但未读应为 false |

任务栏完整红点为 `book.unread || claimable`。本 demo 只提炼 `book.unread` 的数据处理，不能用它替代整条任务栏规则。

## 来源与版本

来源是本地 `koodo-reader` 的未提交追更功能工作区，读取日期为 **2026-11-14**。该 checkout 的上游是 [koodo-reader/koodo-reader](https://github.com/koodo-reader/koodo-reader)，基础 HEAD 为 `38d405b8c565aaaa0df7ca7238644f995c5a5830`。

**这些追更文件尚未进入该上游提交。** 上游链接仅标识项目，不能作为本 helper 已公开发布的证据。为便于脱离原机器核对，仓库保留[原始函数选段](source.cjs)。

| 原始文件 | 当前工作区 SHA-256 |
| --- | --- |
| `src/utils/serial/model.js` | `4f6d048933ccd27a34772c12e418e0bcadb5baf099a8433076a356cef091391a` |
| `src/utils/main/serial-util.js` | `660aa9df1fcac2bba1f6c6f0a6ef82a544afdd0e04b1fbd0ba6120d1f1f3d124` |
| `src/utils/serial/taskbar.test.ts` | `dddc0bac1ceade39d2e51080ab80bda65920f453ebe0cb0a4bb157cb679c3084` |

`source.cjs` 留存 `isAllowed`、`unreadGrant` 及前者依赖的 `integer`，增加导出语句供测试读取。原函数体保持一致。测试中的旧判定是根据故障逻辑重建的最小重现，已明确区别于原始源码快照。

## Demo 的提炼范围

- 将整本账本缩为当前书籍状态、领取数组和时间三个输入。
- 显式要求 `startIndex`，将找不到记录的 `undefined` 统一为 `null`。
- 新增 `projectUnread`，展示如何把结果映射为未读标记和章节索引。
- 合成书名、章节和时间，不复制任何真实书籍正文、生产账本或用户资料。
- 不迁移领取规则、计分、IPC、界面、配置读写或跨天归一化。

验证命令见[Demo 说明](../../demos/state/expiring-unread/README.md)。测试包含旧逻辑故障重现、与原始 helper 的结果对照及业务边界；独立 demo 验证不等于重新验收整个 Windows 阅读器。
