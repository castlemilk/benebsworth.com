/**
 * Presentation utilities for the isolated Knowledge Folio prototype.
 *
 * These functions consume a supplied snapshot. They neither create graph
 * relationships nor normalize concept/tag identities. Unknown IDs survive URL
 * parsing so the view can explain unavailable records instead of substituting
 * unrelated content.
 */

export const DEFAULT_ROOT_ID = "concept:logistic-map:proposal";

const MAX_ID_LENGTH = 500;
const MAX_QUERY_LENGTH = 300;
const MAX_WINDOW_SIZE = 500;
const VIEWS = new Set(["neighbourhood", "list", "categories"]);
const SCOPES = new Set(["collection", "neighbours"]);
const THEMES = new Set(["light", "dark"]);
const PARAMETERS = {
  view: "kgView",
  scope: "kgScope",
  rootId: "kgRoot",
  selectedId: "kgSelected",
  query: "kgQ",
  kind: "kgKind",
  categoryId: "kgCategory",
  page: "kgPage",
  fixture: "kgFixture",
  theme: "kgTheme",
};

function bounded(value, maximum, fallback = "") {
  return typeof value === "string" ? value.slice(0, maximum) : fallback;
}

function asURL(value) {
  return new URL(value instanceof URL ? value.href : String(value), "https://knowledge.invalid/");
}

function positivePage(value) {
  const text = String(value ?? "");
  if (!/^\d+$/.test(text)) return 1;
  const number = Number(text);
  if (number < 1) return 1;
  return Math.min(number, Number.MAX_SAFE_INTEGER);
}

function windowSize(value, fallback, allowZero = false) {
  return Number.isInteger(value) && value >= (allowZero ? 0 : 1)
    ? Math.min(value, MAX_WINDOW_SIZE)
    : fallback;
}

function normalizeState(value, defaultRootId) {
  const rootId = bounded(value.rootId, MAX_ID_LENGTH, bounded(defaultRootId, MAX_ID_LENGTH));
  return {
    view: VIEWS.has(value.view) ? value.view : "neighbourhood",
    scope: SCOPES.has(value.scope) ? value.scope : "collection",
    rootId,
    selectedId: value.selectedId === null
      ? null
      : bounded(value.selectedId, MAX_ID_LENGTH, rootId),
    query: bounded(value.query, MAX_QUERY_LENGTH),
    kind: bounded(value.kind, MAX_ID_LENGTH),
    categoryId: bounded(value.categoryId, MAX_ID_LENGTH),
    page: positivePage(value.page),
    fixture: bounded(value.fixture, MAX_ID_LENGTH, "source"),
    theme: THEMES.has(value.theme) ? value.theme : "light",
  };
}

/**
 * Parse namespaced view state without consulting the snapshot.
 *
 * An omitted selection defaults to the requested root; kgSelected= explicitly
 * closes the inspector. Empty kind/category filters mean all. Known enum
 * values and page syntax are validated, but unavailable IDs/filter values are
 * intentionally preserved. String limits bound hostile URLs, not graph data.
 */
export function readViewState(url, defaultRootId = DEFAULT_ROOT_ID) {
  const params = asURL(url).searchParams;
  const rootId = params.has(PARAMETERS.rootId)
    ? params.get(PARAMETERS.rootId)
    : defaultRootId;
  const selected = params.has(PARAMETERS.selectedId)
    ? params.get(PARAMETERS.selectedId)
    : rootId;
  return normalizeState({
    view: params.get(PARAMETERS.view),
    scope: params.get(PARAMETERS.scope),
    rootId,
    selectedId: selected === "" ? null : selected,
    query: params.get(PARAMETERS.query),
    kind: params.get(PARAMETERS.kind),
    categoryId: params.get(PARAMETERS.categoryId),
    page: params.get(PARAMETERS.page),
    fixture: params.has(PARAMETERS.fixture) ? params.get(PARAMETERS.fixture) : "source",
    theme: params.get(PARAMETERS.theme),
  }, defaultRootId);
}

/**
 * Build a native-link href for a deliberate view transition.
 *
 * This does not mutate history. The caller owns pushState/replaceState and
 * popstate handling. A root patch does not implicitly change selection.
 * Unrelated query parameters (including duplicate keys), pathname and hash
 * survive. Defaults are omitted, except a closed selection is always explicit.
 */
export function buildViewHref(url, patch = {}, defaultRootId = DEFAULT_ROOT_ID) {
  const parsed = asURL(url);
  const current = readViewState(parsed, defaultRootId);
  const merged = { ...current };
  for (const key of Object.keys(PARAMETERS)) {
    if (Object.hasOwn(patch, key) && patch[key] !== undefined) merged[key] = patch[key];
  }
  const next = normalizeState(merged, defaultRootId);
  const defaults = {
    view: "neighbourhood",
    scope: "collection",
    rootId: bounded(defaultRootId, MAX_ID_LENGTH),
    selectedId: next.rootId,
    query: "",
    kind: "",
    categoryId: "",
    page: 1,
    fixture: "source",
    theme: "light",
  };
  for (const [key, parameter] of Object.entries(PARAMETERS)) {
    if (next[key] === defaults[key]) parsed.searchParams.delete(parameter);
    else parsed.searchParams.set(parameter, next[key] === null ? "" : String(next[key]));
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function snapshotNodes(snapshot) {
  return Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
}

function snapshotEdges(snapshot) {
  return Array.isArray(snapshot?.edges) ? snapshot.edges : [];
}

function validNode(node) {
  return node && typeof node.id === "string" && node.id.length > 0;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareNodes(left, right) {
  return compareText(String(left.kind ?? ""), String(right.kind ?? ""))
    || compareText(String(left.label ?? "").toLowerCase(), String(right.label ?? "").toLowerCase())
    || compareText(left.id, right.id);
}

/**
 * Index original records without adding edges or coalescing equivalent labels.
 * Adjacency is incident-edge lookup in either direction; original direction,
 * relation labels and provenance remain untouched on every edge.
 *
 * Duplicate IDs retain the first record deterministically and are reported.
 * Dangling/invalid edges are reported, never converted to invented nodes.
 */
export function indexSnapshot(snapshot) {
  const byId = new Map();
  const adjacency = new Map();
  const duplicateNodeIds = [];
  for (const node of snapshotNodes(snapshot)) {
    if (!validNode(node)) continue;
    if (byId.has(node.id)) {
      duplicateNodeIds.push(node.id);
      continue;
    }
    byId.set(node.id, node);
    adjacency.set(node.id, []);
  }
  let danglingEdges = 0;
  let invalidEdges = 0;
  for (const edge of snapshotEdges(snapshot)) {
    if (!edge || typeof edge.source !== "string" || typeof edge.target !== "string") {
      invalidEdges += 1;
      continue;
    }
    if (!byId.has(edge.source) || !byId.has(edge.target)) danglingEdges += 1;
    if (adjacency.has(edge.source)) adjacency.get(edge.source).push(edge);
    if (edge.target !== edge.source && adjacency.has(edge.target)) adjacency.get(edge.target).push(edge);
  }
  return { byId, adjacency, duplicateNodeIds, danglingEdges, invalidEdges };
}

/**
 * Return existing one-hop neighbours of a root, in stable kind/label/ID order.
 * nodeIds excludes the root. edges contains only original incident edges whose
 * endpoints are visible (including an original self-loop, if one exists).
 * shown/truncated describe this bounded local slice, never global completeness.
 *
 * Partial snapshots have total=null. A future adapter may supply an explicit
 * neighbourhoodTotals[rootId] integer; it is used only if it is at least the
 * number of existing neighbours in the snapshot. Counts describe recorded
 * neighbours, not scientific equivalence or strength of evidence.
 */
export function getNeighbourhood(snapshot, index, rootId, limit = 6) {
  const lookup = index ?? indexSnapshot(snapshot);
  const root = lookup.byId.get(rootId) ?? null;
  if (!root) {
    return { root: null, nodeIds: [], edges: [], total: null, shown: 0, truncated: false, danglingEdges: 0 };
  }
  const incident = lookup.adjacency.get(rootId) ?? [];
  const neighbourIds = new Set();
  let danglingEdges = 0;
  for (const edge of incident) {
    const otherId = edge.source === rootId ? edge.target : edge.source;
    if (!lookup.byId.has(otherId)) danglingEdges += 1;
    else if (otherId !== rootId) neighbourIds.add(otherId);
  }
  const neighbours = [...neighbourIds].map(id => lookup.byId.get(id)).sort(compareNodes);
  const nodeIds = neighbours.slice(0, windowSize(limit, 6, true)).map(node => node.id);
  const visibleIds = new Set([rootId, ...nodeIds]);
  const edges = incident.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const providedTotal = Object.hasOwn(snapshot?.neighbourhoodTotals ?? {}, rootId)
    ? snapshot.neighbourhoodTotals[rootId]
    : null;
  const validProvidedTotal = Number.isSafeInteger(providedTotal) && providedTotal >= neighbours.length;
  const total = snapshot?.status === "partial"
    ? (validProvidedTotal ? providedTotal : null)
    : neighbours.length;
  return {
    root,
    nodeIds,
    edges,
    total,
    shown: nodeIds.length,
    truncated: neighbours.length > nodeIds.length || (total !== null && total > nodeIds.length),
    danglingEdges,
  };
}

/**
 * Search available nodes without changing the inspector selection.
 * Terms match case-insensitively across label, summary and tags; every term is
 * required. kind and taxonomyIds filters are exact. The optional neighbours
 * scope includes unique existing one-hop neighbours of the requested root,
 * excludes the root itself, and never converts dangling edges to records.
 * Totals/pages refer to
 * matching records in this supplied snapshot, whose disclosure/status must be
 * presented separately. An unavailable page remains empty and outOfRange;
 * callers can offer recovery rather than silently returning a different page.
 */
export function queryNodes(snapshot, state, pageSize = 12) {
  const query = bounded(state?.query, MAX_QUERY_LENGTH).trim().toLowerCase();
  const terms = query ? query.split(/\s+/u) : [];
  const kind = bounded(state?.kind, MAX_ID_LENGTH);
  const categoryId = bounded(state?.categoryId, MAX_ID_LENGTH);
  let scopeIds = null;
  if (state?.scope === "neighbours") {
    scopeIds = new Set();
    const lookup = indexSnapshot(snapshot);
    const rootId = bounded(state?.rootId, MAX_ID_LENGTH);
    if (lookup.byId.has(rootId)) {
      for (const edge of lookup.adjacency.get(rootId) ?? []) {
        const otherId = edge.source === rootId ? edge.target : edge.source;
        if (otherId !== rootId && lookup.byId.has(otherId)) scopeIds.add(otherId);
      }
    }
  }
  const seen = new Set();
  const matching = snapshotNodes(snapshot).filter(node => {
    if (!validNode(node) || seen.has(node.id)) return false;
    seen.add(node.id);
    if (scopeIds && !scopeIds.has(node.id)) return false;
    if (kind && node.kind !== kind) return false;
    if (categoryId && !(Array.isArray(node.taxonomyIds) && node.taxonomyIds.includes(categoryId))) return false;
    const haystack = [node.label ?? "", node.summary ?? "", ...(Array.isArray(node.tags) ? node.tags : [])]
      .join("\n").toLowerCase();
    return terms.every(term => haystack.includes(term));
  }).sort(compareNodes);
  const total = matching.length;
  const size = windowSize(pageSize, 12);
  const pages = Math.ceil(total / size);
  const page = positivePage(state?.page);
  const outOfRange = page > Math.max(1, pages);
  const items = outOfRange ? [] : matching.slice((page - 1) * size, page * size);
  return { items, total, pages, page, outOfRange };
}

/** Return an original safe source href, or null; never invent a replacement. */
export function safeSourceHref(value) {
  if (typeof value !== "string" || !value || value.length > 8192) return null;
  const hasControlCharacter = [...value].some(character => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (value.trim() !== value || hasControlCharacter || value.includes("\\")) return null;
  const rootRelative = value.startsWith("/") && !value.startsWith("//");
  if (!rootRelative && !/^https?:\/\//i.test(value)) return null;
  try {
    const parsed = asURL(value);
    if (!new Set(["http:", "https:"]).has(parsed.protocol) || parsed.username || parsed.password) return null;
    return value;
  } catch {
    return null;
  }
}
