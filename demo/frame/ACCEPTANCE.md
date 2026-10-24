# 实际验收 · 2026-10-24

## 当前加载

本轮直接通过当前会话的 lly_ui_status 得到 version=0.6.0，Node v24.21.0、Chrome 可用。运行的是当前安装插件，不是只从文件名推断版本。

## 独立评审

- 初轮视觉：/root/visual_review，7/10，见 evidence/visual-review.md。
- 修正平板图像面积、手机顶部空间、决策位置和折叠信息。
- 最终静态视觉：/root/visual_final，8/10，见 evidence/visual-final.md。之后加强当前缩略图轮廓，保留桌面大图与八图同屏的取舍。评分不用于推断用户满意度。
- 独立 UX：/root/ux_review，通过真实页面自主选择“挑片、写理由、导出”路径，下载文件内容正确。见 evidence/ux/UX-REVIEW.md。发现手机缩略图不返回主图，已修并由主 Agent 重测。导出按钮改为明确的“导出 JSON”。

## 主 Agent 真实操作

- 桌面：入选、笔记、刷新恢复、两张入选过滤、大图、Escape、无结果恢复、总览：evidence/journey-desktop/capture.json。
- 手机：入选、展开笔记、保存、刷新、读回、移出最后一张、空选片恢复：evidence/journey-mobile/capture.json。
- 异常恢复：scripts/verify-frame.ts 启动三个独立浏览器，10项断言各跑3次，全部通过。用实际指针/输入，主动注入存储写入异常，验证失败不假报成功、输入保留、重试、刷新读回、草稿跨照片保留、未保存笔记阻止导出、真实导出 Blob 的ID/笔记/许可，以及手机点击缩略图后主图可见。见 evidence/recovery/verification.json。
- JSON 下载由独立 UX 实际保存；主 Agent 另外检查导出 Blob 内容，非仅判断点击回执。

## 三端检查

1440×900、768×1024、390×844：无自动规则违规、无横向溢出、无断图、无控制台错误，资源均已加载。见 evidence/audit-final/audit.json。

自动结果为 **review**，没有篡改为 pass：字符型搜索/视图/箭头图标需要人工核对对比度与标签。人工查看实际截图和可访问名称后确认：图标有高对比颜色，功能按钮有文字或明确 aria-label；这些不是完整 WCAG 认证。

## 动效与证据限制

主图首次淡入、入选盖章、大图展开与关闭均在真实浏览器操作。插件 shoot 的 --evidence 提供 200% 图、动态探测及三帧，系统缺少 ffmpeg 导致其 MP4 编码失败，原失败报告保留在 evidence/full-review，不伪装为全部通过。

随后用系统现有 Chromium 的 MediaRecorder 编码真实浏览器截图序列，保留原时间间隔，生成 evidence/motion/real-interaction.webm（约6.36秒）。没有插值或伪造画面。已经在浏览器以正常速度播放至 ended=true、error=null，核对选片、切片、放大、总览。此视频是操作示范，不是帧率性能测量；录制后仅加强了缩略图轮廓，交互未改。

页面是摄影工具，不是落地页，不添加无关滚动叙事。英文副题是相册编目信息，CC BY 为真实许可名，保留并说明工具提示。检查了默认大图和200%截图，手机/平板最终截图另有独立评审。

## 仍有边界

选片与笔记只在当前浏览器；没有后端同步。导出是 JSON 清单，不下载原摄影文件。打开“摄影来源”跳往作者/许可页面。初始页面不预置入选；成品截图中的3张入选来自真实 UX 操作，不是伪造客户审批结果。
