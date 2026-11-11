#!/usr/bin/env python3
"""Derive exact-artifact authorization from a reviewed owner-trusted push policy.
This is not independent per-artifact human review, nor native environment approval.
Always run authorize.py and verify_extract.py afterwards, before token access.
CLI: prepare_push_approval.py ZIP POLICY RUN ARTIFACT EXPECTED_SHA > approval.json
"""
import datetime, io, pathlib, re, sys, tarfile, zipfile, json
from verify_extract import MAX_ARCHIVE, MAX_EXPANDED, MAX_FILES, digest, parse, require, safe_name

MAX_MANIFEST = 32 * 1024 * 1024
WORKFLOW = '.github/workflows/vercel-artifact.yml'

def prepare(zip_path, policy, run, artifact, expected_sha, now=None):
    require(policy.get('enabled') is True and policy.get('allowOwnerPush') is True, 'Owner-push policy disabled')
    require(policy.get('trustModel') == 'owner-approved-writer-trust', 'Explicit owner-writer trust required')
    require(policy.get('target') == 'preview', 'Automatic push publishes previews only')
    require(policy.get('qualityScope') == 'credential-free-static-canary', 'Unexpected quality scope')
    require(policy.get('artifactWorkflowPath') == policy.get('requiredCiWorkflowPath') == WORKFLOW, 'Unexpected quality workflow')
    require(policy.get('configurationProfile') == 'credential-free-validation', 'Unreviewed profile')
    require(policy.get('publicEnvironment') == {}, 'Public environment policy must be explicitly empty')
    require(isinstance(policy.get('reviewedProjectSettings'), dict) and bool(policy['reviewedProjectSettings']), 'Reviewed settings required')
    require(isinstance(policy.get('configurationReview'), str) and policy['configurationReview'].strip(), 'Configuration review required')
    require(re.fullmatch('[0-9a-f]{40}', expected_sha) is not None, 'Exact source SHA required')
    require(run['repository']['full_name'] == policy['repository'], 'Run repository mismatch')
    require(run['head_repository']['full_name'] == policy['repository'], 'Foreign source repository')
    require(run['head_sha'] == expected_sha, 'Run SHA mismatch')
    require(run['head_branch'] in policy.get('allowedSourceBranches', []), 'Source branch not approved')
    require('refs/heads/' + run['head_branch'] in policy.get('allowedControlRefs', []), 'Source/control ref mismatch')
    require(run['event'] == 'push' and run['path'] == WORKFLOW, 'Successful push artifact workflow required')
    require(run['status'] == 'completed' and run['conclusion'] == 'success', 'Build run incomplete/failed')
    require(str(run['actor']['id']) in policy.get('allowedActorIds', []), 'Build actor not owner approved')
    require(run['triggering_actor']['login'] in policy.get('allowedActorLogins', []), 'Build rerun actor not approved')
    require(artifact.get('expired') is False, 'Artifact expired/unknown')
    require(str(artifact['workflow_run']['id']) == str(run['id']), 'Artifact run mismatch')
    require(artifact['workflow_run']['head_sha'] == expected_sha, 'Artifact SHA mismatch')
    require(artifact['workflow_run']['head_branch'] == run['head_branch'], 'Artifact source branch mismatch')
    for value in (run['id'],run['run_attempt'],artifact['id']):
        require(re.fullmatch('[1-9][0-9]*',str(value)) is not None, 'Invalid run/attempt/artifact identifier')
    require(artifact['name'] == f"vercel-artifact-{expected_sha}-{run['run_attempt']}", 'Artifact name/attempt mismatch')
    zip_path = pathlib.Path(zip_path)
    require(zip_path.stat().st_size <= MAX_ARCHIVE, 'ZIP too large')
    raw = zip_path.read_bytes()
    require(artifact['digest'] == 'sha256:' + digest(raw), 'API ZIP digest mismatch')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        require(len(archive.infolist()) == 2 and set(archive.namelist()) == {'vercel-artifact.tgz','vercel-artifact.tgz.sha256'}, 'Unexpected ZIP members')
        require(sum(x.file_size for x in archive.infolist()) <= MAX_ARCHIVE, 'ZIP expansion too large')
        tgz = archive.read('vercel-artifact.tgz')
        sidecar = archive.read('vercel-artifact.tgz.sha256').decode('ascii').split()
        require(sidecar == [digest(tgz),'vercel-artifact.tgz'], 'Tar sidecar mismatch')
    manifest_raw = None
    count = total = 0
    names = set()
    # Stream archive metadata without extraction. Full independent output validation follows.
    with tarfile.open(fileobj=io.BytesIO(tgz), mode='r|gz') as archive:
        for member in archive:
            count += 1
            total += member.size
            require(count <= MAX_FILES and total <= MAX_EXPANDED, 'Tar expansion limit')
            name = safe_name(member.name)
            require(name not in names, 'Duplicate tar path')
            names.add(name)
            require(member.isdir() or member.isfile(), 'Symlinks/hardlinks/special files unsupported')
            require(not member.mode & 0o6000, 'Set-ID mode')
            require(name in ('manifest.json','.vercel','.vercel/project.json','.vercel/output') or name.startswith('.vercel/output/'), 'Unexpected archive path')
            if name == 'manifest.json':
                require(member.isfile() and member.size <= MAX_MANIFEST, 'Invalid manifest entry')
                manifest_raw = archive.extractfile(member).read()
    require(manifest_raw is not None, 'Manifest missing')
    manifest = parse(manifest_raw)
    require(manifest.get('schemaVersion') == 1 and manifest.get('releaseApproved') is False, 'Unexpected validation manifest approval/schema')
    for field, expected in [('repository',policy['repository']),('sha',expected_sha),('target','preview'),('cliVersion',policy['cliVersion']),('configurationProfile',policy['configurationProfile']),('publicEnvironment',{})]:
        require(manifest.get(field) == expected, 'Manifest profile/identity mismatch: ' + field)
    require(str(manifest['runId']) == str(run['id']) and str(manifest['runAttempt']) == str(run['run_attempt']), 'Manifest run/attempt mismatch')
    require(manifest['project']['projectId'] == policy['projectId'] and manifest['project']['orgId'] == policy['orgId'], 'Manifest project mismatch')
    require(manifest['project']['settings'] == policy['reviewedProjectSettings'], 'Project settings changed since review')
    now = now or datetime.datetime.now(datetime.timezone.utc)
    return dict(approved=True, repository=policy['repository'], sourceSha=expected_sha, sourceBranch=run['head_branch'], runId=str(run['id']),runAttempt=str(run['run_attempt']),artifactId=str(artifact['id']),ciRunId=str(run['id']),buildWorkflowPath=WORKFLOW,ciWorkflowPath=WORKFLOW,zipSha256=digest(raw),tarSha256=digest(tgz),manifestSha256=digest(manifest_raw),target='preview',projectId=policy['projectId'],orgId=policy['orgId'],cliVersion=policy['cliVersion'],configurationProfile=policy['configurationProfile'],configurationReview=policy['configurationReview'],qualityScope='credential-free-static-canary',publicationMode='preview-only',approvalMode='owner-trusted-push-policy',expiresAt=(now+datetime.timedelta(hours=1)).isoformat())

if __name__ == '__main__':
    if len(sys.argv) != 6:
        raise SystemExit('Usage: prepare_push_approval.py ZIP POLICY RUN ARTIFACT EXPECTED_SHA')
    try:
        records = [parse(pathlib.Path(p).read_bytes()) for p in sys.argv[2:5]]
        print(json.dumps(prepare(sys.argv[1], *records, sys.argv[5]), indent=2))
    except (ValueError,KeyError,TypeError,OSError,tarfile.TarError,zipfile.BadZipFile) as error:
        raise SystemExit('Push approval rejected: ' + str(error))
