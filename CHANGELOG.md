# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- Initial release: scan an MCP (Model Context Protocol) server with the ZAP Automation Framework.
- Auto-installs the ZAP `mcp` add-on in the container at runtime.
- Runs `mcp-import`, passive scan, active scan, and emits JSON/HTML/Markdown reports.
- For full control over the AF plan, use [`zaproxy/action-af`](https://github.com/zaproxy/action-af) instead.
