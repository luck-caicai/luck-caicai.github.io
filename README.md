# Codex格式转换

codex工具转换

纯前端本地解析工具，用来把 ChatGPT Web session 或 Codex OAuth JSON 转换成中转站可导入的 JSON 格式。

页面主标题为「GPT格式转换 · 本地解析」，所有解析和转换都在浏览器本地完成，不上传 token，不写入本地存储。

## 在线使用

### [点我直接使用](https://luck-caicai.github.io/)

## 支持格式

支持把 session 或 JSON 文件转换为：

- `sub2api`
- `CPA`
- `Cockpit`
- `9router`
- `二验json修正`

## 使用方式

1. 在浏览器登录 ChatGPT。
2. 打开 `https://chatgpt.com/api/auth/session`。
3. 复制页面显示的整段 JSON，粘贴到输入框；也可以点击「上传json/txt文件」上传一个或多个 JSON/TXT 文件。
4. 点击右侧格式按钮选择要导出的格式。
5. 使用「复制输出」或「下载 JSON」保存转换结果。

选择「二验json修正」时，需要先粘贴或上传 session，再额外上传一个带有 `refresh_token` 和 `access_token` 的 JSON 文件。页面会保留上传 JSON 的原结构，只把其中的 `access_token` 替换为 session 里的 access token。

页面内也提供「展示示例结构」按钮，方便查看可解析的 JSON 结构。

## 支持输入

支持 ChatGPT Web session JSON，例如包含：

- `user.email`
- `accessToken`
- `sessionToken`
- `expires`
- `account.id`
- `account.planType`

也支持 9router Codex OAuth JSON，例如包含：

- `accessToken`
- `refreshToken`
- `expiresAt`
- `providerSpecificData.chatgptAccountId`
- `providerSpecificData.chatgptPlanType`

页面会尝试从 `accessToken` 的 JWT payload 中补充邮箱、账号 ID、用户 ID、计划类型和过期时间。

也支持 Cockpit Tools 导出的 Codex 账号 JSON，例如账号对象里的 `tokens.id_token`、`tokens.access_token`、`tokens.refresh_token`。

上传文件支持 `.json` 和 `.txt`。`.txt` 文件内容需要是完整 JSON，例如把 session JSON 保存成 `session.txt`，或把 sub2api/CPA/Cockpit 导出的 JSON 内容保存成 txt 后上传。

## 输出说明

- `sub2api`：生成参考 `CPA2sub2API` 项目的 `exported_at/proxies/accounts` 结构，账号平台为 `openai`，类型为 `oauth`；输入里有 `refresh_token`、`id_token`、`session_token` 时会写入 credentials。
- `CPA`：生成 Codex CPA auth JSON，包含 `type: "codex"`、`access_token`、`session_token`、`id_token`、`email`、`account_id`、套餐和过期时间等字段。
- `Cockpit`：生成 Cockpit Tools Codex JSON 导入可识别的扁平 token 格式，包含 `id_token`、`access_token`、`refresh_token`、`account_id`、`email`、`expired` 等字段；输入里有 `session_token` 时会一并保留。
- `9router`：生成 9router Codex OAuth JSON，包含 `accessToken`、`refreshToken`、`expiresAt`、`providerSpecificData`、`provider`、`authType`、`priority`、`isActive`、`createdAt` 和 `updatedAt` 等字段。
- `二验json修正`：导入 session 和带 `refresh_token` 的 JSON，按邮箱或账号 ID 匹配，匹配不到时按顺序配对；输出保持原 JSON 字段结构，只更新 `access_token`/`accessToken`。

ChatGPT Web session 通常不包含 CPA OAuth 文件里常见的 `refresh_token`，因此 access token 过期后不能自动刷新。

如果输入数据本身没有 OpenAI 签发的真实 `id_token`，页面会按 access token 里的账号 claims 生成随机 RS256 JWT 形状的 `id_token`，用于兼容 CPA/Cockpit 导入。`refresh_token` 仍然无法凭空生成，源 session 没有时会保持为空。

## 安全提醒

session JSON 通常包含 `accessToken` 和 `sessionToken`，等同敏感登录凭证，不要发给别人。

本工具只在浏览器本地解析：

- 浏览器本地解析
- 不上传 token
- 不写入存储

## 添财AI小店

提供各类 AI 账号购买和充值。

### [进入小店](https://pay.ldxp.cn/shop/Z171IV7R)

小店链接：`https://pay.ldxp.cn/shop/Z171IV7R`

## 本地运行

可以直接打开：

```text
docs/index.html
```

也可以用本地静态服务运行：

```bash
cd docs
python3 -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/
```
