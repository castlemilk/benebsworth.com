#!/usr/bin/env python3
"""Verify the exact immutable preview before an alias update; never emit API bodies."""
import json, os, pathlib, re, sys, urllib.error, urllib.parse, urllib.request
from verify_extract import parse, require

HOST = re.compile(r'[A-Za-z0-9-]+\.vercel\.app')

def hostname(url):
    require(isinstance(url,str) and re.fullmatch(r'https://[A-Za-z0-9-]+\.vercel\.app',url) is not None, 'Invalid deployment URL')
    return url[len('https://'):]

def validate(record, approval, url, expected_ref):
    require(isinstance(record,dict) and isinstance(approval,dict), 'Invalid deployment/approval record')
    host = hostname(url)
    require(approval.get('approved') is True and approval.get('target') == 'preview' and approval.get('publicationMode') == 'preview-only', 'Preview authorization required')
    require(re.fullmatch(r'[0-9a-f]{40}',approval.get('sourceSha','')) is not None, 'Invalid approved SHA')
    require(record.get('url') == host, 'Deployment URL mismatch')
    project = record.get('project')
    project_ids = [record['projectId']] if 'projectId' in record else []
    if isinstance(project,dict) and 'id' in project:
        project_ids.append(project['id'])
    require(bool(project_ids) and all(x == approval['projectId'] for x in project_ids), 'Deployment project mismatch')
    require(record.get('readyState') == 'READY', 'Deployment not READY')
    require('target' in record and record['target'] in (None,'preview'), 'Non-preview/unknown deployment target rejected')
    meta = record.get('meta')
    require(isinstance(meta,dict) and meta.get('githubCommitSha') == approval['sourceSha'], 'Deployment SHA mismatch')
    require(meta.get('githubCommitRef') == expected_ref, 'Deployment branch metadata mismatch')
    for field in ('teamId','ownerId'):
        if field in record:
            require(record[field] == approval['orgId'], 'Deployment owner mismatch')
    for field in ('team','owner'):
        if field in record:
            require(isinstance(record[field],dict) and record[field].get('id') == approval['orgId'], 'Deployment owner mismatch')
    if isinstance(project,dict):
        for field in ('accountId','teamId','ownerId'):
            if field in project:
                require(project[field] == approval['orgId'], 'Project owner mismatch')
    require(isinstance(record.get('id'),str) and re.fullmatch(r'dpl_[A-Za-z0-9]+',record['id']) is not None, 'Invalid deployment ID')
    return dict(id=record['id'],url=url,sha=approval['sourceSha'],state='READY',target='preview')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward the bearer token to a redirect target.
        return None

def inspect(approval, url, env):
    require(isinstance(approval,dict) and approval.get('approved') is True and approval.get('target') == 'preview' and approval.get('publicationMode') == 'preview-only', 'Preview authorization required')
    require(re.fullmatch(r'[0-9a-f]{40}',approval.get('sourceSha','')) is not None, 'Invalid approved SHA')
    host = hostname(url)
    run_id, attempt = env.get('GITHUB_RUN_ID',''), env.get('GITHUB_RUN_ATTEMPT','')
    require(re.fullmatch('[1-9][0-9]*',run_id) is not None and re.fullmatch('[1-9][0-9]*',attempt) is not None, 'CI run identity required')
    require(re.fullmatch(r'team_[A-Za-z0-9]+',approval.get('orgId','')) is not None, 'Invalid team identity')
    token = env.get('VERCEL_TOKEN','')
    require(bool(token), 'Deployment credential unavailable')
    expected_ref = f"ci-preview-{approval['sourceSha'][:12]}-{run_id}-{attempt}"
    endpoint = 'https://api.vercel.com/v13/deployments/' + urllib.parse.quote(host,safe='') + '?' + urllib.parse.urlencode({'teamId':approval['orgId']})
    request = urllib.request.Request(endpoint,headers={'Authorization':'Bearer '+token,'Accept':'application/json'},method='GET')
    try:
        with urllib.request.build_opener(NoRedirect()).open(request,timeout=30) as response:
            body = response.read(2*1024*1024+1)
            require(len(body) <= 2*1024*1024,'Deployment response too large')
        record = parse(body)
    except urllib.error.HTTPError as error:
        raise ValueError('Deployment lookup failed: HTTP '+str(error.code)) from None
    except (urllib.error.URLError,TimeoutError,OSError):
        raise ValueError('Deployment lookup failed') from None
    except (ValueError,UnicodeError):
        raise ValueError('Deployment lookup returned invalid data') from None
    return validate(record,approval,url,expected_ref)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: verify_deployment.py APPROVAL_JSON DEPLOYMENT_URL_FILE')
    try:
        approval = parse(pathlib.Path(sys.argv[1]).read_bytes())
        url = pathlib.Path(sys.argv[2]).read_text().strip()
        print(json.dumps(inspect(approval,url,os.environ),sort_keys=True))
    except (ValueError,KeyError,TypeError,OSError):
        # No exception details here: never leak API body or authentication material.
        raise SystemExit('Deployment verification failed; no alias authorization issued')
