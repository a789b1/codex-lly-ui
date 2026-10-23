# 独立实现的范围

产品参考：dsh-oil-ui。参考的是问题领域，包括设计方向比较、实际浏览器检查和用户项目中的产物交付。没有将参考产品的代码或素材改名作为当前产品发布。

## 本项目实现

- `src/workspace.ts`：以显式 cwd 约束文件访问，本地 HTTP 预览、Host 校验、隐藏路径和符号链接拒绝。
- `src/chrome.ts` 与 `src/browser.ts`：独立临时浏览器启动、CDP 消息、页面加载状态、取消和超时。
- `src/exploration.ts`：设计约束记录，以及基于实际渲染截图的独立比较页。没有复制原项目的 HTML/CSS/JS 资源打包器或比较模板。
- `src/capture.ts`：独立 click/fill/key/waitFor 操作和结果观察。
- `src/audit.ts`：集成标准 axe 引擎，采集多视口画面、运行时和布局证据、设计变量。
- `src/evidence.ts`：基线完整性、像素差异、离线报告与文件清单。
- `src/assets.ts`：已有素材的来源、许可声明、署名与哈希记录。
- `src/runtime.ts` 与 `src/server.ts`：自主定义的参数契约、工作区调用队列、8 个标准 MCP 工具。
- `plugins/codex-lly-ui/skills/codex-lly-ui/`：本项目的设计与验收流程。

## 不包含

DSH/Cordis 运行时、原项目工作台、Oil UI 技能及设计分册、原比较页模板、品牌图标、演示作品和原测试文件。也没有复制或分发付费 Pro。

## 标准依赖

MCP SDK 负责协议，axe-core 负责自动规则，Ajv 负责参数校验，pngjs/pixelmatch 负责图片解码和像素比较。依赖是公开库，不声称由本项目原创；发布包包含相应许可信息。

## 产品取舍

Codex 已有的生图、网络搜索与特定浏览器操作通过宿主完成。本插件专注设计决策记录与证据闭环，不维护第二套付费生图服务、不把简单动作派发冒充业务正确性验证。
