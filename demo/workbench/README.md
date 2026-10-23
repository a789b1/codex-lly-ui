# 序间 · 独立创作者工作台

使用 Codex LLY UI 实际完成设计、实现和验收的中文页面。

打开 `index.html` 即可使用。也可以在本目录启动静态服务器：

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

访问 http://127.0.0.1:4173/ 。无 npm 安装，无远程字体、图片或 API 依赖。数据保存在当前浏览器，清除浏览器数据会删除项目；不同网址/端口的记录不互通。

初始品牌、项目、用户与日期为演示内容。真正可操作：创建项目、搜索筛选、查看详情、推进状态、勾选待办，以及刷新后恢复。

- 设计候选：`design-comparison/directions.html`
- 设计决策：`DESIGN.md`
- 完整验收：`ACCEPTANCE.md`
- 插件生成报告：`acceptance-report.html`
- 完成版截图：`evidence/finished-desktop/capture.png`

`qa/verify.mjs` 是本次在 Ego 浏览器真实运行的交互检查记录脚本，需要相应任务空间与本地预览。证据文件中的绝对路径记录了运行当时的位置；报告嵌入截图可离线阅读。
