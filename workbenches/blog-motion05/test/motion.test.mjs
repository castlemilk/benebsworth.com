import assert from "node:assert/strict";
import { test } from "node:test";
import { createFeedback } from "../motion.mjs";

class Events {
  listeners = new Map();
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type) { for (const callback of [...(this.listeners.get(type) ?? [])]) callback({ type }); }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
}

class MediaQuery extends Events {
  matches = false;
  set(value) { this.matches = value; this.emit("change"); }
}

class Animation {
  cancellations = 0;
  constructor({ rejectOnCancel = true } = {}) {
    this.rejectOnCancel = rejectOnCancel;
    this.finished = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
  }
  cancel() {
    this.cancellations++;
    if (this.rejectOnCancel) this.reject(new Error("Cancelled by the owner"));
  }
}

class Element {
  nodeType = 1;
  isConnected = true;
  children = [];
  parent = null;
  ownText = "";
  calls = [];
  constructor(document, name = "span", attributes = {}) {
    this.ownerDocument = document;
    this.localName = name;
    this.attributes = new Map(Object.entries(attributes));
  }
  hasAttribute(name) { return this.attributes.has(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  get textContent() { return this.ownText + this.children.map(child => child.textContent).join(""); }
  append(child) { child.parent = this; this.children.push(child); return child; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  querySelectorAll(selector) {
    assert.equal(selector, "*");
    return this.children.flatMap(child => [child, ...child.querySelectorAll("*")]);
  }
  animate(frames, options) {
    const animation = new Animation(this.animationOptions);
    this.calls.push({ frames, options, animation });
    return animation;
  }
}

function fixture() {
  const reduced = new MediaQuery();
  const forced = new MediaQuery();
  const document = new Events();
  document.hidden = false;
  document.visibilityState = "visible";
  document.setHidden = hidden => {
    document.hidden = hidden;
    document.visibilityState = hidden ? "hidden" : "visible";
    document.emit("visibilitychange");
  };
  const window = {
    matchMedia: query => {
      if (query === "(prefers-reduced-motion: reduce)") return reduced;
      if (query === "(forced-colors: active)") return forced;
      throw new Error(`Unexpected query: ${query}`);
    },
  };
  document.defaultView = window;
  const scope = new Element(document, "section");
  const decoration = (name = "span", attributes = {}) => scope.append(new Element(document, name, {
    "data-motion-decoration": "", "aria-hidden": "true", ...attributes,
  }));
  const target = decoration();
  return { reduced, forced, document, window, scope, target, decoration };
}

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test("one-shot feedback touches only the decorative animation layer", async () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  const originalAttributes = [...f.target.attributes];
  assert.deepEqual(feedback.policy(), { allowed: true, reason: "allowed" });
  for (const [cue, duration] of [["selection", 120], ["inspector", 160], ["art", 180], ["guide", 160]]) {
    assert.equal(feedback.play(f.target, cue), true);
    const call = f.target.calls.at(-1);
    assert.equal(call.options.duration, duration);
    assert.equal(call.options.fill, "none");
    assert.equal(call.options.delay, 0);
    assert.equal(call.options.iterations, 1);
    for (const frame of call.frames) {
      assert.ok(Object.keys(frame).every(property => ["opacity", "transform"].includes(property)));
      assert.ok(frame.opacity > 0 && frame.opacity <= 1);
      if (frame.transform) {
        const offset = Number(frame.transform.match(/^translateY\((\d+)px\)$/)?.[1]);
        assert.ok(Number.isFinite(offset) && offset <= 3);
      }
    }
    assert.equal(call.frames.at(-1).opacity, 1);
    call.animation.resolve();
    await flush();
  }
  assert.deepEqual([...f.target.attributes], originalAttributes);
  assert.equal(f.target.textContent, "");
  feedback.dispose();
  assert.ok(f.target.calls.every(call => call.animation.cancellations === 0), "completed effects are no longer tracked");
});

test("live reduced-motion restriction cancels all owned effects and does not replay", async () => {
  const f = fixture();
  const second = f.decoration();
  const feedback = createFeedback(f.scope);
  feedback.play(f.target, "art");
  feedback.play(second, "inspector");
  f.reduced.set(true);
  assert.equal(f.target.calls[0].animation.cancellations, 1);
  assert.equal(second.calls[0].animation.cancellations, 1);
  assert.equal(feedback.play(f.target, "art"), false);
  assert.equal(feedback.policy().reason, "reduced-motion");
  f.reduced.set(false);
  assert.equal(f.target.calls.length, 1);
  assert.equal(second.calls.length, 1);
  assert.equal(feedback.play(f.target, "selection"), true);
  feedback.dispose();
  await flush();
});

test("forced colours and document hiding settle feedback without replay on return", async () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  feedback.play(f.target, "guide");
  f.forced.set(true);
  assert.equal(f.target.calls[0].animation.cancellations, 1);
  assert.equal(feedback.policy().reason, "forced-colors");
  f.forced.set(false);
  assert.equal(f.target.calls.length, 1);
  feedback.play(f.target, "guide");
  f.document.setHidden(true);
  assert.equal(f.target.calls[1].animation.cancellations, 1);
  assert.equal(feedback.policy().reason, "hidden-document");
  f.document.setHidden(false);
  assert.equal(f.target.calls.length, 2);
  feedback.dispose();
  await flush();
});

test("unknown or initially restricted platform state remains static", () => {
  const scenarios = [
    f => { f.reduced.matches = true; },
    f => { f.forced.matches = true; },
    f => { f.document.setHidden(true); },
    f => { f.reduced.matches = undefined; },
    f => { f.document.visibilityState = undefined; },
    f => { f.document.hidden = undefined; },
    f => { f.window.matchMedia = undefined; },
    f => { f.window.matchMedia = () => { throw new Error("Unavailable"); }; },
    f => { f.forced.addEventListener = undefined; },
    f => { f.document.removeEventListener = undefined; },
  ];
  for (const change of scenarios) {
    const f = fixture(); change(f);
    const feedback = createFeedback(f.scope);
    assert.equal(feedback.policy().allowed, false);
    assert.equal(feedback.play(f.target, "selection"), false);
    assert.equal(f.target.calls.length, 0);
    feedback.dispose();
  }
});

test("partial listener setup failure removes every previously registered listener", () => {
  const f = fixture();
  f.forced.addEventListener = function (type, callback) {
    Events.prototype.addEventListener.call(this, type, callback);
    throw new Error("Setup interrupted");
  };
  const feedback = createFeedback(f.scope);
  assert.equal(feedback.policy().allowed, false);
  assert.equal(f.reduced.count("change"), 0);
  assert.equal(f.forced.count("change"), 0);
  assert.equal(f.document.count("visibilitychange"), 0);
  feedback.dispose();
});

test("a replacement mount disposes the old owner and retains only one listener set", async () => {
  const f = fixture();
  const first = createFeedback(f.scope);
  first.play(f.target, "art");
  const second = createFeedback(f.scope);
  assert.equal(first.policy().reason, "disposed");
  assert.equal(first.play(f.target, "art"), false);
  assert.equal(f.target.calls[0].animation.cancellations, 1);
  assert.equal(f.reduced.count("change"), 1);
  assert.equal(f.forced.count("change"), 1);
  assert.equal(f.document.count("visibilitychange"), 1);
  first.dispose();
  second.play(f.target, "selection");
  f.reduced.set(true);
  assert.equal(f.target.calls[1].animation.cancellations, 1);
  second.dispose();
  await flush();
});

test("dispose is idempotent, cancels once and removes all owned listeners", async () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  feedback.play(f.target, "inspector");
  feedback.dispose(); feedback.dispose();
  f.reduced.set(true); f.forced.set(true); f.document.setHidden(true);
  assert.equal(f.target.calls[0].animation.cancellations, 1);
  assert.equal(f.reduced.count("change"), 0);
  assert.equal(f.forced.count("change"), 0);
  assert.equal(f.document.count("visibilitychange"), 0);
  assert.equal(feedback.play(f.target, "selection"), false);
  await flush();
});

test("separate scope ownership never cancels another mounted workbench", async () => {
  const f = fixture();
  const otherScope = new Element(f.document, "section");
  const otherTarget = otherScope.append(new Element(f.document, "span", {
    "data-motion-decoration": "", "aria-hidden": "true",
  }));
  const first = createFeedback(f.scope);
  const second = createFeedback(otherScope);
  first.play(f.target, "selection"); second.play(otherTarget, "selection");
  assert.equal(first.play(otherTarget, "selection"), false);
  first.dispose();
  assert.equal(otherTarget.calls[0].animation.cancellations, 0);
  assert.equal(f.reduced.count("change"), 1);
  second.dispose();
  await flush();
});

test("rapid replacement survives late successful completion of the previous effect", async () => {
  const f = fixture();
  f.target.animationOptions = { rejectOnCancel: false };
  const feedback = createFeedback(f.scope);
  feedback.play(f.target, "art");
  const first = f.target.calls[0].animation;
  feedback.play(f.target, "inspector");
  const second = f.target.calls[1].animation;
  assert.equal(first.cancellations, 1);
  first.resolve(); await flush();
  f.reduced.set(true);
  assert.equal(second.cancellations, 1);
  second.resolve();
  feedback.dispose();
});

test("cancellation rejection from an old effect cannot remove its replacement", async () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  feedback.play(f.target, "art");
  feedback.play(f.target, "selection");
  await flush();
  f.document.setHidden(true);
  assert.equal(f.target.calls[1].animation.cancellations, 1);
  feedback.dispose();
  await flush();
});

test("unsupported or throwing animate leaves final host content untouched", () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  const originalAttributes = [...f.target.attributes];
  f.target.animate = undefined;
  assert.equal(feedback.play(f.target, "art"), false);
  f.target.animate = () => { throw new Error("Animation unavailable"); };
  assert.equal(feedback.play(f.target, "art"), false);
  assert.deepEqual([...f.target.attributes], originalAttributes);
  feedback.dispose();
});

test("an uncontrollable returned effect is cancelled and not accepted", () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  let cancellations = 0;
  f.target.animate = () => ({ cancel() { cancellations++; } });
  assert.equal(feedback.play(f.target, "selection"), false);
  assert.equal(cancellations, 1);
  feedback.dispose();
});

test("only explicit connected targets inside the same document are eligible", () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  const outside = new Element(f.document, "span", { "data-motion-decoration": "", "aria-hidden": "true" });
  assert.equal(feedback.play(outside, "selection"), false);
  f.target.isConnected = false;
  assert.equal(feedback.play(f.target, "selection"), false);
  f.target.isConnected = true;
  f.target.ownerDocument = {};
  assert.equal(feedback.play(f.target, "selection"), false);
  assert.equal(f.target.calls.length, 0);
  feedback.dispose();
});

test("semantic, focusable and textual elements cannot become feedback targets", () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  const cases = [
    f.decoration("button"), f.decoration("a"), f.decoration("p"),
    f.decoration("span", { role: "status" }),
    f.decoration("span", { tabindex: "-1" }),
    f.decoration("span", { contenteditable: "true" }),
    f.decoration("span", { "aria-live": "polite" }),
    f.decoration("span", { "aria-label": "Information" }),
    f.decoration("img", { alt: "Informative category illustration" }),
    f.decoration("span", { "aria-hidden": "false" }),
  ];
  const text = f.decoration(); text.ownText = "Immediately readable title"; cases.push(text);
  const wrapper = f.decoration(); wrapper.append(new Element(f.document, "button")); cases.push(wrapper);
  const unmarked = f.decoration(); unmarked.attributes.delete("data-motion-decoration"); cases.push(unmarked);
  for (const target of cases) {
    assert.equal(feedback.play(target, "inspector"), false, `${target.localName} must stay semantic/static`);
    assert.equal(target.calls.length, 0);
  }
  feedback.dispose();
});

test("a decorative SVG group or empty-alt image is eligible without semantic writes", async () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  const svg = f.decoration("svg");
  svg.append(new Element(f.document, "path"));
  const image = f.decoration("img", { alt: "" });
  assert.equal(feedback.play(svg, "selection"), true);
  assert.equal(feedback.play(image, "art"), true);
  feedback.dispose();
  await flush();
});

test("invalid cues do not disturb an already running valid feedback effect", async () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  feedback.play(f.target, "selection");
  for (const cue of ["orbit", "toString", "__proto__", "", undefined]) {
    assert.equal(feedback.play(f.target, cue), false);
  }
  assert.equal(f.target.calls.length, 1);
  assert.equal(f.target.calls[0].animation.cancellations, 0);
  feedback.dispose();
  await flush();
});

test("current restrictions are rechecked even if no platform change event arrived", async () => {
  const f = fixture();
  const feedback = createFeedback(f.scope);
  feedback.play(f.target, "selection");
  f.reduced.matches = true;
  assert.equal(feedback.play(f.target, "selection"), false);
  assert.equal(f.target.calls[0].animation.cancellations, 1);
  feedback.dispose();
  await flush();
});

test("invalid and disconnected scopes fail safely without starting effects", () => {
  const invalid = createFeedback(null);
  assert.deepEqual(invalid.policy(), { allowed: false, reason: "invalid-scope" });
  assert.equal(invalid.play(null, "selection"), false);
  invalid.dispose(); invalid.dispose();
  const f = fixture();
  const feedback = createFeedback(f.scope);
  f.scope.isConnected = false;
  assert.equal(feedback.policy().reason, "disconnected-scope");
  assert.equal(feedback.play(f.target, "selection"), false);
  feedback.dispose();
});
