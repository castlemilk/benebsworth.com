import unittest
from cutover_gate import validate,PATH,classify_disconnect
class GateTests(unittest.TestCase):
 def setUp(self):
  self.p=dict(enabled=True,trustModel='owner-approved-writer-trust',allowedActorIds=['1'],allowedActorLogins=['owner'],allowedControlRefs=['refs/heads/editorial'],repository='o/r',projectId='p',orgId='t')
  self.m=dict(approved=True,action='disconnect-git-source-after-current-ci-preview',repository='o/r',projectId='p',orgId='t',preserveDeploymentProtection=True,preserveAllAliases=True,expiresAt='2099-01-01T00:00:00Z',qualifiedBasisSha='a'*40,qualifiedPublisherRunId=123)
  self.e=dict(GITHUB_EVENT_NAME='push',GITHUB_ACTOR_ID='1',GITHUB_TRIGGERING_ACTOR='owner',GITHUB_REF='refs/heads/editorial',ALIAS_OUTCOME='success',GITHUB_REPOSITORY='o/r',GITHUB_SHA='b'*40,PUSH_BEFORE='a'*40)
  self.c=dict(status='ahead',base_commit={'sha':'a'*40},commits=[{'sha':'b'*40}],files=[{'filename':PATH,'status':'added'}])
 def test_success(self):self.assertTrue(validate(self.m,self.p,self.c,self.e))
 def test_no_marker_change(self):
  with self.assertRaises(ValueError):validate(self.m,self.p,{**self.c,'files':[]},self.e)
 def test_bad_marker(self):
  for k,v in [('approved',False),('expiresAt','2020-01-01T00:00:00Z'),('projectId','other'),('preserveAllAliases',False),('action','promote')]:
   with self.subTest(k=k),self.assertRaises(ValueError):validate({**self.m,k:v},self.p,self.c,self.e)
 def test_bad_context(self):
  for k,v in [('GITHUB_ACTOR_ID','2'),('GITHUB_REF','refs/heads/other'),('ALIAS_OUTCOME','skipped'),('GITHUB_SHA','main'),('GITHUB_EVENT_NAME','pull_request')]:
   with self.subTest(k=k),self.assertRaises(ValueError):validate(self.m,self.p,self.c,{**self.e,k:v})
 def test_divergence(self):
  with self.assertRaises(ValueError):validate(self.m,self.p,{**self.c,'status':'diverged'},self.e)
class OutcomeTests(unittest.TestCase):
 def test_known_and_unknown_outcomes(self):
  self.assertEqual(classify_disconnect(0,'Disconnected castlemilk/benebsworth.com.'),'disconnected')
  for status in [0,1]:self.assertEqual(classify_disconnect(status,'No Git repository connected. Run ...'),'already-disconnected')
  for status,text in [(1,'Disconnected castlemilk/benebsworth.com.'),(0,''),(1,'permission denied'),(0,'Disconnected other/repo.')]:
   with self.subTest(status=status,text=text),self.assertRaises(ValueError):classify_disconnect(status,text)
if __name__=='__main__':unittest.main()
