# GitHub 作为文书资料源

[返回首页](../README.md) · [目录索引](../catalog.json)

仓库：`xxs9331/data-flow-demos`。入口：根目录 `catalog.json`。

## 读取顺序

1. 将 `main` 解析为一个完整提交 SHA，并在本轮资料记录中保存。
2. 在该 SHA 下读取 `catalog.json`，按问题、数据类型、位置找到 demo。
3. 从条目中的 `map` 读取数据链路，再读取 `blogs`、`entry`、`cases` 和需要的 `tests`。
4. 将仓库、提交 SHA、相对路径及文件哈希记录为资料来源。

每轮读取均固定同一个提交。`main` 作为发现更新的入口，已审查内容继续关联原提交。

## 路径约定

所有文件路径均相对于仓库根目录。博客、案例和地图中的相对链接则相对于各自文件。每个 demo 的 `id` 在目录调整后也应保持稳定。

GitHub 页面链接：

```text
https://github.com/xxs9331/data-flow-demos/blob/<commit-sha>/<relative-path>
```

原始文本链接：

```text
https://raw.githubusercontent.com/xxs9331/data-flow-demos/<commit-sha>/<relative-path>
```

也可使用 GitHub REST API 的提交查询和仓库内容读取接口，并在内容查询中指定同一个 `ref`。接口语义见 [Commits](https://docs.github.com/en/rest/commits/commits#get-a-commit) 和 [Repository contents](https://docs.github.com/en/rest/repos/contents#get-repository-content)。匿名访问公开仓库可能受到速率限制；读取失败保留错误状态，不以空内容代替正文。

## 审查边界

- 博客的 `article_status` 记录写作状态，代码验证通过与文章审定分别记录。
- 文书读取文件作为参考材料，审查改文继续走文书已有审核流程。
- 仓库内容更新后，可提示作者有新版本；不要自动覆盖已经审查的稿件或旧证据。
- 当前仓库已提供索引及资料；文书客户端的 GitHub 接入需要在文书侧完成。
