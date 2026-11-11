"""Trusted publisher authorization. These controls must never come from artifact source."""
import json, os, re

def authorize(policy, approval, env):
    def require(ok, message):
        if not ok: raise ValueError(message)
    require(policy.get('enabled') is True, 'Publisher policy disabled')
    require(policy.get('trustModel') in ('owner-approved-writer-trust', 'protected-control-branch'), 'Owner must select trust model')
    require(env.get('GITHUB_EVENT_NAME') == 'workflow_dispatch' or (env.get('GITHUB_EVENT_NAME') == 'push' and policy.get('allowOwnerPush') is True), 'Owner dispatch or explicitly authorized owner push only')
    require(env.get('GITHUB_ACTOR_ID') in policy.get('allowedActorIds', []), 'Unapproved actor')
    require(env.get('GITHUB_TRIGGERING_ACTOR') in policy.get('allowedActorLogins', []), 'Unapproved triggering actor or rerun')
    require(env.get('GITHUB_REF') in policy.get('allowedControlRefs', []), 'Unapproved control ref')
    require(approval.get('approved') is True, 'Artifact/profile not approved')
    require(approval.get('qualityScope') == policy.get('qualityScope') == 'credential-free-static-canary', 'Canary quality scope only')
    require(approval.get('publicationMode') == ('stage-only' if policy['target'] == 'production' else 'preview-only'), 'No implicit production promotion')
    for key in ('repository', 'target', 'projectId', 'orgId', 'cliVersion'):
        require(approval.get(key) == policy.get(key), 'Policy mismatch: '+key)
    require(approval['repository'] == env.get('GITHUB_REPOSITORY'), 'Repository mismatch')
    require(re.fullmatch(r'[0-9a-f]{40}', approval.get('sourceSha', '')), 'Full source SHA required')
    for key in ('zipSha256', 'tarSha256', 'manifestSha256'):
        require(re.fullmatch(r'[0-9a-f]{64}', approval.get(key, '')), 'Reviewed digest required: '+key)
    for key in ('runId','runAttempt','artifactId','ciRunId'):
        require(re.fullmatch(r'[1-9][0-9]*', str(approval.get(key,''))), 'Exact run/artifact ID required: '+key)
    for key in ('buildWorkflowPath','ciWorkflowPath'):
        require(re.fullmatch(r'\.github/workflows/[A-Za-z0-9_.-]+\.ya?ml',approval.get(key,'')), 'Workflow path required')
    require(policy.get('requiredCiWorkflowPath') == approval['ciWorkflowPath'], 'Required CI workflow is policy-controlled')
    require(policy.get('artifactWorkflowPath') == approval['buildWorkflowPath'], 'Artifact workflow is policy-controlled')
    require(isinstance(approval.get('sourceBranch'), str) and 0 < len(approval['sourceBranch']) < 256, 'Source branch required')
    require(approval.get('configurationProfile') and approval.get('configurationReview'), 'Explicit configuration review required')
    require(approval.get('expiresAt'), 'Time-limited approval required')
    from datetime import datetime, timezone
    require(datetime.fromisoformat(approval['expiresAt'].replace('Z','+00:00')) > datetime.now(timezone.utc), 'Approval expired')

if __name__ == '__main__':
    authorize(json.load(open('policy.json')),json.load(open('approval.json')),os.environ)
    print('Approved publisher identity, target and exact artifact request; required CI still to verify.')
