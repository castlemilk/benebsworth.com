"""One-shot owner-approved Git-source disconnect gate; no credentials or network."""
import json,os,re,sys
from datetime import datetime,timezone
from verify_extract import parse,require
PATH='scripts/ci/publisher/git-cutover.json'
def validate(marker,policy,comparison,env):
 require(policy.get('enabled') is True and policy.get('trustModel')=='owner-approved-writer-trust','Owner-trust policy required')
 require(env.get('GITHUB_EVENT_NAME')=='push','Push-only cutover')
 require(env.get('GITHUB_ACTOR_ID') in policy['allowedActorIds'] and env.get('GITHUB_TRIGGERING_ACTOR') in policy['allowedActorLogins'],'Owner identity required')
 require(env.get('GITHUB_REF') in policy['allowedControlRefs'],'Allowed control ref required')
 require(env.get('ALIAS_OUTCOME')=='success','Current preview alias command must succeed first')
 require(marker.get('approved') is True and marker.get('action')=='disconnect-git-source-after-current-ci-preview','Explicit bounded action required')
 for k in ['repository','projectId','orgId']:
  require(marker.get(k)==policy.get(k),'Cutover identity mismatch')
 require(marker['repository']==env.get('GITHUB_REPOSITORY'),'Wrong repository')
 require(marker.get('preserveDeploymentProtection') is True and marker.get('preserveAllAliases') is True,'Preservation contract required')
 require(re.fullmatch('[0-9a-f]{40}',env.get('GITHUB_SHA','')) is not None,'Exact head required')
 require(re.fullmatch('[0-9a-f]{40}',env.get('PUSH_BEFORE','')) is not None,'Exact prior head required')
 require(comparison.get('status')=='ahead' and comparison.get('base_commit',{}).get('sha')==env['PUSH_BEFORE'],'Fast-forward push comparison required')
 require(comparison.get('commits') and comparison['commits'][-1]['sha']==env['GITHUB_SHA'],'Comparison head mismatch')
 require(any(f.get('filename')==PATH and f.get('status') in ('added','modified') for f in comparison.get('files',[])),'Marker must change in this push')
 require(datetime.fromisoformat(marker['expiresAt'].replace('Z','+00:00'))>datetime.now(timezone.utc),'Cutover approval expired')
 require(re.fullmatch('[0-9a-f]{40}',marker.get('qualifiedBasisSha','')) is not None,'Qualified basis required')
 require(str(marker.get('qualifiedPublisherRunId','')).isdigit(),'Qualified run required')
 return True
def classify_disconnect(status, output):
 if status == 0 and 'Disconnected castlemilk/benebsworth.com.' in output:
  return 'disconnected'
 if 'No Git repository connected.' in output:
  return 'already-disconnected'
 raise ValueError('Uncertain Git disconnect outcome; inspect project link before any retry')
if __name__=='__main__':
 try:
  if len(sys.argv)==4 and sys.argv[1]=='classify':
   print(classify_disconnect(int(sys.argv[2]),open(sys.argv[3]).read()))
  else:
   marker,policy,comparison=[parse(open(p,'rb').read()) for p in sys.argv[1:]]
   validate(marker,policy,comparison,os.environ)
   print('approved=true')
 except (ValueError,KeyError,TypeError,OSError):raise SystemExit('Git cutover gate or outcome rejected; inspect project link before retry')
