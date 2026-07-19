/**
 * Shared prelude injected ahead of a model-generated artifact's own markup —
 * used both by the live srcdoc frame (GeneratedDemo) and by the static .html
 * artifacts published by scripts/gen-benchmark-outputs. Keep these paths on
 * ONE implementation so the inline frame and the full-page viewer behave
 * identically.
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

// Injected into the artifact's <head> before its own markup. Three jobs:
//  1. a dark backdrop so the frame isn't a white/black void while the demo's
//     own CSS/scripts load;
//  2. an in-memory localStorage/sessionStorage shim — the frame runs with an
//     opaque origin (sandbox="allow-scripts", no allow-same-origin), where real
//     Storage access throws; without the shim a demo that reads localStorage at
//     startup would crash to a blank page;
//  3. a runtime-error reporter — broken artifacts otherwise fail to a silently
//     blank frame. Only the FIRST error/unhandled rejection is forwarded to the
//     parent via postMessage (the frame's origin is opaque, so '*' is the only
//     usable target); the parent listener validates the payload shape.
export const FRAME_PRELUDE = `<style>html,body{margin:0;background:#0c0c10;color:#ececf0;font-family:ui-sans-serif,system-ui}</style>
<script>
(function(){try{window.localStorage.getItem('_');}catch(e){
var m={},s={getItem:function(k){return k in m?m[k]:null;},setItem:function(k,v){m[k]=String(v);},removeItem:function(k){delete m[k];},clear:function(){m={};},key:function(i){return Object.keys(m)[i]||null;}};
Object.defineProperty(s,'length',{get:function(){return Object.keys(m).length;}});
try{Object.defineProperty(window,'localStorage',{value:s,configurable:true});Object.defineProperty(window,'sessionStorage',{value:s,configurable:true});}catch(_){}
}})();
</script>
<script>
(function(){var sent=false;
function report(msg){if(sent)return;sent=true;try{parent.postMessage({__llmDemoError:String(msg).slice(0,200)},'*');}catch(_){}}
window.addEventListener('error',function(e){report((e&&e.message)||'Script error');});
window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;report(r&&r.message?r.message:(r||'Unhandled promise rejection'));});
})();
</script>`

/** Insert the prelude into the artifact's <head> (falling back to <html> or the
 *  top) so the document keeps standards mode instead of the quirks mode that a
 *  node before <!DOCTYPE> would trigger. */
/** Insert the prelude into the artifact's <head> (falling back to <html> or the
 *  top) so the document keeps standards mode instead of the quirks mode that a
 *  node before <!DOCTYPE> would trigger. Also guarantees a viewport meta —
 *  without one, mobile frames lay the page out at a ~980px CSS width and the
 *  artifact's own resize handling computes the wrong canvas size. */
export function withPrelude(html: string): string {
  const viewport = /<meta[^>]*name=["']viewport["']/i.test(html)
    ? ''
    : '<meta name="viewport" content="width=device-width, initial-scale=1">'
  const prelude = viewport + FRAME_PRELUDE
  const head = html.match(/<head[^>]*>/i)
  if (head?.index !== undefined) {
    const at = head.index + head[0].length
    return html.slice(0, at) + prelude + html.slice(at)
  }
  const htmlTag = html.match(/<html[^>]*>/i)
  if (htmlTag?.index !== undefined) {
    const at = htmlTag.index + htmlTag[0].length
    return html.slice(0, at) + '<head>' + prelude + '</head>' + html.slice(at)
  }
  return prelude + html
}
