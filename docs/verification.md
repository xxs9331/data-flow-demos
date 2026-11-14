# 初版交付验证

日期：2026-11-14。

## Demo 与关系

- 独立实现为 `demos/state/expiring-unread/demo.mjs`，49 行，包含处理、合成样例和运行入口，无第三方依赖。
- 将该文件复制到仓库外临时目录，仍能输出四个阶段；未读状态依次为 true、false、true、false。
- 九项测试通过，覆盖时间边界、重领后完成、跨书隔离、追更起点、正式记录、第 0 章、输入不变及真实故障重现。
- 测试夹具中的两个函数体与阅读器读取时的源码逐字一致；提炼后的计算与留存 helper 在对应场景下一致。
- 登记条目均有博客、数据地图、测试和真实导出函数绑定。实际使用项目仅登记自有 GitHub 代码地址与使用位置，不另写案例文档。相对文件链接通过检查。
- 测试只运行索引登记的用例，生成的文书附件快照不会被重复发现为测试。

## GitHub

公开仓库：[xxs9331/data-flow-demos](https://github.com/xxs9331/data-flow-demos)。

首次完整校验提交为 `ff2fb36dd651b0eac4389c22b131d69319d0010c`，对应 [GitHub Actions](https://github.com/xxs9331/data-flow-demos/actions/runs/43589722439) 已通过 Node 22、24 的关系检查、测试、样例运行和单文件独立运行。

文书入口为根目录 `catalog.json`。资料读取协议见 [GitHub 资料源](github-source.md)。博客仍待作者审查。

实际使用源码已发布到作者自有的 [koodo-serial-reader](https://github.com/xxs9331/koodo-serial-reader/blob/f2ad1058654f12c5f58bf3671276856e2eee57cc/src/utils/serial/model.js#L190)，提交为 `f2ad1058654f12c5f58bf3671276856e2eee57cc`。该源码快照保留应用实现原样，排除 `.env`、`electron-builder.env`、`docker-compose-secret.yml`、个人阅读数据与运行产物；排除文件未进入任何发布提交。已核对 token 模块仅包含逻辑，且与公开上游文件哈希一致。33 项追更单元测试通过，未重新打包或部署应用。

## 首次文书包

使用文书本机项目 API 创建项目，保存修改目标；博客作为主稿，代码、测试、demo 说明、数据地图与仓库组织说明作为六份可读取的参考资料。原始仓库文件及逐文件 SHA-256 保存在附件中。

已使用文书实际 `Workflow.open`、`Materials` 和 `Workspace` 逻辑验证打开与资料读取；整个目录复制到另一个位置后再次打开成功，修改目标和主稿保持一致。模型调用数为零，打开时没有自动派发待处理讨论。

每个审查包绑定生成时的 Git 提交，具体值在包内 `附件/source-manifest.json`。打包每次新建目录，不覆盖已开始的审查记录。

交付目录直接以文书项目根目录为准，所选文件夹下须立即包含 `文书项目.json` 和 `正文.md`。已修正先前把项目嵌在外层交付目录内而造成的选择歧义。

## 验证范围

本次完成仓库与资料源准备，未实现文书客户端的 GitHub 接入，未执行文书桌面 UI 验收，也未在新目录注册猩猩点灯插件 Flow。普通 Markdown 链路图及源码绑定已提供。独立 demo 验证不代表重新验收整个 Windows 阅读器。

本次保留阅读器和文书应用源码及其原有工作区变更，未复制生产账本、书籍正文、账号设置或密钥。
