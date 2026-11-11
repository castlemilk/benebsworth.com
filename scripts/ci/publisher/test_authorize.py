import unittest
from authorize import authorize
class AuthorizationTests(unittest.TestCase):
 def setUp(self):
  self.p={'enabled':True,'trustModel':'owner-approved-writer-trust','allowedActorIds':['123'],'allowedActorLogins':['owner'],'allowedControlRefs':['refs/heads/release'],'repository':'o/r','target':'preview','projectId':'p','orgId':'o','cliVersion':'59.13.1'}
  self.p.update(requiredCiWorkflowPath='.github/workflows/ci.yml', artifactWorkflowPath='.github/workflows/build.yml')
  self.p.update(qualityScope='credential-free-static-canary')
  self.a={**{k:self.p[k] for k in ('repository','target','projectId','orgId','cliVersion')},'approved':True,'qualityScope':'credential-free-static-canary','publicationMode':'preview-only','sourceSha':'a'*40,'zipSha256':'b'*64,'tarSha256':'c'*64,'manifestSha256':'d'*64,'runId':1,'runAttempt':1,'artifactId':2,'ciRunId':3,'buildWorkflowPath':'.github/workflows/build.yml','ciWorkflowPath':'.github/workflows/ci.yml','sourceBranch':'preview','configurationProfile':'explicit','configurationReview':'reviewed exact manifest','expiresAt':'2099-01-01T00:00:00Z'}
  self.e={'GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_ACTOR_ID':'123','GITHUB_TRIGGERING_ACTOR':'owner','GITHUB_REF':'refs/heads/release','GITHUB_REPOSITORY':'o/r'}
 def test_success(self): authorize(self.p,self.a,self.e)
 def test_policy_failures(self):
  for key,value in [('enabled',False),('trustModel','UNSELECTED'),('allowedActorIds',[]),('allowedActorLogins',[]),('allowedControlRefs',[])]:
   with self.subTest(key=key),self.assertRaises(ValueError): authorize({**self.p,key:value},self.a,self.e)
 def test_approval_failures(self):
  for key,value in [('approved',False),('ciRunId',None),('sourceSha','main'),('manifestSha256','bad'),('target','production'),('expiresAt','2020-01-01T00:00:00Z'),('publicationMode','promote'),('ciWorkflowPath','.github/workflows/build.yml')]:
   with self.subTest(key=key),self.assertRaises(ValueError): authorize(self.p,{**self.a,key:value},self.e)
 def test_owner_push_requires_explicit_policy(self):
  with self.assertRaises(ValueError): authorize(self.p,self.a,{**self.e,'GITHUB_EVENT_NAME':'push'})
  authorize({**self.p,'allowOwnerPush':True},self.a,{**self.e,'GITHUB_EVENT_NAME':'push'})
 def test_event_rejected(self):
  with self.assertRaises(ValueError): authorize(self.p,self.a,{**self.e,'GITHUB_EVENT_NAME':'pull_request'})
if __name__=='__main__': unittest.main()
