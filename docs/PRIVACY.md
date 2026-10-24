# Codex LLY UI — Privacy

Effective date: 2026-10-23. Maintainer: lly, through a789b1/codex-lly-ui on GitHub.

This free local plugin does not operate a maintainer-hosted application server or telemetry endpoint. It processes the workspace selected for each tool request.

Design briefs, browser screenshots, observed page text, accessibility findings, asset source records, visual baselines and reports are saved locally in the project. Browser checks launch an isolated temporary profile and do not read the user's logged-in browser profile. Temporary profile cleanup is attempted when a check ends. Users can remove generated project files and uninstall the plugin to remove the installed package.

Opening a page causes normal requests to that page and its resources. The destination services may receive IP addresses and request information under their own policies. The bundled axe engine runs locally. MCP asset registration records supplied source/license claims without fetching the source. Optional bundled media-search scripts contact the public sources requested by the user and save downloads and license records locally; those sources receive normal network request data. The plugin does not access third-party image credentials or process payments.

Codex and the host's enabled tools process prompts, project files and images according to the host's settings and policies. Image generation and web search, if used by the host agent, are separate host capabilities.

Support is provided through public GitHub Issues. Do not post private files, personal information, credentials or sensitive screenshots. GitHub handles submitted issue content under its own policies; authors can edit or remove their content through GitHub. There is no separate plugin operator database.

Local evidence can contain private page content. Review files before sharing a report. Future changes to data handling require an updated notice.
