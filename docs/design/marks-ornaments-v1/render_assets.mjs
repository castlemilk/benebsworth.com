/** Render the actual SVG files with an already installed Sharp; no downloads.
 * SVG_RENDERER_ROOT=/path/to/node-project node docs/design/marks-ornaments-v1/render_assets.mjs
 * CODEX_PRIMARY_RUNTIME_NODE_MODULES is supported by the existing work runtime.
 */
import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, resolve, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const moduleRoot = process.env.SVG_RENDERER_ROOT || process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || root;
const require = createRequire(resolve(moduleRoot, '__marks_renderer__.cjs'));
const sharp = require('sharp');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const manifest = JSON.parse(await readFile(resolve(here, 'manifest.json'), 'utf8'));
const reports = [];

function alphaStats(data, width, height) {
  let clear = 0, opaque = 0, painted = 0;
  let xmin = width, ymin = height, xmax = -1, ymax = -1;
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const a = data[(y*width+x)*4+3];
    if (a===0) clear++;
    if (a===255) opaque++;
    if (a>0) { painted++; xmin=Math.min(xmin,x); ymin=Math.min(ymin,y); xmax=Math.max(xmax,x); ymax=Math.max(ymax,y); }
  }
  const edge = Math.min(xmin,ymin,width-1-xmax,height-1-ymax);
  if (!painted || !clear || edge < 1) throw new Error(`Empty, matted or clipped drawing: ${width}x${height}, edge=${edge}`);
  return {clear_pixels: clear, opaque_pixels: opaque, painted_pixels: painted,
    clear_fraction: clear/(width*height), painted_bounds: [xmin,ymin,xmax,ymax], minimum_clear_edge_px: edge};
}

for (const art of manifest.artworks) {
  for (const file of art.files) {
    const source = await readFile(resolve(root,file.path));
    if (sha(source) !== file.sha256) throw new Error(`Source hash mismatch: ${file.path}`);
    for (const density of [1,2]) {
      const width = file.width*density, height = file.height*density;
      const png = await sharp(source,{density:72*density}).resize(width,height).png().toBuffer();
      const {data,info} = await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const stats = alphaStats(data,info.width,info.height);
      const output = resolve(root, 'public/artwork/marks-ornaments-v1/png',file.palette,`${art.id}-r1-${file.optical_size}@${density}x.png`);
      await mkdir(dirname(output),{recursive:true});
      await writeFile(output,png);
      reports.push({asset_id:art.id, optical_size:file.optical_size, palette:file.palette,density,
        path:relative(root,output),width,height,sha256:sha(png),...stats});
    }
    // Large render is a drawing inspection only, never evidence of small-size quality.
    if (file.optical_size===24) {
      const png = await sharp(source,{density:576}).resize(file.width*8,192).png().toBuffer();
      const output = resolve(here,'specimens','details',`${art.id}-${file.palette}.png`);
      await mkdir(dirname(output),{recursive:true});
      await writeFile(output,png);
    }
  }
}
const output = {schema_version:1,renderer:'Sharp',versions:sharp.versions,
  svg_count:108,png_native_density_count:reports.length,
  checks:{source_hashes:'passed',nonempty_alpha:'passed',transparent_edges:'passed',
    actual_size_renders:'produced',browser:'not run',assistive_technology:'not run'},
  renders:reports};
await mkdir(resolve(here,'validation'),{recursive:true});
await writeFile(resolve(here,'validation','render-report.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({svg_count:108,native_density_pngs:reports.length,minimum_clear_edge_px:Math.min(...reports.map(r=>r.minimum_clear_edge_px)),renderer:sharp.versions.sharp}));
