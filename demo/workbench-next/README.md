# 序间 · 创作交接台

独立设计的第二版。保留前一版在 ../workbench，采用相同初始内容，继续沿用浏览器本地保存格式。

启动：在仓库根目录运行 `python3 -m http.server 4174 --bind 127.0.0.1 --directory demo`。
打开 http://127.0.0.1:4174/workbench-next/ 。
前后对比：http://127.0.0.1:4174/redesign-comparison-final/directions.html 。

设计推导与取舍见 DESIGN.md。实际桌面、手机流程与三尺寸检查见 acceptance-report.html。
复跑：仓库根目录运行 `node --experimental-strip-types scripts/verify-redesign.ts`，需给新输出目录，旧证据不覆盖。
日期固定为 2026-10-24；无账号、后端或客户消息发送；初始项目与客户为虚构演示内容。
