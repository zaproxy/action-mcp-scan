const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const exec = require('@actions/exec');
const common = require('@zaproxy/actions-common-scans');

const generatedPlanName = '.zap-mcp-plan.yaml';

async function run() {
    let generatedPlanPath = null;
    try {
        const workspace = process.env.GITHUB_WORKSPACE;
        const currentRunnerID = process.env.GITHUB_RUN_ID;
        const repoName = process.env.GITHUB_REPOSITORY;

        const token = core.getInput('token');
        const target = core.getInput('target', { required: true });
        const securityKey = core.getInput('security_key');
        const dockerName = core.getInput('docker_name', { required: true });
        const rulesFileLocation = core.getInput('rules_file_name');
        const cmdOptions = core.getInput('cmd_options');
        const issueTitle = core.getInput('issue_title');
        const failAction = core.getInput('fail_action');
        const allowIssueWriting = core.getInput('allow_issue_writing');
        let artifactName = core.getInput('artifact_name');

        if (securityKey) {
            core.setSecret(securityKey);
        }
        process.env.MCP_SECURITY_KEY = securityKey || '';

        const dockerEnvVarNames = ['ZAP_AUTH_HEADER', 'ZAP_AUTH_HEADER_VALUE', 'ZAP_AUTH_HEADER_SITE', 'MCP_SECURITY_KEY']
            .concat(core.getMultilineInput('docker_env_vars', { required: false }))
            .filter(v => v && v.trim().length > 0);
        const dockerEnvFlags = dockerEnvVarNames.map(e => `-e ${e}`).join(' ');

        if (!(String(failAction).toLowerCase() === 'true' || String(failAction).toLowerCase() === 'false')) {
            console.log("[WARNING]: 'fail_action' should be either 'true' or 'false'");
        }
        const createIssue = String(allowIssueWriting).toLowerCase() !== 'false';

        if (!artifactName) {
            console.log("[WARNING]: 'artifact_name' should not be empty. Falling back to default.");
            artifactName = 'zap_mcp_scan';
        }

        const templatePath = path.join(__dirname, 'plan-template.yaml');
        const template = fs.readFileSync(templatePath, 'utf8');
        const rendered = template.replaceAll('{{MCP_TARGET}}', target);
        generatedPlanPath = path.join(workspace, generatedPlanName);
        fs.writeFileSync(generatedPlanPath, rendered, { mode: 0o644 });
        const planInContainer = `/zap/wrk/${generatedPlanName}`;

        let plugins = [];
        if (rulesFileLocation) {
            plugins = await common.helper.processLineByLine(`${workspace}/${rulesFileLocation}`);
        }

        await exec.exec(`chmod a+w ${workspace}`);
        await exec.exec(`docker pull ${dockerName} -q`);

        const zapCmd = `zap.sh -cmd -addoninstall mcp; zap.sh -cmd -autorun ${planInContainer} ${cmdOptions || ''}`.trim();
        const dockerCmd =
            `docker run -v ${workspace}:/zap/wrk/:rw --network="host" ${dockerEnvFlags} ` +
            `-t ${dockerName} bash -c "${zapCmd}"`;

        try {
            await exec.exec(dockerCmd);
        } catch (err) {
            const msg = err.toString();
            if (msg.includes('exit code 3')) {
                core.setFailed('Failed to scan the target: ' + msg);
                return;
            }
            if ((msg.includes('exit code 2') || msg.includes('exit code 1'))
                && String(failAction).toLowerCase() === 'true') {
                console.log('[info] ZAP exited with alerts and fail_action=true');
                core.setFailed('ZAP identified alerts during the scan. ' + msg);
            } else {
                console.log('Scan complete, analysing results.');
            }
        }

        await common.main.processReport(
            token, workspace, plugins, currentRunnerID, issueTitle, repoName, createIssue, artifactName);
    } catch (error) {
        core.setFailed(error.message);
    } finally {
        if (generatedPlanPath) {
            try { fs.unlinkSync(generatedPlanPath); } catch (_) { /* best-effort */ }
        }
    }
}

run();
