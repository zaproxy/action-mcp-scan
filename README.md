# Action MCP Scan

A GitHub Action for running a ZAP scan against an
[MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server using the
[ZAP Automation Framework](https://www.zaproxy.org/docs/automate/automation-framework/)
and ZAP's [MCP add-on](https://www.zaproxy.org/docs/desktop/addons/mcp/).

**WARNING** this action will perform active attacks on the target MCP server. Only scan targets
you have permission to test. Active scans send mutating `tools/call` requests — if your target's
tools have real side effects (file writes, database changes, outbound requests), point this at a
test deployment, not production.

Supply `target` and the action builds and runs an Automation Framework plan for you:

```
mcp-import → passive scan → active scan → JSON / HTML / Markdown reports
```

If you need full control over the AF plan, use [`zaproxy/action-af`](https://github.com/zaproxy/action-af)
instead — that action takes an arbitrary AF plan file and runs it.

## Inputs

### `target`
**Required** URL of the MCP server, e.g. `https://example.com/mcp`.

### `security_key`
**Optional** Value sent in the `Authorization` header to the MCP server. Should be passed from
a GitHub secret, e.g. `security_key: ${{ secrets.MCP_TOKEN }}`.

### `docker_name`
**Optional** ZAP Docker image to use. Defaults to `ghcr.io/zaproxy/zaproxy:stable`. The MCP
add-on is installed at runtime via `zap.sh -addoninstall mcp`, so the image doesn't need to
ship with it pre-installed.

### `docker_env_vars`
**Optional** Names of additional environment variables (one per line) to forward into the ZAP
container. The standard ZAP auth env vars (see below) are always forwarded.

### `rules_file_name`
**Optional** Relative path to a TSV rules file used to ignore specific alerts. Same format as
[action-api-scan](https://github.com/zaproxy/action-api-scan).

### `cmd_options`
**Optional** Additional command line options passed to `zap.sh`.

### `token`
**Optional** Token used to create the GitHub issue containing the scan report. Defaults to
`${{ github.token }}`.

### `issue_title`
**Optional** Title for the GitHub issue. Defaults to `ZAP MCP Scan Report`.

### `fail_action`
**Optional** Fail the workflow if ZAP identifies any alerts. Defaults to `false`.

### `allow_issue_writing`
**Optional** Set to `false` to skip creating/updating the issue. Defaults to `true`.

### `artifact_name`
**Optional** Name of the artifact attached to the workflow run. Defaults to `zap_mcp_scan`.

## Environment variables

These are always forwarded into the container if set in the workflow environment:

- `ZAP_AUTH_HEADER`
- `ZAP_AUTH_HEADER_VALUE`
- `ZAP_AUTH_HEADER_SITE`

See [ZAP authentication env vars](https://www.zaproxy.org/docs/authentication/handling-auth-yourself/#authentication-env-vars).
Use `docker_env_vars` to forward additional variables referenced from a custom `plan`.

## Example usage

### Basic

```yaml
steps:
  - name: ZAP MCP Scan
    uses: zaproxy/action-mcp-scan@v0.1.0
    with:
      target: 'https://example.com/mcp'
```

### Private MCP server with auth

```yaml
steps:
  - name: ZAP MCP Scan
    uses: zaproxy/action-mcp-scan@v0.1.0
    with:
      target: 'https://internal.example.com/mcp'
      security_key: ${{ secrets.MCP_TOKEN }}
      fail_action: true
```

### Need full control over the plan?

Use [`zaproxy/action-af`](https://github.com/zaproxy/action-af) and point it at your own
Automation Framework plan file.
