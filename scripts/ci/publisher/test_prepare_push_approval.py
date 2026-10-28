import copy, datetime, hashlib, io, json, pathlib, tarfile, tempfile, unittest, zipfile
from prepare_push_approval import prepare, WORKFLOW
from verify_extract import verify_extract

H=lambda b:hashlib.sha256(b).hexdigest()
J=lambda x:json.dumps(x).encode()
class PushApprovalTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name);self.sha='a'*40
        self.policy=dict(enabled=True,allowOwnerPush=True,trustModel='owner-approved-writer-trust',target='preview',qualityScope='credential-free-static-canary',artifactWorkflowPath=WORKFLOW,requiredCiWorkflowPath=WORKFLOW,configurationProfile='credential-free-validation',publicEnvironment={},reviewedProjectSettings={'framework':'nextjs','nodeVersion':'24.x'},configurationReview='Owner-trusted canary-qualified profile; no full-suite parity claim',repository='owner/repo',allowedSourceBranches=['branch'],allowedControlRefs=['refs/heads/branch'],allowedActorIds=['123'],allowedActorLogins=['owner'],projectId='prj_x',orgId='team_x',cliVersion='59.13.1')
        self.run=dict(id=1,run_attempt=1,repository={'full_name':'owner/repo'},head_repository={'full_name':'owner/repo'},head_sha=self.sha,head_branch='branch',event='push',path=WORKFLOW,status='completed',conclusion='success',actor={'id':123},triggering_actor={'login':'owner'})
        self.artifact=dict(id=2,name=f'vercel-artifact-{self.sha}-1',expired=False,workflow_run={'id':1,'head_sha':self.sha,'head_branch':'branch'})
        self.manifest=dict(schemaVersion=1,releaseApproved=False,repository='owner/repo',sha=self.sha,target='preview',cliVersion='59.13.1',configurationProfile='credential-free-validation',publicEnvironment={},runId='1',runAttempt='1',project={'projectId':'prj_x','orgId':'team_x','settings':copy.deepcopy(self.policy['reviewedProjectSettings'])})
    def tearDown(self):self.tmp.cleanup()
    def package(self,link=False):
        output={'config.json':J({'version':3}),'builds.json':J({'target':'preview'}),'static/index.html':b'ok'}
        self.manifest['files']=[dict(path=k,size=len(v),sha256=H(v)) for k,v in output.items()]
        entries={'.vercel/output/'+k:v for k,v in output.items()}
        entries['manifest.json']=J(self.manifest);entries['.vercel/project.json']=J({'projectId':'prj_x','orgId':'team_x'})
        b=io.BytesIO()
        with tarfile.open(fileobj=b,mode='w:gz') as t:
            for k,v in entries.items():
                m=tarfile.TarInfo(k);m.size=len(v);t.addfile(m,io.BytesIO(v))
            if link:
                m=tarfile.TarInfo('.vercel/output/link');m.type=tarfile.SYMTYPE;m.linkname='static/index.html';t.addfile(m)
        tgz=b.getvalue();b=io.BytesIO()
        with zipfile.ZipFile(b,'w') as z:
            z.writestr('vercel-artifact.tgz',tgz);z.writestr('vercel-artifact.tgz.sha256',H(tgz)+'  vercel-artifact.tgz\n')
        raw=b.getvalue();self.path=self.root/'artifact.zip';self.path.write_bytes(raw);self.artifact['digest']='sha256:'+H(raw)
    def prepare(self):return prepare(self.path,self.policy,self.run,self.artifact,self.sha,datetime.datetime(2026,10,28,tzinfo=datetime.timezone.utc))
    def test_success_and_full_verifier(self):
        self.package();a=self.prepare();self.assertEqual(a['approvalMode'],'owner-trusted-push-policy');self.assertEqual(a['ciRunId'],'1');self.assertEqual(a['expiresAt'],'2026-10-28T01:00:00+00:00')
        self.assertEqual(verify_extract(self.path,self.root/'out',a,self.run,self.artifact,self.run)['filesVerified'],3)
    def test_wrong_repository(self):
        self.package();self.run['repository']['full_name']='evil/repo'
        with self.assertRaisesRegex(ValueError,'repository'):self.prepare()
    def test_failed_run(self):
        self.package();self.run['conclusion']='failure'
        with self.assertRaisesRegex(ValueError,'failed'):self.prepare()
    def test_wrong_event(self):
        self.package();self.run['event']='pull_request'
        with self.assertRaisesRegex(ValueError,'push'):self.prepare()
    def test_wrong_profile(self):
        self.manifest['publicEnvironment']={'SECRET':'bad'};self.package()
        with self.assertRaisesRegex(ValueError,'profile'):self.prepare()
    def test_changed_settings(self):
        self.manifest['project']['settings']['nodeVersion']='22.x';self.package()
        with self.assertRaisesRegex(ValueError,'settings changed'):self.prepare()
    def test_wrong_digest(self):
        self.package();self.artifact['digest']='sha256:'+'0'*64
        with self.assertRaisesRegex(ValueError,'digest'):self.prepare()
    def test_wrong_branch(self):
        self.package();self.run['head_branch']='unapproved'
        with self.assertRaisesRegex(ValueError,'branch'):self.prepare()
    def test_wrong_actor(self):
        self.package();self.run['actor']['id']=999
        with self.assertRaisesRegex(ValueError,'actor'):self.prepare()
    def test_wrong_rerun_actor(self):
        self.package();self.run['triggering_actor']['login']='stranger'
        with self.assertRaisesRegex(ValueError,'rerun actor'):self.prepare()
    def test_wrong_attempt(self):
        self.package();self.run['run_attempt']=2
        with self.assertRaisesRegex(ValueError,'attempt'):self.prepare()
    def test_link_rejected(self):
        self.package(link=True)
        with self.assertRaisesRegex(ValueError,'Symlinks'):self.prepare()
    def test_disabled_policy(self):
        self.package();self.policy['enabled']=False
        with self.assertRaisesRegex(ValueError,'disabled'):self.prepare()
    def test_production_rejected(self):
        self.package();self.policy['target']='production'
        with self.assertRaisesRegex(ValueError,'previews only'):self.prepare()
    def test_sha_mismatch(self):
        self.package();self.run['head_sha']='b'*40
        with self.assertRaisesRegex(ValueError,'SHA'):self.prepare()

if __name__=='__main__':unittest.main()
