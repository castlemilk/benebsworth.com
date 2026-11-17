import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ROOT_ID,
  readViewState,
  buildViewHref,
  indexSnapshot,
  getNeighbourhood,
  queryNodes,
  safeSourceHref,
} from "./view-state.mjs";

const node = (id, kind, label, extra = {}) => ({ id, kind, label, summary: "", taxonomyIds: [], ...extra });
const edge = (id, source, target, extra = {}) => ({ id, source, target, kind: "tag", label: "tagged with", ...extra });
const snapshot = (nodes = [], edges = [], extra = {}) => ({ status: "ready", nodes, edges, ...extra });
const defaultState = (patch = {}) => ({ ...readViewState("/prototype/"), ...patch });

test("omitted URL state selects the default root without assuming graph availability", () => {
  assert.deepEqual(readViewState("/prototype/"), {
    view: "neighbourhood", scope: "collection", rootId: DEFAULT_ROOT_ID, selectedId: DEFAULT_ROOT_ID,
    query: "", kind: "", categoryId: "", page: 1, fixture: "source", theme: "light",
  });
  assert.equal(readViewState("/prototype/", "unknown:root").rootId, "unknown:root");
});

test("explicitly empty selection closes the inspector and survives canonical links", () => {
  const state = readViewState("/prototype/?kgRoot=tag%3Achaos&kgSelected=");
  assert.equal(state.rootId, "tag:chaos");
  assert.equal(state.selectedId, null);
  assert.equal(readViewState(buildViewHref("/prototype/", { selectedId: null })).selectedId, null);
});

test("opaque reserved and Unicode identities round-trip without tag/concept normalization", () => {
  const rootId = "concept:μ & Ω / ? # + % = : Logistic Map";
  const selectedId = "tag:μ & Ω / ? # + % = : logistic-map";
  const href = buildViewHref("/prototype/index.html", { rootId, selectedId, categoryId: "lab-category:Control & Signals" });
  const read = readViewState(href);
  assert.equal(read.rootId, rootId);
  assert.equal(read.selectedId, selectedId);
  assert.equal(read.categoryId, "lab-category:Control & Signals");
});

test("unknown IDs and filters survive while hostile string lengths are bounded", () => {
  const url = new URL("https://example.test/prototype/");
  url.searchParams.set("kgRoot", "r".repeat(700));
  url.searchParams.set("kgSelected", "s".repeat(700));
  url.searchParams.set("kgQ", "q".repeat(400));
  url.searchParams.set("kgKind", "not-a-registered-kind");
  url.searchParams.set("kgCategory", "unknown:taxonomy");
  const read = readViewState(url);
  assert.equal(read.rootId.length, 500);
  assert.equal(read.selectedId.length, 500);
  assert.equal(read.query.length, 300);
  assert.equal(read.kind, "not-a-registered-kind");
  assert.equal(read.categoryId, "unknown:taxonomy");
});

test("invalid known enums and invalid page syntax use safe presentation defaults", () => {
  for (const page of ["0", "-2", "1.5", "NaN", "1e3", "Infinity"]) {
    const state = readViewState(`/prototype/?kgView=canvas&kgTheme=sepia&kgPage=${page}`);
    assert.equal(state.view, "neighbourhood");
    assert.equal(state.theme, "light");
    assert.equal(state.page, 1);
  }
  assert.equal(readViewState("/prototype/?kgPage=999999999999999999999999").page, Number.MAX_SAFE_INTEGER);
});

test("changing root preserves selection until the caller explicitly changes it", () => {
  const initial = "/prototype/?kgRoot=concept%3Aold&kgSelected=blog%3Aarticle";
  const next = readViewState(buildViewHref(initial, { rootId: "concept:new" }));
  assert.equal(next.rootId, "concept:new");
  assert.equal(next.selectedId, "blog:article");
  const implicitSelection = readViewState(buildViewHref("/prototype/?kgRoot=concept%3Aold", { rootId: "concept:new" }));
  assert.equal(implicitSelection.selectedId, "concept:old");
});

test("native hrefs preserve the prototype path, duplicate foreign query keys and hash", () => {
  const result = buildViewHref("https://example.test/nested/prototype/index.html?utm=folio&facet=a&facet=b#evidence", { view: "list", query: "chaos maps" });
  const url = new URL(result, "https://example.test");
  assert.equal(url.pathname, "/nested/prototype/index.html");
  assert.deepEqual(url.searchParams.getAll("facet"), ["a", "b"]);
  assert.equal(url.searchParams.get("utm"), "folio");
  assert.equal(url.hash, "#evidence");
  assert.equal(readViewState(url).query, "chaos maps");
});

test("serializable journey entries recover exact root, selection, filters and page", () => {
  const entries = ["/prototype/?campaign=reader#folio"];
  for (const patch of [
    { view: "list", query: "logistic", kind: "blog" },
    { selectedId: "blog:logistic-map", page: 2 },
    { view: "neighbourhood", rootId: "tag:chaos" },
    { selectedId: "lab:logistic-map", theme: "dark" },
  ]) entries.push(buildViewHref(entries.at(-1), patch));
  const states = entries.map(href => readViewState(href));
  for (let cursor = entries.length - 1; cursor >= 0; cursor -= 1) {
    assert.deepEqual(readViewState(entries[cursor]), states[cursor]);
  }
  assert.equal(states[4].rootId, "tag:chaos");
  assert.equal(states[4].selectedId, "lab:logistic-map");
  assert.equal(states[4].page, 2);
  // This is URL-state regression evidence, not an executed browser-history test.
});

test("huge valid page values remain explicit out-of-range requests without overflow slicing", () => {
  const result = queryNodes(snapshot([node("a", "blog", "Article")]), defaultState({ page: Number.MAX_SAFE_INTEGER }), 12);
  assert.equal(result.page, Number.MAX_SAFE_INTEGER);
  assert.equal(result.outOfRange, true);
  assert.deepEqual(result.items, []);
});

test("index reports duplicate identities and dangling edges without fabricating records", () => {
  const first = node("same", "concept", "Original");
  const data = snapshot([first, node("same", "tag", "Duplicate"), node("solo", "study", "Alone")], [
    edge("dangling", "same", "missing"),
    { id: "invalid", source: "same" },
  ]);
  const index = indexSnapshot(data);
  assert.equal(index.byId.get("same"), first);
  assert.equal(index.byId.has("missing"), false);
  assert.deepEqual(index.duplicateNodeIds, ["same"]);
  assert.equal(index.danglingEdges, 1);
  assert.equal(index.invalidEdges, 1);
  assert.deepEqual(index.adjacency.get("solo"), []);
});

test("neighbourhood uses only original one-hop edges and stable kind, label, identity order", () => {
  const data = snapshot([
    node("root", "concept", "Root"), node("z", "lab", "Zed"),
    node("b2", "blog", "Alpha"), node("b1", "blog", "alpha"), node("two-hop", "study", "Indirect"),
  ], [edge("rz", "root", "z"), edge("b2r", "b2", "root"), edge("rb1", "root", "b1"), edge("zt", "z", "two-hop")]);
  const result = getNeighbourhood(data, indexSnapshot(data), "root");
  assert.deepEqual(result.nodeIds, ["b1", "b2", "z"]);
  assert.deepEqual(result.edges.map(item => item.id), ["rz", "b2r", "rb1"]);
  assert.equal(result.total, 3);
  assert.equal(result.truncated, false);
  assert.equal(result.nodeIds.includes("two-hop"), false);
});

test("bounded neighbourhood reports shown and total while retaining original provenance", () => {
  const provenance = [{ label: "Authored metadata", href: "https://example.test/source", claim: "Declared tag" }];
  const data = snapshot([
    node("root", "concept", "Root"), ...["c", "b", "a"].map(id => node(id, "blog", id)),
  ], ["a", "b", "c"].map(id => edge(`r${id}`, "root", id, { sourceRefs: provenance })));
  const result = getNeighbourhood(data, indexSnapshot(data), "root", 2);
  assert.deepEqual(result.nodeIds, ["a", "b"]);
  assert.equal(result.total, 3);
  assert.equal(result.shown, 2);
  assert.equal(result.truncated, true);
  assert.equal(result.edges[0].sourceRefs, provenance);
  assert.equal(result.edges.some(item => item.target === "c"), false);
});

test("partial snapshots never claim a complete neighbour total without a valid supplied count", () => {
  const data = snapshot([node("r", "tag", "Root"), node("a", "blog", "Article")], [edge("ra", "r", "a")], { status: "partial", totalNodes: null });
  assert.equal(getNeighbourhood(data, indexSnapshot(data), "r").total, null);
  assert.equal(getNeighbourhood({ ...data, neighbourhoodTotals: { r: 9 } }, indexSnapshot(data), "r").total, 9);
  const inconsistent = getNeighbourhood({ ...data, neighbourhoodTotals: { r: 0 } }, indexSnapshot(data), "r");
  assert.equal(inconsistent.total, null);
});

test("missing roots remain missing instead of selecting an existing default root", () => {
  const data = snapshot([node(DEFAULT_ROOT_ID, "concept", "Existing")]);
  assert.deepEqual(getNeighbourhood(data, indexSnapshot(data), "missing:root"), {
    root: null, nodeIds: [], edges: [], total: null, shown: 0, truncated: false, danglingEdges: 0,
  });
});

test("self-loops and dangling edges do not inflate the displayed neighbour count", () => {
  const data = snapshot([node("r", "tag", "Root"), node("a", "blog", "Article")], [
    edge("self", "r", "r"), edge("ra", "r", "a"), edge("ar", "a", "r"), edge("missing", "r", "gone"),
  ]);
  const result = getNeighbourhood(data, indexSnapshot(data), "r");
  assert.deepEqual(result.nodeIds, ["a"]);
  assert.equal(result.total, 1);
  assert.equal(result.danglingEdges, 1);
  assert.deepEqual(result.edges.map(item => item.id), ["self", "ra", "ar"]);
});

test("search requires every term across label, summary and tags with case-insensitive matching", () => {
  const data = snapshot([
    node("a", "blog", "Logistic Map", { summary: "An experiment", tags: ["chaos"] }),
    node("b", "lab", "Logistic Explorer", { summary: "A map", tags: ["dynamics"] }),
  ]);
  const result = queryNodes(data, defaultState({ query: "  LOGISTIC chaos experiment  " }));
  assert.deepEqual(result.items.map(item => item.id), ["a"]);
});

test("kind and taxonomy filters are exact and an unknown filter produces recoverable zero results", () => {
  const data = snapshot([
    node("blog", "blog", "Map", { taxonomyIds: ["blog-topic:physics"] }),
    node("lab", "lab", "Map", { taxonomyIds: ["lab-category:Physics"] }),
  ]);
  assert.deepEqual(queryNodes(data, defaultState({ kind: "lab", categoryId: "lab-category:Physics" })).items.map(item => item.id), ["lab"]);
  assert.equal(queryNodes(data, defaultState({ categoryId: "lab-category:physics" })).total, 0);
  assert.equal(queryNodes(data, defaultState({ kind: "concept" })).total, 0);
  const state = defaultState({ kind: "unknown", selectedId: "blog" });
  queryNodes(data, state);
  assert.equal(state.selectedId, "blog");
});

test("last result batch is reachable and out-of-range pages never silently snap to page one", () => {
  const data = snapshot(Array.from({ length: 25 }, (_, index) => node(`n${String(index).padStart(2, "0")}`, "blog", `Article ${String(index).padStart(2, "0")}`)));
  const final = queryNodes(data, defaultState({ page: 3 }), 12);
  assert.equal(final.pages, 3);
  assert.equal(final.total, 25);
  assert.deepEqual(final.items.map(item => item.id), ["n24"]);
  assert.equal(final.outOfRange, false);
  const beyond = queryNodes(data, defaultState({ page: 4 }), 12);
  assert.equal(beyond.page, 4);
  assert.equal(beyond.outOfRange, true);
  assert.deepEqual(beyond.items, []);
});

test("an empty search is explicit and differs from an out-of-range empty page", () => {
  const data = snapshot([node("a", "blog", "Article")]);
  assert.deepEqual(queryNodes(data, defaultState({ query: "absent" })), { items: [], total: 0, pages: 0, page: 1, outOfRange: false });
  assert.equal(queryNodes(data, defaultState({ query: "absent", page: 2 })).outOfRange, true);
});

test("list order is deterministic for equal labels and independent of source ordering", () => {
  const nodes = [node("z", "lab", "Alpha"), node("b", "blog", "Same"), node("a", "blog", "Same")];
  const first = queryNodes(snapshot(nodes), defaultState()).items.map(item => item.id);
  const second = queryNodes(snapshot([...nodes].reverse()), defaultState()).items.map(item => item.id);
  assert.deepEqual(first, ["a", "b", "z"]);
  assert.deepEqual(first, second);
});

test("indexing, neighbourhood and filtering preserve frozen source records and caller state", () => {
  const root = Object.freeze(node("r", "concept", "Root"));
  const other = Object.freeze(node("b", "blog", "Article"));
  const relation = Object.freeze(edge("rb", "r", "b"));
  const data = Object.freeze(snapshot(Object.freeze([root, other]), Object.freeze([relation])));
  const state = Object.freeze(defaultState({ selectedId: "b" }));
  const index = indexSnapshot(data);
  assert.equal(getNeighbourhood(data, index, "r").edges[0], relation);
  assert.equal(queryNodes(data, state).items.find(item => item.id === "b"), other);
});

test("source links preserve exact safe absolute and root-relative URLs", () => {
  for (const href of [
    "/blog/logistic-map/", "/lab/logistic-map/?r=3.9#plot", "/",
    "https://github.com/castlemilk/benebsworth.com/blob/master/lib/topics.ts",
    "http://example.test/source?q=a%2Bb#record", "HTTPS://example.test/Reference",
  ]) assert.equal(safeSourceHref(href), href);
});

test("source links reject unsafe schemes, credentials, protocol-relative paths and hidden controls", () => {
  for (const href of [
    "javascript:alert(1)", "data:text/html,test", "mailto:test@example.test", "file:///tmp/source",
    "//example.test/source", "/\\example.test/source", "https:\\example.test/source",
    "https://user:pass@example.test/source", "https://%75ser@example.test/source",
    " https://example.test/source", "https://example.test/source\n", "java\tscript:alert(1)",
    "https:/example.test/source", "https:example.test/source", "source.html", "#source", "",
  ]) assert.equal(safeSourceHref(href), null, href);
  assert.equal(safeSourceHref(null), null);
});

test("zero neighbour limit retains truthful total and never invents an edge to a hidden node", () => {
  const data = snapshot([node("r", "tag", "Root"), node("a", "blog", "Article")], [edge("ra", "r", "a")]);
  const result = getNeighbourhood(data, indexSnapshot(data), "r", 0);
  assert.equal(result.total, 1);
  assert.equal(result.shown, 0);
  assert.equal(result.truncated, true);
  assert.deepEqual(result.nodeIds, []);
  assert.deepEqual(result.edges, []);
});

test("source, partial and large fixtures satisfy the shared view-adapter contract", async () => {
  const { loadFixture } = await import("./fixtures.mjs");
  const source = loadFixture("source");
  const sourceView = getNeighbourhood(source, indexSnapshot(source), source.defaultRootId);
  assert.equal(sourceView.root.id, source.defaultRootId);
  assert.equal(sourceView.total, 2);
  assert.equal(sourceView.edges.every(item => item.mappingStatus === "proposed"), true);
  const partial = loadFixture("partial");
  assert.equal(getNeighbourhood(partial, indexSnapshot(partial), partial.defaultRootId).total, null);
  const large = loadFixture("large");
  const bounded = getNeighbourhood(large, indexSnapshot(large), large.defaultRootId);
  assert.equal(bounded.shown, 6);
  assert.equal(bounded.total, 999);
  assert.equal(bounded.truncated, true);
  const lastPage = queryNodes(large, defaultState({ page: 84 }), 12);
  assert.equal(lastPage.total, 1000);
  assert.equal(lastPage.items.length, 4);
  assert.equal(lastPage.outOfRange, false);
});

test("neighbour scope round-trips independently of root, selection and collection scope", () => {
  const href = buildViewHref("/prototype/?foreign=keep#evidence", {
    view: "list", scope: "neighbours", rootId: "tag:chaos", selectedId: "lab:logistic", page: 3,
  });
  const state = readViewState(href);
  assert.equal(state.scope, "neighbours");
  assert.equal(state.rootId, "tag:chaos");
  assert.equal(state.selectedId, "lab:logistic");
  assert.equal(state.page, 3);
  const collection = readViewState(buildViewHref(href, { scope: "collection", page: 1 }));
  assert.equal(collection.scope, "collection");
  assert.equal(collection.rootId, state.rootId);
  assert.equal(collection.selectedId, state.selectedId);
  assert.equal(readViewState("/prototype/?kgScope=unrecognized").scope, "collection");
});

test("neighbour list includes each existing incident node once and excludes root, dangling and two-hop nodes", () => {
  const data = snapshot([
    node("r", "concept", "Root"), node("a", "blog", "Article"),
    node("b", "lab", "Experiment"), node("c", "study", "Indirect study"),
  ], [
    edge("ra", "r", "a"), edge("ar", "a", "r"), edge("br", "b", "r"),
    edge("bc", "b", "c"), edge("rr", "r", "r"), edge("gone", "r", "missing"),
  ]);
  const result = queryNodes(data, defaultState({ scope: "neighbours", rootId: "r" }));
  assert.deepEqual(result.items.map(item => item.id), ["a", "b"]);
  assert.equal(result.total, 2);
  assert.equal(queryNodes(data, defaultState({ scope: "collection", rootId: "r" })).total, 4);
  assert.equal(queryNodes(data, defaultState({ scope: "neighbours", rootId: "missing" })).total, 0);
});

test("neighbour-scoped search and exact filters apply to available records without changing partial coverage or selection", () => {
  const data = snapshot([
    node("r", "concept", "Root"),
    node("a", "blog", "Logistic Map", { taxonomyIds: ["blog-topic:maths"], tags: ["chaos"] }),
    node("b", "lab", "Logistic Bifurcation", { taxonomyIds: ["lab-category:maths"], tags: ["chaos"] }),
    node("c", "blog", "Logistic elsewhere", { taxonomyIds: ["blog-topic:maths"], tags: ["chaos"] }),
  ], [edge("ra", "r", "a"), edge("rb", "r", "b")], { status: "partial", totalNodes: null });
  const state = defaultState({ scope: "neighbours", rootId: "r", selectedId: "b", query: "chaos", kind: "blog", categoryId: "blog-topic:maths" });
  const result = queryNodes(data, state);
  assert.deepEqual(result.items.map(item => item.id), ["a"]);
  assert.equal(result.total, 1); // Matching loaded records; the snapshot remains explicitly partial.
  assert.equal(data.status, "partial");
  assert.equal(data.totalNodes, null);
  assert.equal(state.selectedId, "b");
  assert.equal(getNeighbourhood(data, indexSnapshot(data), "r").total, null);
});

test("large neighbour list reaches its final three records without the six-node diagram cap", async () => {
  const { loadFixture } = await import("./fixtures.mjs");
  const data = loadFixture("large");
  const state = defaultState({ scope: "neighbours", rootId: data.defaultRootId, page: 84 });
  const final = queryNodes(data, state, 12);
  assert.equal(final.total, 999);
  assert.equal(final.pages, 84);
  assert.equal(final.items.length, 3);
  assert.equal(final.outOfRange, false);
  assert.equal(final.items.some(item => item.id === data.defaultRootId), false);
  assert.equal(queryNodes(data, { ...state, page: 85 }, 12).outOfRange, true);
});
