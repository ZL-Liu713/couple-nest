# 恋爱小窝 ♡

可爱风、手机友好的情侣互动网页。GitHub Pages 提供页面，Supabase 提供账号、两人房间、数据库及实时同步。

## 已包含

- 登录 / 邮箱注册，跨设备使用同一个账号找回小窝。
- 创建小窝，一次性邀请链接配对；限两人，邀请 24 小时有效。
- 恋爱纪念日计数、独立心情、戳戳想念、悄悄话、共同心愿勾选、随机约会灵感。
- 自选性别和 8 种头像、私密相册的拍立得 / 画廊 / 大图浏览。
- 心动问答卡、翻翻乐（可分享成绩）、爱心与星星同屏棋盘。
- 明确的退出账号、退出小窝入口；离开后归档原房间并保留历史。
- 未配置时进入明确标识的本机体验模式，体验数据与真实房间分开，不自动上传。
- 行级访问控制（RLS）、禁止客户端改房间归属、禁止冒充伴侣发送消息。

## 本地查看

需要 Node.js 22.12+ 或 24。

```sh
npm ci
npm run dev
```

打开终端给出的地址。无需账号即可体验；这不是互联网公开网址。

## 从零上线：只需配置一次

### 1. 创建 Supabase 项目

在 https://supabase.com/dashboard 创建项目。进入 SQL Editor → New query，粘贴 `supabase/schema.sql` 的全部内容并运行一次，再运行 `supabase/upgrade-v2.sql`。请使用新项目；此文件不是可重复运行的数据库迁移。

Authentication → Providers 中启用 Email（通常默认启用）。保持邮箱确认开启。Supabase 默认邮件服务可能限制收件人；给两个人正式使用前，在 Authentication 的邮件设置中配置自定义 SMTP 并实际验证确认邮件可送达。

在项目的 Connect / API Keys 中获取 Project URL 和 publishable key（或 legacy anon key）。前端只用这两项，**不要放入 service_role 或 secret key**。

### 2. 创建自己的 GitHub 仓库

新建仓库，建议名称 `couple-nest`。将本项目文件放到仓库根目录，根目录应直接有 `package.json`、`src/`、`public/` 和 `.github/`，不要再套一层 couple-nest 文件夹。

可以通过 GitHub Desktop 发布，或使用网页上传文件。网页上传时，如果隐藏的 `.github` 文件夹未被上传，请用 Add file → Create new file，新建 `.github/workflows/pages.yml`，粘贴本项目同名文件内容。

不要上传 `node_modules/`、`.env` 或 `dist/`。`package-lock.json` 必须上传。

### 3. 填写两个网站变量

仓库 Settings → Secrets and variables → Actions → Variables → New repository variable：

| 名称 | 内容 |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key 或 anon key |

这两个值是浏览器公开配置，安全性由数据库权限保障。

### 4. 开启 GitHub Pages

仓库 Settings → Pages → Source 选择 **GitHub Actions**。进入 Actions → Publish our little nest → Run workflow。成功后打开部署结果中的网页链接，一般是 `https://你的用户名.github.io/couple-nest/`。

如果主分支不是 `main`，相应修改 `.github/workflows/pages.yml` 的 branches。修改变量后重新 Run workflow，前端配置在构建时写入。

### 5. 配置回跳地址并邀请另一半

将发布后的完整网址填到 Supabase → Authentication → URL Configuration → Site URL，并添加到 Redirect URLs。

你们分别用自己的邮箱注册，确认邮件后回网站登录。第一人点击「创建我们的新小窝」，复制邀请链接，私下发给另一半。第二人在同一网站登录自己的账号，通过口令点击「加入另一半的小窝」。另一半不要再创建新房间。

成功后显示「实时同步中」。用两台设备测试：一台发送悄悄话，另一台应看到新消息；一台勾选心愿，另一台应同步。戳戳提醒只在网页打开且连接时即时显示，不提供手机系统推送。

## 接通本地真实数据

复制 `.env.example` 为 `.env.local`，填上公开的 URL 和 key，重启开发服务器。

## 数据与当前范围

消息、心愿及戳戳各加载最近 100 条。旧数据仍在数据库中；本版本未做历史分页、照片删除或密码找回。支持私密照片上传及退出小窝归档。退出登录不会删除房间。创建前请确认账号和邀请对象；已有房间的账号不能加入第二个房间。未实现实时在线人数或已读回执，「实时同步中」表示本人订阅已连接，不代表另一半在线。断线时显示重连状态，发送失败会提示，重连后重新读取房间数据。

## 检查

```sh
npm test
npm run build
```

自动化测试使用 PGlite 执行数据库脚本，验证私密数据隔离、两人配对、邀请码失效、冒充发送被拒、共同心愿更新和纪念日规则。真实 Supabase、注册邮件与两台远程设备端到端同步，需要配置项目后再验证。

## 官方文档

- GitHub Pages：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Supabase 实时数据库：https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase 邮件服务：https://supabase.com/docs/guides/auth/auth-smtp

## v2 升级（已有项目）

在 Supabase SQL Editor 运行 `supabase/upgrade-v2.sql` 后部署新版。**已有项目不要重跑 schema.sql**。全新项目先运行 schema.sql，再运行 upgrade-v2.sql。

新增可选性别、8 种头像、私密回忆相册（5 MB 内 JPG/PNG/WebP，拍立得 / 画廊 / 大图）、明确的退出账号和退出小窝入口。

退出小窝会保留历史但归档原房间，离开的成员不再有访问权限，剩余成员可读历史但不能继续邀请或写入。这样不会把旧内容展示给下一位伴侣。

测试与尚未完成事项请阅读 `docs/测试与修改报告.md`。

## 心动游乐场

问答卡可以直接投递到双方悄悄话信箱，另一半上线后可回复。翻翻乐是单人记忆挑战，完成后可把成绩发给另一半。爱心与星星是同一台设备轮流下的三连棋，棋盘不跨设备同步。游戏进度保留在当前页面会话，刷新会重开；已发送的问答和成绩保存在小窝中。
