"""Read-only gate: reproduce each retained source section, preserving all gaps."""
from pathlib import Path
from collections import Counter
import hashlib,json,xml.etree.ElementTree as ET,math
root=Path(__file__).resolve().parents[2]
source=root/'data/hiking-routes/overland-track'
report=json.loads((source/'primary-validation.json').read_text())
geometry=root/'public/hiking/routes/overland-standard-osm.json'
assert hashlib.sha256(geometry.read_bytes()).hexdigest()=='0a8751d4c41582ad177851e7da4378ece285a07c42b802604e7f515a80bfccc2'
nodes,ways,relations={},{},{}
for item in report['files']:
    path=source/'source'/item['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256'],item['file']
    tree=ET.fromstring(path.read_bytes())
    for kind,store in [('node',nodes),('way',ways),('relation',relations)]:
        for element in tree.findall(kind):
            key=element.get('id')
            if key in store:
                old=store[key]
                assert old.get('version')==element.get('version'),(kind,key,'conflicting version')
                if kind=='node':assert (old.get('lon'),old.get('lat'))==(element.get('lon'),element.get('lat'))
                elif kind=='way':assert [n.get('ref') for n in old.findall('nd')]==[n.get('ref') for n in element.findall('nd')]
            store[key]=element
lines=json.loads(geometry.read_text())['geometry']['coordinates']
order=[m.get('ref') for m in relations['1673569'].findall('member')]
assert order==[item['relation'] for item in report['sections']]
for index,item in enumerate(report['sections']):
    relation=relations[item['relation']]
    ids=[m.get('ref') for m in relation.findall('member') if m.get('type')=='way']
    ns={wid:[n.get('ref') for n in ways[wid].findall('nd')] for wid in ids}
    degrees=Counter(n for wid in ids for n in [ns[wid][0],ns[wid][-1]])
    ends=[n for n,d in degrees.items() if d==1]
    assert len(ends)==2 and max(degrees.values())==2
    chain=[max(ends,key=lambda n:float(nodes[n].get('lat')))];pending=set(ids);ordered=[]
    while pending:
        options=[wid for wid in pending if chain[-1] in (ns[wid][0],ns[wid][-1])]
        assert len(options)==1
        wid=options[0];points=ns[wid] if ns[wid][0]==chain[-1] else ns[wid][::-1]
        chain+=points[1:];ordered.append(wid);pending.remove(wid)
    coords=[[float(nodes[n].get('lon')),float(nodes[n].get('lat'))] for n in chain]
    assert ordered==item['ways'] and coords==lines[index] and len(coords)==item['vertices']
    assert [chain[0],chain[-1]]==item['end_node_ids']
assert len(lines)==6 and sum(map(len,lines))==5074
assert len(report['gaps'])==1 and 184<report['gaps'][0]['distance_m']<186
assert lines[0][-1]==report['gaps'][0]['from'] and lines[1][0]==report['gaps'][0]['to']
print('PASS: all pinned raw bytes, six separate exact source chains, 5,074 vertices and unbridged 184.62 m gap')
