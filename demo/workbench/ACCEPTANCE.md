# 序间 · 实际页面验收

验收日期：2026-10-24（Asia/Shanghai）。

这是一份实际产品页面，不是工具的虚构测试夹具。初始化的用户、品牌和项目为本次演示编写的虚构内容；创建与状态变更在浏览器本地真实执行。

## 设计与实现

已用安装后的 Codex LLY UI 完成全部 8 类工具调用：status、brief、explorer、capture、audit、baseline、report、assets。

三个真实候选见 `design-comparison/directions.html`。自主选择 A「轻盈工作台」，理由与设计变量见 DESIGN.md、design-brief.json。成品入口为 index.html。

完成：新建项目、必填/日期校验、项目详情、状态推进、状态筛选、搜索、空结果恢复、待办勾选、交付日程、使用说明、本地保存与刷新恢复、响应式布局、键盘焦点和 reduced-motion。

## 真实业务操作

Ego 浏览器通过实际点击和输入运行，结果记录在 evidence/interaction-results.json：

- 创建后刷新恢复。
- 待反馈、已完成状态刷新恢复。
- 已完成筛选只显示匹配项目。
- 无匹配结果时显示恢复入口，清除后恢复全部。
- 待办勾选刷新恢复。
- 空表单显示具体错误，并定位首个问题输入。
- 模拟 QuotaExceededError 后表单不关闭、输入保留、不新增项目。
- Escape 关闭并返回触发控件；Enter 可重新打开。
- 对话框 Tab 正向与 Shift+Tab 反向约束。
- 搜索快捷键定位。

另已验证：390px 手机视口实际新建项目、刷新恢复、无横向溢出（evidence/mobile-interaction.json）；模拟存储失败后恢复原始存储能力，直接重试保留的表单并成功保存（evidence/save-recovery.json）。失败画面见 evidence/save-failed.png。

测试中的存储异常只注入到该测试浏览器页面，已恢复。未修改产品代码来制造成功。

## 机器检查与人工复核

最终 audit：evidence/final-audit/audit.json。

| 视口 | 自动违规 | 横向溢出 | 运行时错误 | Gate |
| --- | ---: | --- | ---: | --- |
| 1440×900 | 0 | 无 | 0 | pass |
| 390×844 | 0 | 无 | 0 | pass |
| 768×1024 | 0 | 无 | 0 | pass |

初稿确实失败：浅色文字对比度和可访问名称有问题。修正了文字色、品牌名称、按钮名称和折叠导航可访问名称；真实键盘检查发现原生 dialog 的末端 Tab 会离开页面内焦点，增加了明确的首尾约束。修正了“提交客户反馈”的歧义，改为“移至待反馈”，不暗示已发送消息。

axe 留下 6 个对比度人工复核项，原因是装饰伪元素使背景无法自动判定。已查看实际截图，并按已知不透明 CSS 背景计算最差对比度，结果最小 5.01:1，记录见 qa/manual-contrast.json。对话框也补充运行了 axe，自动违规为 0；入场动画造成的一处遮挡待核对项已在稳定画面人工确认，见 evidence/mobile-form/capture.png。

已实际查看桌面、手机、平板与手机表单截图。未进行独立子代理评审，不给审美评分。自动检查不等于全面 WCAG 合规认证。

## 视觉基线

按用户要求自主完成演示，由执行者选择当前成品作为内部回归基线，不代表用户已签署验收。基线为 evidence/visual-baseline.json。再次真实渲染后的 desktop/mobile/tablet 像素差异均为 0，见 evidence/regression/regression.json。

## 限制

没有账号、后端、多设备同步或客户消息发送。数据只保存在当前浏览器。演示日期固定为 2026-10-24，日历不是可切月的完整日历产品。复杂录屏、手势和真实远端接口未测试。

## 查看顺序

1. index.html：实际成品。
2. design-comparison/directions.html：设计候选。
3. acceptance-report.html：插件生成的初稿与完成版截图、机器检查与文件哈希。
4. 本文件及 evidence/interaction-results.json：交互与人工补充验收。
