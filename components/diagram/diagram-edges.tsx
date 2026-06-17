import type { ReactNode } from "react";
import type { GeometryResult } from "../../lib/diagram/layout";
import {
    FLOW_CONN,
    ARCH_CONN,
    ARCH_ASYNC,
    ARCH_AUTH,
    ARCH_DOT,
    MARGIN,
    BOTTOM_PAD,
    TYPE_STYLE,
} from "./diagram-constants";

export interface EdgeRenderResult {
    edges: ReactNode[];
    labels: ReactNode[];
}

export function renderEdges(geom: GeometryResult, mode: string): EdgeRenderResult {
    const labels: ReactNode[] = [];
    const edges = geom.edges.map((e, i: number) => {
        if (e.loop) return null;
        let stroke = FLOW_CONN;
        let width = e.kind === "main" ? "1.5" : "1";
        let opacity = "0.85";
        let cls = "";

        if (mode === "flow") {
            cls = e.kind === "async" ? "flow-async" : (e.kind === "auth" ? "flow-auth" : (e.kind === "static" ? "" : "flow"));
        } else if (mode === "circuit") {
            stroke = "rgba(0,224,184,0.3)";
            cls = "";
            width = "1.5";
            opacity = "1";
        } else {
            stroke = e.kind === "async" ? ARCH_ASYNC : (e.kind === "auth" ? ARCH_AUTH : ARCH_CONN);
            cls = e.kind === "async" ? "flow-async" : (e.kind === "auth" ? "flow-auth" : (e.kind === "static" ? "" : "flow"));
            opacity = "1";
        }
        const marker = e.kind !== "static" ? "url(#arrow)" : undefined;

        if (e.label && e.labelPos) {
            labels.push(<text key={`edge-label-${i}`} x={e.labelPos[0]} y={e.labelPos[1]} fill="var(--color-muted)" fontSize="10">{e.label}</text>);
        }

        if (mode === "circuit") {
            const electronCls = e.kind === "async" ? "electron-async" : "electron-flow";
            return (
                <g key={`edge-group-${i}`}>
                    <path d={e.d} stroke="rgba(0,224,184,0.3)" strokeWidth={width} fill="none" opacity="1" markerEnd={marker} />
                    <path className={electronCls} d={e.d} stroke="#00E0B8" strokeWidth={width} fill="none" opacity="0.9" />
                </g>
            );
        }

        return <path key={`edge-${i}`} className={cls} d={e.d} stroke={stroke} strokeWidth={width} fill="none" opacity={opacity} markerEnd={marker} />;
    });
    return { edges, labels };
}

export function renderJourneyDots(geom: GeometryResult, mode: string, dotDefault: string): ReactNode[] {
    const dotSvg: ReactNode[] = [];
    if (mode !== "circuit") {
        geom.journeys.forEach((j, ji: number) => {
            const color = j.color || dotDefault;
            let prevId: string | null = null;
            const lastId = `j${ji}_${j.hops.length - 1}`;
            j.hops.forEach((hop, hi: number) => {
                const mid = `j${ji}_${hi}`;
                let begin = "";
                if (hi === 0) {
                    begin = `0s;${lastId}.end+0.6s`;
                } else {
                    begin = `${prevId}.end+0.3s`;
                }
                dotSvg.push(
                    <circle key={`dot-${mid}`} r="3.5" className="dot" fill={color}>
                        <animateMotion id={mid} dur={`${hop.dur}s`} begin={begin} fill="freeze" path={hop.d} />
                    </circle>
                );
                prevId = mid;
            });
        });
    }
    return dotSvg;
}

export interface LegendRenderResult {
    legendNodes: ReactNode[];
    adjustedW: number;
    adjustedH: number;
}

export function renderLegend(geom: GeometryResult, mode: string): LegendRenderResult {
    const legendNodes: ReactNode[] = [];
    let adjustedH = geom.height;
    let adjustedW = geom.width;
    if (mode === "architecture") {
        const used_types: { fill: string, stroke: string, leg: string }[] = [];
        Object.keys(geom.nodes).forEach(nid => {
            const n = geom.nodes[nid];
            const fillStrokeLeg = TYPE_STYLE[n.type || "external"] || TYPE_STYLE["external"];
            if (!used_types.some(u => u.leg === fillStrokeLeg[2])) {
                used_types.push({ fill: fillStrokeLeg[0], stroke: fillStrokeLeg[1], leg: fillStrokeLeg[2] });
            }
        });

        const ly = geom.height - BOTTOM_PAD + 6;
        let lx = MARGIN;
        used_types.forEach((u, i) => {
            legendNodes.push(<rect key={`leg-rect-${i}`} x={lx} y={ly} width="12" height="12" rx="3" fill={u.fill} stroke={u.stroke} />);
            legendNodes.push(<text key={`leg-text-${i}`} x={lx + 18} y={ly + 10} fill="#94a3b8" fontSize="11">{u.leg}</text>);
            lx += 22 + (u.leg.length * 7) + 28;
        });
        legendNodes.push(<circle key="leg-flight-circ" cx={lx + 6} cy={ly + 6} r="3.5" fill={ARCH_DOT} />);
        legendNodes.push(<text key="leg-flight-text" x={lx + 16} y={ly + 10} fill="#94a3b8" fontSize="11">request in flight</text>);
        lx += 16 + ("request in flight".length * 7) + 28;

        if (geom.legendExtra && geom.legendExtra.length > 0) {
            const ly2 = ly + 22;
            lx = MARGIN;
            geom.legendExtra.forEach((ex, i: number) => {
                const dashProps = ex.dash ? { strokeDasharray: ex.dash } : {};
                legendNodes.push(<rect key={`leg-ex-rect-${i}`} x={lx} y={ly2} width="12" height="12" rx="3" fill="none" stroke={ex.stroke || "#94a3b8"} {...dashProps} />);
                legendNodes.push(<text key={`leg-ex-text-${i}`} x={lx + 18} y={ly2 + 10} fill="#94a3b8" fontSize="11">{ex.label}</text>);
                lx += 22 + (ex.label.length * 7) + 28;
            });
            adjustedH += 24;
            adjustedW = Math.max(adjustedW, lx + 10);
        }
        adjustedW = Math.max(adjustedW, lx + 10);
        adjustedH += 12;
    }
    return { legendNodes, adjustedW, adjustedH };
}
