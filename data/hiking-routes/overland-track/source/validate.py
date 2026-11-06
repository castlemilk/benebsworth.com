import json,math,hashlib,xml.etree.ElementTree as E
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parent;nodes={};ways={};rels={};files=[]
for p in root.glob('*.osm'):
 t=E.parse(p).getroot();files.append({'file':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 for n in t.findall('node'):nodes[n.get('id')]=[float(n.get('lon')),float(n.get('lat'))]
 for w in t.findall('way'):ways[w.get('id')]=[n.get('ref') for n in w.findall('nd')]
 for r in t.findall('relation'):rels[r.get('id')]=r
order=[m.get('ref') for m in rels['1673569'].findall('member')]; sections=[];allcoords=[];lines=[];gaps=[]
def dist(a,b):
 la,lb=map(math.radians,[a[1],b[1]]);return 12742017.6*math.asin(min(1,math.sqrt(math.sin(math.radians(b[1]-a[1])/2)**2+math.cos(la)*math.cos(lb)*math.sin(math.radians(b[0]-a[0])/2)**2)))
for rid in order:
 rel=rels[rid];ids=[m.get('ref') for m in rel.findall('member') if m.get('type')=='way'];deg=Counter(n for wid in ids for n in [ways[wid][0],ways[wid][-1]]);ends=[n for n,d in deg.items() if d==1];assert len(ends)==2,(rid,ends,deg)
 assert max(deg.values())==2,(rid,'branches')
 start=max(ends,key=lambda n:nodes[n][1]);pending=set(ids);chain=[start];walk=[]
 while pending:
  choices=[w for w in pending if chain[-1] in (ways[w][0],ways[w][-1])];assert len(choices)==1,(rid,chain[-1],choices)
  w=choices[0];ns=ways[w];ns=ns if ns[0]==chain[-1] else ns[::-1];chain+=ns[1:];walk.append(w);pending.remove(w)
 coords=[nodes[n] for n in chain];d=[dist(a,b) for a,b in zip(coords,coords[1:])]
 sections.append({'relation':rid,'version':rel.get('version'),'timestamp':rel.get('timestamp'),'ways':walk,'vertices':len(coords),'start':coords[0],'end':coords[-1],'distance_m':sum(d),'max_segment_m':max(d),'end_node_ids':[chain[0],chain[-1]]})
 if allcoords and allcoords[-1]!=coords[0]:gaps.append({'before_relation':rid,'from':allcoords[-1],'to':coords[0],'distance_m':dist(allcoords[-1],coords[0])})
 lines.append(coords)
 allcoords+=coords if not allcoords else coords[1:]
report={'source':'https://api.openstreetmap.org/api/0.6/relation/1673569/full','relation_version':rels['1673569'].get('version'),'relation_timestamp':rels['1673569'].get('timestamp'),'license':'ODbL-1.0','attribution':'© OpenStreetMap contributors','sections':sections,'vertices':sum(len(line) for line in lines),'distance_m':sum(x['distance_m'] for x in sections),'continuity':'Each section is continuous by shared node IDs, with two degree-one endpoints and no branches. Gaps between sections are preserved, not bridged.','gaps':gaps,'files':files}
(root/'primary-validation.json').write_text(json.dumps(report,indent=2));(root/'overland-standard-osm.geojson').write_text(json.dumps({'type':'Feature','properties':{'name':'Overland Track standard route with lakeshore continuation','source':report['source'],'relationVersion':report['relation_version'],'license':'ODbL-1.0','attribution':report['attribution'],'note':'Community-mapped standard route, not Ben Ebsworth personal GPS track. Includes lakeshore walking, not ferry; no summit side trips.'},'geometry':{'type':'MultiLineString','coordinates':lines}},separators=(',',':')));print(json.dumps({k:v for k,v in report.items() if k not in ['files','sections']},indent=2));print(json.dumps(sections,indent=2))
