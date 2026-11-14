# 从带有效期的领取记录计算未读状态

[数据地图](../../../maps/reader-state.md) · [博客](blog.md) · [回到仓库](../../../README.md)

## 一句话看链路

书籍完成状态、历史领取记录、显式时间（内存）→ 有效未读记录（内存）→ 未读标记和章节索引（内存）。

## 运行

Node.js 22+，无第三方依赖。复制 [demo.mjs](demo.mjs) 一个文件到其他目录也能直接运行。

```sh
node demo.mjs
```

在仓库根目录执行：

```sh
npm run demo
node --test demos/state/expiring-unread/demo.test.mjs
```

输出四行，未读标记依次为 `true → false → true → false`：首次领取、领取过期、重新领取、重领后完成。

## 代码入口

全部处理、样例和运行入口在 [demo.mjs](demo.mjs)：

- `findUnreadGrant(book, grants, now)` 返回首条有效未读记录，或 `null`。
- `projectUnread(book, grants, now)` 返回 `{ unread, chapterIndex }`。
- `runDemo()` 用合成数据展示四个时刻，运行结果可重现。

输入合同见文件中的 JSDoc。输入已经由调用方校验，函数按领取列表顺序选择首条记录；章节索引从 0 开始。查询不会改变输入。

## 必须保留的规则

1. 仅考虑当前书籍和追更起点之后的章节。
2. 领取记录已完成，或章节已在其他记录下完成，都不再算未读。
3. 临时记录只在 `at <= now < until` 有效；正式记录永久有效，这是本例的业务约束。
4. 第 0 章是有效索引，判断空结果须比较 `null`，不能用索引的真假值。

## 范围

这里只计算已有领取记录中的未读状态。领取额度、可领取提示、章节访问权限、进度计分、持久化和整个界面均由真实应用的其他模块负责。

## 实际使用

追更阅读器：`src/utils/serial/model.js` 的 `unreadGrant`。作者自有仓库的具体代码链接待确认，确认后直接登记到 `catalog.json` 的 `usages`；不使用上游仓库代替实际应用代码。

本例从该逻辑提炼，改为显式传入当前书籍，空结果统一为 `null`。用于测试对照的[原函数选段](reader-source.cjs)保留在 demo 目录，来源见 [NOTICE](../../../NOTICE.md)。

博客状态：待作者文书审查。审查包生成说明在[仓库首页](../../../README.md)。
