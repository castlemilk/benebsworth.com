/**
 * Optional feedback for explicitly decorative, noninteractive elements.
 *
 * The host renders the final state before calling this module. Selection, text,
 * focus, history, scrolling and data never wait for an animation. Hosts must
 * keep decoration pointer-transparent and call dispose() on route/unmount.
 */

const mounts = new WeakMap();
const cues = Object.freeze({
  selection: { duration: 120, offset: 0 },
  inspector: { duration: 160, offset: 3 },
  art: { duration: 180, offset: 3 },
  guide: { duration: 160, offset: 2 },
});
const decorationNames = new Set([
  "span", "div", "svg", "g", "path", "circle", "rect", "line",
  "polyline", "polygon", "ellipse", "use", "img",
]);
const semanticAttributes = [
  "tabindex", "role", "aria-live", "aria-label", "aria-labelledby",
  "aria-describedby", "aria-current", "aria-selected", "aria-pressed",
  "aria-expanded", "aria-controls",
];

function isDecorationNode(node) {
  if (node?.nodeType !== 1 || typeof node.getAttribute !== "function") return false;
  const name = node.localName?.toLowerCase();
  if (!decorationNames.has(name)) return false;
  if (semanticAttributes.some(attribute => node.hasAttribute(attribute))) return false;
  if (node.hasAttribute("contenteditable") && node.getAttribute("contenteditable") !== "false") return false;
  // An informative image must remain in the semantic, immediately readable layer.
  if (name === "img" && node.getAttribute("alt") !== "") return false;
  return true;
}

function canAnimateDecoration(scope, target, documentObject) {
  try {
    if (!target || target.isConnected !== true || target.ownerDocument !== documentObject) return false;
    if (!scope.contains(target) || !target.hasAttribute("data-motion-decoration")) return false;
    if (target.getAttribute("aria-hidden") !== "true" || !isDecorationNode(target)) return false;
    if (target.textContent?.trim() || typeof target.querySelectorAll !== "function") return false;
    return [...target.querySelectorAll("*")].every(isDecorationNode);
  } catch {
    return false;
  }
}

/**
 * Create one feedback owner for a connected Element scope.
 *
 * A second mount on the same scope disposes the previous owner. Missing or
 * unknown preference/visibility APIs leave the host static. Changing a
 * restriction cancels owned effects; clearing it never replays them.
 *
 * @param {Element} scope Root containing only this owner's animation targets.
 * @param {{window?: Window, document?: Document}} [options] Injectable platform.
 * @returns {{play: (target: Element, cue: "selection" | "inspector" | "art" | "guide") => boolean, dispose: () => void, policy: () => {allowed: boolean, reason: string}}}
 * play() returns true only when it starts a controllable one-shot animation.
 * false means the already-visible final state remains the complete result.
 * policy() reports environmental eligibility; play() also validates the target
 * and its animation capability before starting anything.
 */
export function createFeedback(scope, {
  window: windowObject = scope?.ownerDocument?.defaultView,
  document: documentObject = scope?.ownerDocument,
} = {}) {
  const validScope = scope?.nodeType === 1 && typeof scope.contains === "function";
  if (validScope) mounts.get(scope)?.dispose();

  const active = new Map();
  const removeListeners = [];
  let disposed = false;
  let capabilityReason = validScope ? null : "invalid-scope";
  let reduced;
  let forced;

  function cancelAnimation(animation) {
    try { animation.cancel(); } catch { /* A failed platform effect cannot block cleanup. */ }
  }

  function cancelTarget(target) {
    const current = active.get(target);
    if (!current) return;
    active.delete(target);
    cancelAnimation(current.animation);
  }

  function cancelAll() {
    const owned = [...active.values()];
    active.clear();
    for (const current of owned) cancelAnimation(current.animation);
  }

  function policy() {
    if (disposed) return { allowed: false, reason: "disposed" };
    if (capabilityReason) return { allowed: false, reason: capabilityReason };
    if (scope.isConnected !== true) return { allowed: false, reason: "disconnected-scope" };
    try {
      if (typeof reduced.matches !== "boolean" || typeof forced.matches !== "boolean") {
        return { allowed: false, reason: "unknown-preferences" };
      }
      if (reduced.matches) return { allowed: false, reason: "reduced-motion" };
      if (forced.matches) return { allowed: false, reason: "forced-colors" };
      if (typeof documentObject.hidden !== "boolean" || !["visible", "hidden"].includes(documentObject.visibilityState)) {
        return { allowed: false, reason: "unknown-visibility" };
      }
      if (documentObject.hidden || documentObject.visibilityState !== "visible") {
        return { allowed: false, reason: "hidden-document" };
      }
      return { allowed: true, reason: "allowed" };
    } catch {
      return { allowed: false, reason: "unavailable-platform-state" };
    }
  }

  function onRestrictionChange() {
    if (!policy().allowed) cancelAll();
  }

  function listen(target, event) {
    if (typeof target?.addEventListener !== "function" || typeof target?.removeEventListener !== "function") {
      throw new TypeError("Change observation is unavailable");
    }
    // Register cleanup first, including platforms that throw after adding.
    removeListeners.push(() => target.removeEventListener(event, onRestrictionChange));
    target.addEventListener(event, onRestrictionChange);
  }

  function clearListeners() {
    for (const remove of removeListeners.splice(0)) {
      try { remove(); } catch { /* Finish removing every other owned listener. */ }
    }
  }

  if (!capabilityReason) {
    try {
      if (typeof windowObject?.matchMedia !== "function") throw new TypeError("Media preferences are unavailable");
      reduced = windowObject.matchMedia("(prefers-reduced-motion: reduce)");
      forced = windowObject.matchMedia("(forced-colors: active)");
      if (typeof reduced?.matches !== "boolean" || typeof forced?.matches !== "boolean") {
        capabilityReason = "unknown-preferences";
      } else {
        listen(reduced, "change");
        listen(forced, "change");
        listen(documentObject, "visibilitychange");
      }
    } catch {
      capabilityReason = "unsupported-observation";
      clearListeners();
    }
  }

  function play(target, cue) {
    if (!policy().allowed) { cancelAll(); return false; }
    const preset = Object.hasOwn(cues, cue) ? cues[cue] : null;
    if (!preset || !canAnimateDecoration(scope, target, documentObject)) return false;
    cancelTarget(target);
    if (typeof target.animate !== "function") return false;

    let animation;
    try {
      const frames = preset.offset === 0
        ? [{ opacity: 0.45 }, { opacity: 1 }]
        : [{ opacity: 0.55, transform: `translateY(${preset.offset}px)` }, { opacity: 1, transform: "translateY(0px)" }];
      animation = target.animate(frames, {
        duration: preset.duration,
        easing: "ease-out",
        delay: 0,
        iterations: 1,
        fill: "none",
      });
      const finished = animation?.finished;
      if (typeof animation?.cancel !== "function" || typeof finished?.then !== "function") {
        if (typeof animation?.cancel === "function") cancelAnimation(animation);
        return false;
      }
      const current = { animation };
      active.set(target, current);
      const settle = () => {
        // A cancelled older effect may settle after a newer play on this target.
        if (active.get(target) === current) active.delete(target);
      };
      // Both completion and cancellation are consumed; neither changes host state.
      Promise.resolve(finished).then(settle, settle);
      return true;
    } catch {
      if (typeof animation?.cancel === "function") cancelAnimation(animation);
      return false;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAll();
    clearListeners();
    if (validScope && mounts.get(scope) === controller) mounts.delete(scope);
  }

  const controller = Object.freeze({ play, dispose, policy });
  if (validScope) mounts.set(scope, controller);
  return controller;
}
