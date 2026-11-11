#!/usr/bin/env python3
"""Fail-closed, credential-free verifier. Approval must come from reviewed control code.
Never execute imported code, hooks, or binaries from the archive. No tar.extract usage.
CLI: verify_extract.py ZIP NEW_DEST APPROVAL RUN ARTIFACT CI_RUN
"""
import hashlib, io, json, os, pathlib, posixpath, re, sys, tarfile, zipfile

MAX_ARCHIVE = 512 * 1024 * 1024
MAX_EXPANDED = 2 * 1024 * 1024 * 1024
MAX_FILES = 100000

def require(ok, message):
    if not ok:
        raise ValueError(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def parse(data):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, 'Duplicate JSON key')
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=unique)

def safe_name(name):
    require(isinstance(name, str) and name and not name.startswith('/') and '\\' not in name,
            'Unsafe path')
    require(all(part not in ('', '.', '..') for part in name.split('/')), 'Unsafe path component')
    require(not any(ord(c) < 32 or ord(c) == 127 for c in name), 'Control character in path')
    require(not any(p == '.git' or p == '.env' or p.startswith('.env.') for p in name.split('/')),
            'Forbidden Git/environment file')
    return name

def verify_run(run, approval, kind):
    prefix = 'ci' if kind == 'ci' else 'build'
    expected_id = approval['ciRunId'] if kind == 'ci' else approval['runId']
    require(str(run['id']) == str(expected_id), 'Wrong run ID')
    require(run['repository']['full_name'] == approval['repository'], 'Wrong run repository')
    require(run['head_sha'] == approval['sourceSha'], 'Wrong run source SHA')
    require(run['head_branch'] == approval['sourceBranch'], 'Wrong run source branch')
    require(run['path'] == approval[prefix + 'WorkflowPath'], 'Wrong workflow path')
    require(run['status'] == 'completed' and run['conclusion'] == 'success', 'Required run is not successful')
    if kind == 'build':
        require(str(run['run_attempt']) == str(approval['runAttempt']), 'Wrong build attempt')

def verify_extract(zip_path, destination, approval, run, artifact, ci_run):
    require(approval.get('approved') is True, 'Explicit exact-artifact approval required')
    require(re.fullmatch('[0-9a-f]{40}', approval['sourceSha']) is not None, 'Invalid source SHA')
    for key in ('zipSha256', 'tarSha256', 'manifestSha256'):
        require(re.fullmatch('[0-9a-f]{64}', approval[key]) is not None, 'Invalid approved digest')
    require(approval['target'] in ('preview', 'production'), 'Invalid target')
    verify_run(run, approval, 'build')
    verify_run(ci_run, approval, 'ci')
    require(str(artifact['id']) == str(approval['artifactId']), 'Wrong artifact ID')
    require(artifact.get('expired') is False, 'Expired/unknown artifact')
    require(str(artifact['workflow_run']['id']) == str(approval['runId']), 'Wrong artifact run')
    require(artifact['workflow_run']['head_sha'] == approval['sourceSha'], 'Wrong artifact SHA')
    require(artifact['digest'] == 'sha256:' + approval['zipSha256'], 'Wrong API artifact digest')
    zip_path, destination = pathlib.Path(zip_path), pathlib.Path(destination)
    require(not destination.exists() and not destination.is_symlink(), 'Destination must not exist')
    require(zip_path.stat().st_size <= MAX_ARCHIVE, 'Archive too large')
    raw = zip_path.read_bytes()
    require(digest(raw) == approval['zipSha256'], 'ZIP digest mismatch')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        infos = archive.infolist()
        require(len(infos) == 2 and set(archive.namelist()) == {'vercel-artifact.tgz', 'vercel-artifact.tgz.sha256'}, 'Unexpected ZIP members')
        require(sum(x.file_size for x in infos) <= MAX_ARCHIVE, 'ZIP expansion too large')
        tgz = archive.read('vercel-artifact.tgz')
        sidecar = archive.read('vercel-artifact.tgz.sha256').decode('ascii').split()
        require(len(sidecar) == 2 and sidecar[1] == 'vercel-artifact.tgz', 'Invalid sidecar')
        require(sidecar[0] == digest(tgz) == approval['tarSha256'], 'Tar digest mismatch')
    with tarfile.open(fileobj=io.BytesIO(tgz), mode='r:gz') as archive:
        members = []
        expanded = 0
        for member in archive:
            members.append(member)
            expanded += member.size
            require(len(members) <= MAX_FILES and expanded <= MAX_EXPANDED, 'Tar expansion limit')
        table = {}
        for member in members:
            name = safe_name(member.name)
            require(name not in table, 'Duplicate tar path')
            require(not member.issym(), 'Artifact symlinks are unsupported')
            require(member.isdir() or member.isfile(), 'Special/hardlink entry')
            require(name in ('manifest.json', '.vercel', '.vercel/project.json', '.vercel/output') or name.startswith('.vercel/output/'), 'Unexpected archive path')
            require(not member.mode & 0o6000, 'Set-ID mode')
            table[name] = member
        for name in table:
            parent = posixpath.dirname(name)
            while parent:
                require(parent not in table or table[parent].isdir(), 'Non-directory ancestor')
                parent = posixpath.dirname(parent)
        def read(name):
            require(name in table and table[name].isfile(), 'Missing regular metadata file')
            return archive.extractfile(table[name]).read()
        manifest_raw = read('manifest.json')
        require(digest(manifest_raw) == approval['manifestSha256'], 'Manifest not owner approved')
        manifest = parse(manifest_raw)
        for field, key in [('repository','repository'), ('sha','sourceSha'), ('target','target'), ('cliVersion','cliVersion'), ('configurationProfile','configurationProfile')]:
            require(manifest[field] == approval[key], 'Manifest identity/profile mismatch')
        for field in ('runId', 'runAttempt'):
            require(str(manifest[field]) == str(approval[field]), 'Manifest run mismatch')
        require(manifest['schemaVersion'] == 1, 'Unsupported manifest')
        project = {'projectId': approval['projectId'], 'orgId': approval['orgId']}
        require(parse(read('.vercel/project.json')) == project, 'Project linkage mismatch')
        require(all(manifest['project'][key] == value for key, value in project.items()), 'Manifest project mismatch')
        expected = {}
        for item in manifest['files']:
            name = safe_name(item['path'])
            require(name not in expected, 'Duplicate manifest path')
            expected[name] = item
        actual = {name[len('.vercel/output/'):]: member for name, member in table.items() if name.startswith('.vercel/output/') and not member.isdir()}
        require(set(actual) == set(expected), 'Manifest file-set mismatch')
        for name, member in actual.items():
            item = expected[name]
            require('symlink' not in item and item['size'] == member.size, 'File size/type mismatch')
            value = archive.extractfile(member).read()
            require(digest(value) == item['sha256'], 'Content hash mismatch')
        config = parse(read('.vercel/output/config.json'))
        builds = parse(read('.vercel/output/builds.json'))
        require(config['version'] == 3, 'Unsupported Build Output API version')
        require(builds['target'] == approval['target'] and not builds.get('error') and not any(x.get('error') for x in builds.get('builds', [])), 'Failed/wrong-target build metadata')
        # Extract only regular files first. No filesystem path can traverse an archive link.
        destination.mkdir(mode=0o700, parents=False)
        output = destination / '.vercel/output'
        output.mkdir(parents=True)
        for name, member in table.items():
            if name.startswith('.vercel/output/') and member.isdir():
                (destination / name).mkdir(parents=True, exist_ok=True)
        for name, member in actual.items():
            target = output / name
            target.parent.mkdir(parents=True, exist_ok=True)
            if member.isfile():
                with target.open('xb') as stream:
                    stream.write(archive.extractfile(member).read())
                target.chmod(0o755 if member.mode & 0o111 else 0o644)
        (destination / '.vercel/project.json').write_text(json.dumps(project) + '\n')
        return {'repository': approval['repository'], 'sha': approval['sourceSha'], 'target': approval['target'], 'filesVerified': len(actual), 'artifactId': approval['artifactId']}

if __name__ == '__main__':
    if len(sys.argv) != 7:
        raise SystemExit('Usage: verify_extract.py ZIP NEW_DEST APPROVAL RUN ARTIFACT CI_RUN')
    try:
        records = [parse(pathlib.Path(p).read_bytes()) for p in sys.argv[3:]]
        print(json.dumps(verify_extract(sys.argv[1], sys.argv[2], *records), sort_keys=True))
    except (ValueError, KeyError, TypeError, OSError, tarfile.TarError, zipfile.BadZipFile) as error:
        raise SystemExit('Verification rejected: ' + str(error))
