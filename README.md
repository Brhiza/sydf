# 时月东方

<p align="center">
  <img src="./public/logo.webp" width="112" alt="时月东方">
</p>

时月东方是一款面向普通用户的东方术数与 AI 解读应用。项目将传统排盘、占卜、日历与现代交互结合，尽量用直观的页面和现代语言呈现复杂盘面，同时保留可供深入查看的传统资料。

## 主要功能

- 问事与占卜：梅花易数、六爻、三山国王灵签、小六壬、金口诀、奇门遁甲、大六壬、太乙神数等。
- 命盘与合盘：八字、紫微斗数、西洋星盘、七政四余、八字紫微合参，以及双人综合合盘。
- 日常工具：今日运势、每日一卦、传统黄历、个人历与居家风水。
- AI 解读：支持内置 AI、自定义兼容接口、后台解读、历史记录，以及服务不可用时复制提示词到其他 AI。
- 使用体验：案例管理、真太阳时换算、移动端适配、PWA 安装与离线资源缓存。

## mingyu-core

时月东方与 [`mingyu-core`](https://github.com/Brhiza/mingyu) 是并行维护、相互配合的两个项目。`mingyu-core` 沉淀历法换算、真太阳时、地区资料、排盘、占卜、合盘数据结构与提示词等可复用能力；时月东方负责页面交互、结果呈现、案例与历史管理，以及面向普通用户的内容组织。应用侧发现的算法、数据和接口需求也会反馈到核心库，推动两边一起完善。

项目实际接入的 `mingyu-core` 版本以 `package.json` 和 `pnpm-lock.yaml` 为准。

本项目当前接入的核心能力包括：

- 公历、农历、干支、节气、时辰与真太阳时换算；
- 八字、紫微斗数、西洋星盘、七政四余等命盘资料；
- 梅花易数、六爻、灵签、小六壬、金口诀、奇门遁甲、大六壬与太乙神数；
- 黄历择日、五运六气、皇极经世及多体系合盘；
- 供 AI 解读使用的结构化结果、摘要和提示词基础模块。

更多算法、类型定义与调用方式请查看 [`mingyu-core` 仓库](https://github.com/Brhiza/mingyu)。

## 本地运行

项目使用 `pnpm`：

```bash
pnpm install
pnpm dev
```

开发服务器启动后，按照终端显示的本地地址访问即可。

如需在 `pnpm dev` 中使用内置 AI，可在 Windows PowerShell 中复制环境变量示例，再填写自己的兼容接口配置：

```powershell
Copy-Item .dev.vars.example .env.local
```

`.env.local` 只用于本机，不应提交到仓库。使用 Wrangler 本地运行时，可将同一份示例复制为 `.dev.vars`。未配置内置 AI 时，排盘和占卜功能仍可使用，也可以复制提示词交给其他在线 AI 解读。

## 检查与构建

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

生产构建输出到 `dist`。项目已配置 Cloudflare Pages Functions 与 PWA。

## 部署

Cloudflare Pages 使用以下构建设置：

| 配置项 | 配置值 |
| --- | --- |
| 根目录 | `./` |
| 安装命令 | `pnpm install` |
| 构建命令 | `pnpm build` |
| 输出目录 | `dist` |
| Node.js | 20 或 22 |

### Cloudflare Pages

连接 Git 仓库并填写上述构建设置即可。Cloudflare 会自动识别 `functions/api`，提供 `/api/agent`、`/api/interpret` 和 `/api/models` 三个服务端接口。本地使用 Wrangler 时，将 `.dev.vars.example` 复制为 `.dev.vars` 并填写真实配置。

在「项目设置 → 环境管理」中分别编辑生产和预览环境，加入以下服务端环境变量。变量更新只对之后的新部署生效，修改后需要重新部署：

```text
AI_BASE_URL=https://api.openai.com/v1
AI_API_TYPE=chat
AI_MODEL=gpt-4o-mini
AI_API_KEY=replace-with-your-key
```

`AI_API_TYPE` 支持 `chat`、`responses` 和 `anthropic`。还可以按接口需要配置 `AI_API_URL`、`AI_MODELS_URL`、`AI_SYSTEM_PROMPT`、`AI_TEMPERATURE`、`AI_MAX_TOKENS`。密钥必须使用服务端变量名，不能添加 `VITE_` 前缀，也不要提交到仓库。

## 项目结构

```text
src/              Vue 前端、业务逻辑与设计系统
functions/api/    Cloudflare Pages Functions 入口
functions/shared/ AI 接口共用逻辑
public/          图标、插图与 PWA 静态资源
vendor/          当前接入的 mingyu-core 本地包
```
