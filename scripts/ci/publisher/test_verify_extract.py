import copy, hashlib, io, json, pathlib, tarfile, tempfile, unittest, zipfile
from verify_extract import verify_extract

H = lambda b: hashlib.sha256(b).hexdigest()
J = lambda x: json.dumps(x).encode()

class VerificationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.a = dict(approved=True, repository='owner/repo', sourceSha='a'*40, runId=1, runAttempt=1, artifactId=2, target='preview', projectId='prj_x', orgId='team_x', cliVersion='59.13.1', ciRunId=3, ciWorkflowPath='.github/workflows/ci.yml', buildWorkflowPath='.github/workflows/artifact.yml', sourceBranch='feature', configurationProfile='credential-free-validation')
        self.run = dict(id=1, run_attempt=1, repository={'full_name':'owner/repo'}, head_sha='a'*40, head_branch='feature', path=self.a['buildWorkflowPath'], status='completed', conclusion='success')
        self.ci = dict(self.run, id=3, path=self.a['ciWorkflowPath'])
        self.art = dict(id=2, expired=False, workflow_run=dict(id=1, head_sha='a'*40))
        self.entries = {'.vercel/output/config.json': J({'version':3}), '.vercel/output/builds.json': J({'target':'preview'}), '.vercel/output/static/index.html':b'<h1>ok</h1>'}
    def tearDown(self):
        self.tmp.cleanup()
    def package(self, mutate=None, extra=None, links=None):
        entries = self.entries.copy()
        links = links or {}
        project = dict(projectId='prj_x', orgId='team_x')
        manifest = dict(schemaVersion=1, repository='owner/repo', sha='a'*40, runId='1', runAttempt='1', target='preview', cliVersion='59.13.1', project=project, configurationProfile=self.a['configurationProfile'], releaseApproved=False, publicEnvironment={}, files=[dict(path=k.removeprefix('.vercel/output/'), size=len(v), sha256=H(v)) for k,v in entries.items()])
        for name,target in links.items():
            manifest['files'].append(dict(path=name.removeprefix('.vercel/output/'),symlink=target,sha256=H(target.encode())))
        if mutate: mutate(manifest)
        raw = J(manifest)
        entries['manifest.json'] = raw
        entries['.vercel/project.json'] = J(project)
        if extra: entries.update(extra)
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf,mode='w:gz') as t:
            for k,v in entries.items():
                m=tarfile.TarInfo(k); m.size=len(v);t.addfile(m,io.BytesIO(v))
            for k,v in links.items():
                m=tarfile.TarInfo(k);m.type=tarfile.SYMTYPE;m.linkname=v;t.addfile(m)
        tgz=buf.getvalue();self.a['tarSha256']=H(tgz);self.a['manifestSha256']=H(raw)
        buf=io.BytesIO()
        with zipfile.ZipFile(buf,'w') as z:
            z.writestr('vercel-artifact.tgz',tgz);z.writestr('vercel-artifact.tgz.sha256',H(tgz)+'  vercel-artifact.tgz\n')
        zipdata=buf.getvalue();self.a['zipSha256']=H(zipdata);self.art['digest']='sha256:'+H(zipdata)
        self.path=self.root/'artifact.zip';self.path.write_bytes(zipdata)
    def verify(self):
        return verify_extract(self.path,self.root/'out',self.a,self.run,self.art,self.ci)
    def test_success_and_no_manifest_extracted(self):
        self.package(); self.assertEqual(self.verify()['filesVerified'],3)
        self.assertFalse((self.root/'out/manifest.json').exists())
    def test_failed_ci(self):
        self.package();self.ci['conclusion']='failure'
        with self.assertRaisesRegex(ValueError,'not successful'):self.verify()
    def test_wrong_workflow(self):
        self.package();self.run['path']='attacker.yml'
        with self.assertRaisesRegex(ValueError,'workflow'):self.verify()
    def test_wrong_run_attempt(self):
        self.package();self.run['run_attempt']=2
        with self.assertRaisesRegex(ValueError,'attempt'):self.verify()
    def test_wrong_artifact_run(self):
        self.package();self.art['workflow_run']['id']=99
        with self.assertRaisesRegex(ValueError,'artifact run'):self.verify()
    def test_approval_required(self):
        self.package();self.a['approved']=False
        with self.assertRaisesRegex(ValueError,'approval'):self.verify()
    def test_digest(self):
        self.package();self.a['manifestSha256']='0'*64
        with self.assertRaisesRegex(ValueError,'Manifest'):self.verify()
    def test_traversal(self):
        self.package(extra={'.vercel/output/../evil':b'bad'})
        with self.assertRaisesRegex(ValueError,'Unsafe'):self.verify()
    def test_env_file(self):
        self.package(extra={'.vercel/output/.env':b'bad'})
        with self.assertRaisesRegex(ValueError,'Forbidden'):self.verify()
    def test_unmanifested_file(self):
        self.package(extra={'.vercel/output/unlisted':b'bad'})
        with self.assertRaisesRegex(ValueError,'file-set'):self.verify()
    def test_content_hash(self):
        self.package(mutate=lambda m:m['files'][0].update(sha256='0'*64))
        with self.assertRaisesRegex(ValueError,'hash'):self.verify()
    def test_symlink_rejected(self):
        self.package(links={'.vercel/output/static/link':'index.html'})
        with self.assertRaisesRegex(ValueError,'symlinks are unsupported'):self.verify()
    def test_owner_option_cannot_enable_symlinks(self):
        self.a['allowContainedSymlinks']=True
        self.package(links={'.vercel/output/static/link':'index.html'})
        with self.assertRaisesRegex(ValueError,'symlinks are unsupported'):self.verify()
    def test_type_substitution(self):
        self.package(mutate=lambda m:m['files'][0].update(symlink='x'))
        with self.assertRaisesRegex(ValueError,'type'):self.verify()
    def test_existing_destination(self):
        self.package();(self.root/'out').mkdir()
        with self.assertRaisesRegex(ValueError,'Destination'):self.verify()

if __name__=='__main__':unittest.main()
