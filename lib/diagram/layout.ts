// lib/diagram/layout.ts

const CENTER = 520.0;
const MARGIN = 34.0;
const BOTTOM_PAD = 44.0;

const STEP_H = 44.0;
const PILL_H = 40.0;
const FLOW_VGAP = 56.0;
const FLOW_HGAP = 30.0;
const FLOW_MAXW = 190.0;

const COMP_H = 56.0;
const BUS_H = 36.0;
const ARCH_VGAP = 56.0;
const ARCH_HGAP = 40.0;
const ARCH_MAXW = 200.0;
const BOUND_PAD = 20.0;

const LANE_GAP = 30.0;
const LANE_STEP = 16.0;
const RAIL_IN = 24.0;
const EDGE_SHORT = 4.0;

function char_w(c: string): number {
    const o = c.charCodeAt(0);
    if (o >= 0x2E80) return 14.0;
    if ("iljt.,:;'|! ".includes(c)) return 5.0;
    if ("mwMW".includes(c)) return 11.0;
    return 8.0;
}

function text_w(s: string): number {
    let sum = 0;
    for (const c of s) {
        sum += char_w(c);
    }
    return sum;
}

function wrap(label: string, maxw: number): string[] {
    if (text_w(label) <= maxw) return [label];
    const words = label.split(" ");
    if (words.length > 1) {
        let best: number | null = null;
        let line1 = "";
        let line2 = "";
        for (let i = 1; i < words.length; i++) {
            const a = words.slice(0, i).join(" ");
            const b = words.slice(i).join(" ");
            const score = Math.max(text_w(a), text_w(b));
            if (best === null || score < best) {
                best = score;
                line1 = a;
                line2 = b;
            }
        }
        return [line1, line2];
    }
    const n = label.length;
    const cut = Math.floor(n / 2);
    return [label.slice(0, cut), label.slice(cut)];
}

export class Node {
    id: string;
    label: string;
    sublabel?: string;
    shape?: string;
    type?: string;
    signal?: string;
    tier?: number;
    group?: string;
    sem_stroke?: string;
    sem_dash?: string;
    loop_notes: string[];
    layer: number;
    x: number;
    y: number;
    w: number;
    h: number;
    lines: string[];

    constructor(d: any) {
        this.id = d.id;
        this.label = d.label || d.id;
        this.sublabel = d.sublabel;
        this.shape = d.shape;
        this.type = d.type;
        this.signal = d.signal;
        this.tier = d.tier != null ? Number(d.tier) : undefined;
        this.group = d.group;
        this.sem_stroke = d.semStroke;
        this.sem_dash = d.semDash;
        this.loop_notes = [];
        this.layer = 0;
        this.x = 0.0;
        this.y = 0.0;
        this.w = 0.0;
        this.h = 0.0;
        this.lines = [this.label];
    }

    get cx(): number { return this.x + this.w / 2.0; }
    get cy(): number { return this.y + this.h / 2.0; }
    get x2(): number { return this.x + this.w; }
    get y2(): number { return this.y + this.h; }
}

export class Edge {
    src: string;
    dst: string;
    kind: string;
    label?: string;
    pts: [number, number][];
    is_loop: boolean;
    label_pos: [number, number] | null;

    constructor(d: any) {
        this.src = d.from;
        this.dst = d.to;
        this.kind = d.kind || "sync";
        this.label = d.label;
        this.pts = [];
        this.is_loop = false;
        this.label_pos = null;
    }
}

export class Group {
    id: string;
    label: string;
    kind: string;
    parent?: string;
    box: [number, number, number, number] | null;

    constructor(d: any) {
        this.id = d.id;
        this.label = d.label || d.id;
        this.kind = d.kind || "region";
        this.parent = d.parent;
        this.box = null;
    }
}

function find_back_edges(node_ids: string[], edges: Edge[]): Set<number> {
    const adj: Record<string, [string, number][]> = {};
    for (const n of node_ids) adj[n] = [];
    edges.forEach((e, i) => {
        if (adj[e.src]) adj[e.src].push([e.dst, i]);
    });
    const color: Record<string, number> = {};
    const back = new Set<number>();

    function dfs(u: string) {
        color[u] = 1;
        for (const [v, i] of adj[u] || []) {
            if (v === u) {
                back.add(i);
                continue;
            }
            const c = color[v] || 0;
            if (c === 1) {
                back.add(i);
            } else if (c === 0) {
                dfs(v);
            }
        }
        color[u] = 2;
    }

    for (const n of node_ids) {
        if ((color[n] || 0) === 0) dfs(n);
    }
    return back;
}

function longest_path_layers(node_ids: string[], fwd: Edge[]): Record<string, number> {
    const succ: Record<string, string[]> = {};
    const indeg: Record<string, number> = {};
    for (const n of node_ids) {
        succ[n] = [];
        indeg[n] = 0;
    }
    for (const e of fwd) {
        if (succ[e.src]) succ[e.src].push(e.dst);
        if (indeg[e.dst] !== undefined) indeg[e.dst]++;
    }
    const level: Record<string, number> = {};
    for (const n of node_ids) level[n] = 0;
    const queue = node_ids.filter(n => indeg[n] === 0);
    let qi = 0;
    while (qi < queue.length) {
        const u = queue[qi++];
        for (const v of succ[u] || []) {
            if (level[u] + 1 > level[v]) {
                level[v] = level[u] + 1;
            }
            indeg[v]--;
            if (indeg[v] === 0) {
                queue.push(v);
            }
        }
    }
    return level;
}

export function poly_len(pts: [number, number][]): number {
    let total = 0.0;
    for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        total += Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
    }
    return total;
}

export class Layout {
    mode: string;
    title: string;
    nodes: Node[];
    by_id: Record<string, Node>;
    edges: Edge[];
    groups: Group[];
    group_by_id: Record<string, Group>;
    journeys: any[];
    legend_extra: any[];
    subtitle?: string;
    summary?: any[];
    footer?: string;
    input_index: Record<string, number>;
    notes: any[];
    lanes_r: number;
    lanes_l: number;
    lane_base_r: number;
    lane_base_l: number;
    _src_lane_l: Record<string, number>;
    _src_lane_r: Record<string, number>;
    maxx: number;
    maxy: number;
    back: Set<number>;

    constructor(graph: any) {
        this.mode = graph.mode || "flow";
        this.title = graph.title || "diagram";
        this.nodes = (graph.nodes || []).map((n: any) => new Node(n));
        this.by_id = {};
        for (const n of this.nodes) this.by_id[n.id] = n;
        this.edges = (graph.edges || []).map((e: any) => new Edge(e));
        this.groups = (graph.groups || []).map((g: any) => new Group(g));
        this.group_by_id = {};
        for (const g of this.groups) this.group_by_id[g.id] = g;
        this.journeys = graph.journeys || [];
        this.legend_extra = graph.legendExtra || [];
        this.subtitle = graph.subtitle;
        this.summary = graph.summary;
        this.footer = graph.footer;
        this.input_index = {};
        this.nodes.forEach((n, i) => this.input_index[n.id] = i);
        this.notes = [];
        this.lanes_r = 0;
        this.lanes_l = 0;
        this.lane_base_r = 0.0;
        this.lane_base_l = 0.0;
        this._src_lane_l = {};
        this._src_lane_r = {};
        this.maxx = 0;
        this.maxy = 0;
        this.back = new Set();
    }

    size_nodes() {
        const maxw = this.mode === "flow" ? FLOW_MAXW : ARCH_MAXW;
        for (const n of this.nodes) {
            n.lines = wrap(n.label, maxw);
            let lw = 0;
            for (const l of n.lines) {
                lw = Math.max(lw, text_w(l));
            }
            if (this.mode === "flow") {
                if (n.shape === "pill") {
                    n.w = Math.min(Math.max(text_w(n.label) + 40, 110), 150);
                    n.h = PILL_H;
                } else {
                    n.w = Math.max(lw + 32, 110);
                    n.h = n.lines.length === 1 ? STEP_H : STEP_H + 14;
                }
            } else if (this.mode === "circuit") {
                if (n.shape === "circle") {
                    n.w = 48; n.h = 48;
                } else if (n.shape === "triangle") {
                    n.w = 60; n.h = 60;
                } else if (n.shape === "point") {
                    n.w = 12; n.h = 12;
                } else {
                    n.w = Math.max(lw + 32, 64);
                    n.h = n.lines.length === 1 ? 48 : 64;
                }
            } else {
                let base = Math.max(lw + 36, 130);
                if (n.sublabel) {
                    base = Math.max(base, text_w(n.sublabel) + 36);
                }
                n.w = base;
                if (n.type === "bus") {
                    n.h = BUS_H;
                } else {
                    n.h = n.lines.length === 1 ? COMP_H : COMP_H + 16;
                }
            }
        }
    }

    assign_layers() {
        const ids = this.nodes.map(n => n.id);
        if (this.nodes.every(n => n.tier !== undefined)) {
            for (const n of this.nodes) {
                n.layer = n.tier!;
            }
            this.back = new Set();
        } else {
            const back = find_back_edges(ids, this.edges);
            const fwd = this.edges.filter((_, i) => !back.has(i));
            const level = longest_path_layers(ids, fwd);
            for (const n of this.nodes) {
                n.layer = level[n.id] || 0;
            }
            this.back = back;
        }
        this.edges.forEach((e, i) => {
            if (this.mode === "flow" && this.back.has(i)) {
                e.is_loop = true;
                if (this.by_id[e.src]) {
                    this.by_id[e.src].loop_notes.push(e.label || "");
                }
            }
        });
    }

    _group_chain(n: Node): (string | number)[] {
        const chain: (string | number)[] = [];
        let g: Group | undefined = n.group ? this.group_by_id[n.group] : undefined;
        while (g) {
            chain.push(this.input_index[g.id] || 0);
            chain.push(g.id);
            g = g.parent ? this.group_by_id[g.parent] : undefined;
        }
        chain.reverse();
        return chain;
    }

    _group_set(n: Node): Set<string> {
        const s = new Set<string>();
        let g: Group | undefined = n.group ? this.group_by_id[n.group] : undefined;
        while (g) {
            s.add(g.id);
            g = g.parent ? this.group_by_id[g.parent] : undefined;
        }
        return s;
    }

    place() {
        const layers: Record<number, Node[]> = {};
        for (const n of this.nodes) {
            if (!layers[n.layer]) layers[n.layer] = [];
            layers[n.layer].push(n);
        }
        const vgap = this.mode === "flow" ? FLOW_VGAP : ARCH_VGAP;
        const hgap = this.mode === "flow" ? FLOW_HGAP : ARCH_HGAP;
        const order = Object.keys(layers).map(Number).sort((a, b) => a - b);
        const active: Record<number, Set<string>> = {};
        for (const L of order) {
            const s = new Set<string>();
            for (const n of layers[L]) {
                const gs = this._group_set(n);
                gs.forEach(x => s.add(x));
            }
            active[L] = s;
        }

        let y = 0.0;
        for (let idx = 0; idx < order.length; idx++) {
            const L = order[idx];
            const row = layers[L];
            row.sort((a, b) => {
                const chainA = this._group_chain(a);
                const chainB = this._group_chain(b);
                const len = Math.min(chainA.length, chainB.length);
                for (let i = 0; i < len; i++) {
                    if (chainA[i] < chainB[i]) return -1;
                    if (chainA[i] > chainB[i]) return 1;
                }
                if (chainA.length !== chainB.length) return chainA.length - chainB.length;
                return (this.input_index[a.id] || 0) - (this.input_index[b.id] || 0);
            });
            let h = 0;
            for (const n of row) if (n.h > h) h = n.h;
            let total = 0;
            for (const n of row) total += n.w;
            total += hgap * (row.length - 1);
            let x = CENTER - total / 2.0;
            for (const n of row) {
                n.x = x;
                n.y = y + (h - n.h) / 2.0;
                x += n.w + hgap;
            }
            let gap = vgap;
            if (idx + 1 < order.length) {
                const nxt = active[order[idx + 1]];
                let closing = 0;
                let opening = 0;
                active[L].forEach(val => { if (!nxt.has(val)) closing++; });
                nxt.forEach(val => { if (!active[L].has(val)) opening++; });
                gap = Math.max(vgap, BOUND_PAD * (closing + opening) + 8);
            }
            y += h + gap;
        }
    }

    build_groups() {
        const depth = (g: Group) => {
            let d = 0;
            let curr = g;
            while (curr.parent && this.group_by_id[curr.parent]) {
                curr = this.group_by_id[curr.parent];
                d++;
            }
            return d;
        };
        const sortedGroups = [...this.groups].sort((a, b) => depth(b) - depth(a));
        for (const g of sortedGroups) {
            const members = this.nodes.filter(n => n.group === g.id);
            const child_boxes = this.groups.filter(c => c.parent === g.id && c.box).map(c => c.box!);
            const xs: number[] = [], ys: number[] = [], xs2: number[] = [], ys2: number[] = [];
            for (const n of members) {
                xs.push(n.x); ys.push(n.y); xs2.push(n.x2); ys2.push(n.y2);
            }
            for (const [bx, by, bw, bh] of child_boxes) {
                xs.push(bx); ys.push(by); xs2.push(bx + bw); ys2.push(by + bh);
            }
            if (xs.length === 0) continue;
            const x = Math.min(...xs) - BOUND_PAD;
            const yy = Math.min(...ys) - BOUND_PAD;
            const w = Math.max(...xs2) + BOUND_PAD - x;
            const hh = Math.max(...ys2) + BOUND_PAD - yy;
            g.box = [x, yy, w, hh];
        }
    }

    _content_bounds(): [number, number] {
        const xs: number[] = [];
        const xs2: number[] = [];
        for (const n of this.nodes) {
            xs.push(n.x); xs2.push(n.x2);
        }
        for (const g of this.groups) {
            if (g.box) {
                xs.push(g.box[0]); xs2.push(g.box[0] + g.box[2]);
            }
        }
        if (xs.length === 0) return [0, 0];
        return [Math.min(...xs), Math.max(...xs2)];
    }

    route() {
        const [lo, hi] = this._content_bounds();
        this.lane_base_r = hi + LANE_GAP;
        this.lane_base_l = lo - LANE_GAP;
        for (const e of this.edges) {
            if (e.is_loop) continue;
            this._route_edge(e);
        }
    }

    _layer_gap_y(upper_layer_bottom: number, target_top: number): number {
        return (upper_layer_bottom + target_top) / 2.0;
    }

    _column_clear(x: number, y0: number, y1: number, exclude: Set<string>): boolean {
        let lo = y0 <= y1 ? y0 : y1;
        let hi = y0 <= y1 ? y1 : y0;
        for (const n of this.nodes) {
            if (exclude.has(n.id)) continue;
            if (n.x - 3 < x && x < n.x2 + 3 && !(n.y2 <= lo || n.y >= hi)) {
                return false;
            }
        }
        return true;
    }

    _route_edge(e: Edge) {
        const u = this.by_id[e.src];
        const v = this.by_id[e.dst];
        if (!u || !v) return;
        let ux = u.cx, uy = u.y2;
        let vx = v.cx, vtop = v.y - EDGE_SHORT;
        const upward = v.layer < u.layer;
        const same = v.layer === u.layer;
        if (upward) {
            ux = u.cx; uy = u.y;
            vx = v.cx; vtop = v.y2 + EDGE_SHORT;
        }
        if (!upward && !same && v.layer - u.layer === 1) {
            if (Math.abs(ux - vx) < 0.6) {
                e.pts = [[ux, uy], [vx, vtop]];
            } else {
                const midy = this._layer_gap_y(u.y2, v.y);
                e.pts = [[ux, uy], [ux, midy], [vx, midy], [vx, vtop]];
            }
            this._set_label_pos(e, u, v);
            return;
        }
        if (!upward && !same) {
            const rail_b = v.y - RAIL_IN;
            if (this._column_clear(ux, u.y2, rail_b, new Set([u.id, v.id]))) {
                e.pts = [[ux, uy], [ux, rail_b], [vx, rail_b], [vx, vtop]];
                this._set_label_pos(e, u, v);
                return;
            }
            const rail_a = u.y2 + RAIL_IN;
            if (this._column_clear(vx, rail_a, vtop, new Set([u.id, v.id]))) {
                e.pts = [[ux, uy], [ux, rail_a], [vx, rail_a], [vx, vtop]];
                this._set_label_pos(e, u, v);
                return;
            }
        }
        if (same) {
            const ya = Math.max(u.y2, v.y2) + RAIL_IN;
            e.pts = [[u.cx, u.y2], [u.cx, ya], [v.cx, ya], [v.cx, v.y2 + EDGE_SHORT]];
            this._set_label_pos(e, u, v);
            return;
        }
        const right = u.cx >= CENTER;
        let lane: number;
        if (right) {
            if (this._src_lane_r[e.src] !== undefined) {
                lane = this._src_lane_r[e.src];
            } else {
                this.lanes_r++;
                lane = this.lane_base_r + (this.lanes_r - 1) * LANE_STEP;
                this._src_lane_r[e.src] = lane;
            }
        } else {
            if (this._src_lane_l[e.src] !== undefined) {
                lane = this._src_lane_l[e.src];
            } else {
                this.lanes_l++;
                lane = this.lane_base_l - (this.lanes_l - 1) * LANE_STEP;
                this._src_lane_l[e.src] = lane;
            }
        }
        const rail_a = uy + (!upward ? RAIL_IN : -RAIL_IN);
        const rail_b = vtop + (!upward ? -RAIL_IN : RAIL_IN);
        e.pts = [
            [ux, uy], [ux, rail_a], [lane, rail_a],
            [lane, rail_b], [vx, rail_b], [vx, vtop]
        ];
        this._set_label_pos(e, u, v);
    }

    _set_label_pos(e: Edge, u: Node, v: Node) {
        if (!e.label || e.pts.length < 2) return;
        const total = poly_len(e.pts);
        const half = total / 2.0;
        let acc = 0.0;
        for (let i = 0; i < e.pts.length - 1; i++) {
            const [ax, ay] = e.pts[i];
            const [bx, by] = e.pts[i + 1];
            const seg = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
            if (acc + seg >= half && seg > 0) {
                const t = (half - acc) / seg;
                e.label_pos = [ax + (bx - ax) * t + 8, ay + (by - ay) * t - 3];
                return;
            }
            acc += seg;
        }
        e.label_pos = [e.pts[0][0] + 8, e.pts[0][1]];
    }

    normalize() {
        const xs: number[] = [];
        const ys: number[] = [];
        const acc = (x: number, y: number) => { xs.push(x); ys.push(y); };
        for (const n of this.nodes) {
            acc(n.x, n.y); acc(n.x2, n.y2);
            if (n.loop_notes.length > 0) {
                let wid = 0;
                for (const s of n.loop_notes) wid = Math.max(wid, text_w(s));
                acc(n.x2 + 8 + 14 + wid + 8, n.cy);
                acc(n.x2, n.cy + 15 * n.loop_notes.length);
            }
        }
        for (const g of this.groups) {
            if (g.box) {
                acc(g.box[0], g.box[1]);
                acc(g.box[0] + g.box[2], g.box[1] + g.box[3]);
            }
        }
        for (const e of this.edges) {
            for (const [x, y] of e.pts) {
                acc(x, y);
            }
        }
        let minx = xs.length ? Math.min(...xs) : 0;
        let miny = ys.length ? Math.min(...ys) : 0;
        const dx = -minx + MARGIN;
        const dy = -miny + MARGIN;
        for (const n of this.nodes) {
            n.x += dx; n.y += dy;
        }
        for (const g of this.groups) {
            if (g.box) {
                g.box = [g.box[0] + dx, g.box[1] + dy, g.box[2], g.box[3]];
            }
        }
        for (const e of this.edges) {
            e.pts = e.pts.map(([x, y]) => [x + dx, y + dy]);
            if (e.label_pos) {
                e.label_pos = [e.label_pos[0] + dx, e.label_pos[1] + dy];
            }
        }
        this.maxx = xs.length ? Math.max(...xs.map(x => x + dx)) : 0;
        this.maxy = ys.length ? Math.max(...ys.map(y => y + dy)) : 0;
    }

    run() {
        this.size_nodes();

        const isHorizontal = this.mode === "circuit";
        if (isHorizontal) {
            for (const n of this.nodes) {
                const t = n.w; n.w = n.h; n.h = t;
            }
        }

        this.assign_layers();
        this.place();
        this.build_groups();
        this.route();

        if (isHorizontal) {
            for (const n of this.nodes) {
                const tx = n.x; n.x = n.y; n.y = tx;
                const tw = n.w; n.w = n.h; n.h = tw;
            }
            for (const g of this.groups) {
                if (g.box) {
                    g.box = [g.box[1], g.box[0], g.box[3], g.box[2]];
                }
            }
            for (const e of this.edges) {
                e.pts = e.pts.map(([px, py]) => [py, px]);
                if (e.label_pos) {
                    e.label_pos = [e.label_pos[1], e.label_pos[0]];
                }
            }
        }

        this.normalize();
    }
}

function fmt(v: number): string {
    let s = v.toFixed(1);
    s = s.replace(/0$/, "").replace(/\.$/, "");
    return s;
}

export function to_d(pts: [number, number][]): string {
    if (!pts || pts.length === 0) return "";
    const out = [`M${fmt(pts[0][0])} ${fmt(pts[0][1])}`];
    let [px, py] = pts[0];
    for (let i = 1; i < pts.length; i++) {
        const [x, y] = pts[i];
        if (Math.abs(x - px) < 0.05) {
            out.push(`V${fmt(y)}`);
        } else if (Math.abs(y - py) < 0.05) {
            out.push(`H${fmt(x)}`);
        } else {
            out.push(`L${fmt(x)} ${fmt(y)}`);
        }
        px = x;
        py = y;
    }
    return out.join(" ");
}

export function geometry(lo: Layout): any {
    const nodes: Record<string, any> = {};
    for (const n of lo.nodes) {
        nodes[n.id] = {
            x: Number(n.x.toFixed(1)), y: Number(n.y.toFixed(1)),
            w: Number(n.w.toFixed(1)), h: Number(n.h.toFixed(1)),
            shape: n.shape, type: n.type, signal: n.signal,
            labelLines: n.lines, sublabel: n.sublabel,
            loopNotes: n.loop_notes,
            semStroke: n.sem_stroke,
            semDash: n.sem_dash
        };
    }
    const edges: any[] = [];
    const edge_d: Record<string, string> = {};
    for (const e of lo.edges) {
        if (e.is_loop) {
            edges.push({
                from: e.src, to: e.dst, kind: e.kind,
                label: e.label, loop: true
            });
            continue;
        }
        const d = to_d(e.pts);
        edge_d[`${e.src}|${e.dst}`] = d;
        edges.push({
            from: e.src, to: e.dst, kind: e.kind,
            d, marker: e.kind !== "static",
            label: e.label,
            labelPos: e.label_pos ? [Number(e.label_pos[0].toFixed(1)), Number(e.label_pos[1].toFixed(1))] : null
        });
    }
    const groups: Record<string, any> = {};
    for (const g of lo.groups) {
        if (g.box) {
            groups[g.id] = {
                label: g.label, kind: g.kind,
                parent: g.parent,
                box: g.box.map(v => Number(v.toFixed(1)))
            };
        }
    }
    const journeys: any[] = [];
    for (const j of lo.journeys) {
        const hops: any[] = [];
        for (const [a, b] of j.hops || []) {
            const d = edge_d[`${a}|${b}`];
            if (d) {
                const e = lo.edges.find(x => x.src === a && x.dst === b && !x.is_loop);
                let dur = 0;
                if (e) {
                    const len = poly_len(e.pts);
                    dur = Math.min(4.0, Math.max(0.6, len / 150.0));
                }
                hops.push({ from: a, to: b, d, dur: Number(dur.toFixed(1)) });
            }
        }
        if (hops.length > 0) {
            journeys.push({ color: j.color, hops });
        }
    }
    return {
        mode: lo.mode,
        title: lo.title,
        subtitle: lo.subtitle,
        summary: lo.summary,
        footer: lo.footer,
        nodes,
        edges,
        groups,
        journeys,
        notes: lo.notes,
        legendExtra: lo.legend_extra,
        width: Number((lo.maxx + MARGIN).toFixed(1)),
        height: Number((lo.maxy + BOTTOM_PAD).toFixed(1)),
    };
}
