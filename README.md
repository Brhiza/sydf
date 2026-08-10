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

如需使用内置 AI，可在 Windows PowerShell 中复制环境变量示例，再填写自己的兼容接口配置：

```powershell
Copy-Item .dev.vars.example .dev.vars
```

`.dev.vars` 只用于本机，不应提交到仓库。未配置内置 AI 时，排盘和占卜功能仍可使用，也可以复制提示词交给其他在线 AI 解读。

## 检查与构建

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

生产构建输出到 `dist`。项目已配置 Cloudflare Pages Functions 与 PWA，相关入口分别位于 `functions` 和 `vite.config.ts`。

## 项目结构

```text
src/             Vue 前端、业务逻辑与设计系统
functions/       AI 解读与模型列表接口
public/          图标、插图与 PWA 静态资源
vendor/          当前接入的 mingyu-core 本地包
```
