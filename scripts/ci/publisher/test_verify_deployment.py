import copy, unittest
from verify_deployment import validate, hostname
class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.a=dict(approved=True,target='preview',publicationMode='preview-only',sourceSha='a'*40,projectId='prj_x',orgId='team_x')
        self.url='https://example-abc.vercel.app';self.ref='ci-preview-'+('a'*12)+'-12-1'
        self.r=dict(id='dpl_ABC123',url='example-abc.vercel.app',projectId='prj_x',readyState='READY',target=None,meta={'githubCommitSha':'a'*40,'githubCommitRef':self.ref},teamId='team_x')
    def check(self):return validate(self.r,self.a,self.url,self.ref)
    def test_success(self):self.assertEqual(self.check()['target'],'preview')
    def test_project_object(self):
        del self.r['projectId'];self.r['project']={'id':'prj_x','accountId':'team_x'};self.check()
    def test_field_mismatches(self):
        for field,value in [('url','other.vercel.app'),('projectId','prj_bad'),('readyState','BUILDING'),('target','production'),('teamId','team_bad'),('ownerId','team_bad'),('id','bad')]:
            with self.subTest(field=field):
                r=copy.deepcopy(self.r);r[field]=value
                with self.assertRaises(ValueError):validate(r,self.a,self.url,self.ref)
    def test_meta_mismatches(self):
        for field in ('githubCommitSha','githubCommitRef'):
            r=copy.deepcopy(self.r);r['meta'][field]='wrong'
            with self.assertRaises(ValueError):validate(r,self.a,self.url,self.ref)
    def test_url_rejections(self):
        for url in ['http://x.vercel.app','https://x.vercel.app/','https://x.vercel.app:443','https://x.vercel.app@evil.com','https://x.vercel.app\nhttps://evil.com','https://evil.com','https://x.y.vercel.app']:
            with self.subTest(url=url),self.assertRaises(ValueError):hostname(url)
    def test_approval_mismatches(self):
        for field,value in [('approved',False),('target','production'),('publicationMode','stage-only'),('sourceSha','invalid')]:
            a=dict(self.a);a[field]=value
            with self.assertRaises(ValueError):validate(self.r,a,self.url,self.ref)
    def test_conflicting_project(self):
        self.r['project']={'id':'prj_bad'}
        with self.assertRaises(ValueError):self.check()
    def test_missing_project(self):
        del self.r['projectId']
        with self.assertRaises(ValueError):self.check()
    def test_nested_owner(self):
        self.r['team']={'id':'team_bad'}
        with self.assertRaises(ValueError):self.check()
if __name__=='__main__':unittest.main()
