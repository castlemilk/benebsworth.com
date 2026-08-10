/**
 * Shared prelude injected ahead of a model-generated artifact's own markup —
 * used both by the live srcdoc frame (ArtifactFrame, GeneratedDemo) and by the
 * static .html artifacts published by scripts/gen-benchmark-outputs. Keep these
 * paths on ONE implementation so the inline frame and the full-page viewer
 * behave identically.
 */

/** Whether an output is a self-contained HTML document we can render in a frame
 *  (vs. e.g. a bare React/JSX snippet a model returned instead of a page). */
export function isFullHtmlDoc(output: string): boolean {
  return /<!doctype\s+html|<html[\s>]/i.test(output.slice(0, 400))
}

/** A `<script type="text/babel">` block needs a runtime JSX compiler (Babel),
 *  which requires `unsafe-eval` — deliberately absent from the demo sandbox CSP.
 *  Well-formed ones are pre-compiled at build time; any that remain (e.g. a
 *  truncated artifact) can't run here, so we show a note instead of a blank frame. */
export function needsRuntimeCompiler(output: string): boolean {
  return /type=["']text\/babel["']/i.test(output)
}

// Injected into the artifact's <head> before its own markup. Five jobs:
//  1. a CSS reset + dark backdrop so the frame isn't a white/black void while
//     the demo's own CSS/scripts load, and so dumber-model artifacts that skip
//     <!DOCTYPE>/<head>/<body>/reset still lay out correctly;
//  2. an in-memory localStorage/sessionStorage shim — the frame runs with an
//     opaque origin (sandbox="allow-scripts", no allow-same-origin), where real
//     Storage access throws; without the shim a demo that reads localStorage at
//     startup would crash to a blank page;
//  3. a runtime-error reporter — broken artifacts otherwise fail to a silently
//     blank frame. The reporter renders an in-iframe red overlay so the user
//     sees the failure even when there's no parent listener (the static .html
//     artifact), AND forwards the FIRST error to the parent via postMessage
//     (the frame's origin is opaque, so '*' is the only usable target). The
//     parent iframe wrapper may show a non-blocking bar; either path is enough;
//  4. guarantees a viewport meta — without one, mobile frames lay the page out
//     at a ~980px CSS width and the artifact's own resize handling computes
//     the wrong canvas size;
//  5. auto-prepends <!DOCTYPE html> when the artifact omits it, since a
//     doctype after the first node still triggers quirks mode.
export const FRAME_PRELUDE = `<style>
html,body{margin:0;padding:0;min-height:100%;box-sizing:border-box;background:#0c0c10;color:#ececf0;font-family:ui-sans-serif,system-ui}
*,*::before,*::after{box-sizing:inherit}
#__llm-demo-error{display:none;position:fixed;top:0;left:0;right:0;z-index:2147483647;background:rgba(220,38,38,.96);color:#fff;padding:12px 16px;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;border-bottom:2px solid rgba(0,0,0,.4);box-shadow:0 2px 8px rgba(0,0,0,.3)}
</style>
<script>
(function(){try{window.localStorage.getItem('_');}catch(e){
var m={},s={getItem:function(k){return k in m?m[k]:null;},setItem:function(k,v){m[k]=String(v);},removeItem:function(k){delete m[k];},clear:function(){m={};},key:function(i){return Object.keys(m)[i]||null;}};
Object.defineProperty(s,'length',{get:function(){return Object.keys(m).length;}});
try{Object.defineProperty(window,'localStorage',{value:s,configurable:true});Object.defineProperty(window,'sessionStorage',{value:s,configurable:true});}catch(_){}
}})();
</script>
<script>
(function(){
var sent=false;
function show(msg){
  if(sent)return; sent=true;
  var m=String(msg||'Script error').slice(0,500);
  try{
    var d=document.getElementById('__llm-demo-error');
    if(!d){
      d=document.createElement('div');
      d.id='__llm-demo-error';
      d.setAttribute('role','alert');
      (document.body||document.documentElement).appendChild(d);
    }
    d.textContent='\\u26A0 ' + m;
    d.style.display='block';
  }catch(_){}
  try{parent.postMessage({__llmDemoError:m.slice(0,200)},'*');}catch(_){}
}
window.addEventListener('error',function(e){show((e&&e.message)||'Script error');});
window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;show(r&&r.message?r.message:(r||'Unhandled promise rejection'));});
})();
</script>`

/** Insert the prelude into the artifact's <head> (falling back to a synthesized
 *  <html>/<head>/<body> wrapper) so the document keeps standards mode instead
 *  of the quirks mode that a node before <!DOCTYPE> would trigger. Also
 *  guarantees a viewport meta — without one, mobile frames lay the page out at
 *  a ~980px CSS width and the artifact's own resize handling computes the
 *  wrong canvas size. */
export function withPrelude(html: string): string {
  // DOCTYPE must be the very first node — anything before it still triggers
  // quirks mode in HTML5 parsers. Most dumber-model artifacts skip it; auto-add.
  const hasDoctype = /^\s*<!doctype/i.test(html)
  const doctypePrefix = hasDoctype ? '' : '<!DOCTYPE html>\n'

  const viewport = /<meta[^>]*name=["']viewport["']/i.test(html)
    ? ''
    : '<meta name="viewport" content="width=device-width, initial-scale=1">'
  const prelude = viewport + FRAME_PRELUDE

  const head = html.match(/<head[^>]*>/i)
  if (head?.index !== undefined) {
    const at = head.index + head[0].length
    return doctypePrefix + html.slice(0, at) + prelude + html.slice(at)
  }
  const htmlTag = html.match(/<html[^>]*>/i)
  if (htmlTag?.index !== undefined) {
    const at = htmlTag.index + htmlTag[0].length
    return (
      doctypePrefix +
      html.slice(0, at) +
      '<head>' +
      prelude +
      '</head>' +
      html.slice(at)
    )
  }
  // No <head> and no <html> at all (bare canvas/script artifact) — synthesize
  // a full document so the parser has somewhere to put the prelude's <style>
  // and <script> blocks and so the artifact's content lives in <body>.
  return doctypePrefix + '<html><head>' + prelude + '</head><body>' + html + '</body></html>'
}
