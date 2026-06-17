import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
import type { GeometryResult } from "../../lib/diagram/layout";
import {
    TYPE_STYLE,
    FLOW_NODE_FILL,
    FLOW_NODE_STROKE,
    FLOW_PILL_FILL,
    FLOW_PILL_STROKE,
} from "./diagram-constants";

type GeomNode = GeometryResult["nodes"][string];

export interface NodeHandlers {
    onMouseEnter: (signal: string) => void;
    onMouseMove: (e: ReactMouseEvent) => void;
    onMouseLeave: () => void;
}

interface NodeFnArgs {
    geom: GeometryResult;
    handlers: NodeHandlers;
}

function buildNodeElement(
    nid: string,
    n: GeomNode,
    nodeBody: ReactNode,
    handlers: NodeHandlers,
): ReactNode {
    const cx = n.x + n.w / 2;
    const cy = n.y + n.h / 2;
    const textCx = n.shape === "triangle" ? n.x + n.w * 0.4 : cx;
    let nodeText: ReactNode = null;
    if (n.shape === "point") {
        // Text outside the point
        nodeText = (
            <>
                <text x={textCx} y={n.y - 12} fill="var(--color-fg)" fontSize="13" fontWeight="500">{n.labelLines[0]}</text>
                {n.sublabel && <text x={textCx} y={n.y + n.h + 16} fill="var(--color-muted)" fontSize="11">{n.sublabel}</text>}
            </>
        );
    } else if (n.sublabel) {
        const ly = n.y + (n.h - 18) / 2 + 4;
        if (n.labelLines.length === 1) {
            nodeText = (
                <>
                    <text x={textCx} y={ly} fill="var(--color-fg)" fontSize="13" fontWeight="500">{n.labelLines[0]}</text>
                    <text x={textCx} y={n.y + n.h - 10} fill="var(--color-muted)" fontSize="10">{n.sublabel}</text>
                </>
            );
        } else {
            nodeText = (
                <>
                    <text x={textCx} y={ly - 7} fill="var(--color-fg)" fontSize="13" fontWeight="500">
                        <tspan x={textCx}>{n.labelLines[0]}</tspan>
                        <tspan x={textCx} dy="15">{n.labelLines[1]}</tspan>
                    </text>
                    <text x={textCx} y={n.y + n.h - 10} fill="var(--color-muted)" fontSize="10">{n.sublabel}</text>
                </>
            );
        }
    } else {
        const weight = n.shape === "pill" ? "600" : "500";
        if (n.labelLines.length === 1) {
            nodeText = <text x={textCx} y={cy + 4} fill="var(--color-fg)" fontSize="13" fontWeight={weight}>{n.labelLines[0]}</text>;
        } else {
            nodeText = (
                <text x={textCx} y={cy - 3} fill="var(--color-fg)" fontSize="13" fontWeight={weight}>
                    <tspan x={textCx}>{n.labelLines[0]}</tspan>
                    <tspan x={textCx} dy="15">{n.labelLines[1]}</tspan>
                </text>
            );
        }
    }

    const gProps = n.signal ? {
        className: "signal-node",
        "data-signal": n.signal,
        style: { cursor: "crosshair" },
        onMouseEnter: () => handlers.onMouseEnter(n.signal!),
        onMouseMove: handlers.onMouseMove,
        onMouseLeave: handlers.onMouseLeave,
    } : {};

    return (
        <g key={`node-${nid}`} {...gProps}>
            {nodeBody}
            {nodeText}
        </g>
    );
}

export function FlowNodes({ geom, handlers }: NodeFnArgs): ReactNode[] {
    return Object.keys(geom.nodes).map(nid => {
        const n = geom.nodes[nid];
        let nodeBody: ReactNode = null;
        if (n.shape === "pill") {
            nodeBody = <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={20} fill={FLOW_PILL_FILL} stroke={FLOW_PILL_STROKE} strokeWidth={1.5} />;
        } else if (n.shape === "decision") {
            nodeBody = <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={FLOW_NODE_FILL} stroke={FLOW_NODE_STROKE} strokeDasharray="4 3" />;
        } else {
            nodeBody = <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={FLOW_NODE_FILL} stroke={FLOW_NODE_STROKE} />;
        }
        return buildNodeElement(nid, n, nodeBody, handlers);
    });
}

export function CircuitNodes({ geom, handlers }: NodeFnArgs): ReactNode[] {
    return Object.keys(geom.nodes).map(nid => {
        const n = geom.nodes[nid];
        const st = "#00E0B8";
        const fill = "rgba(0,224,184,0.05)";
        let nodeBody: ReactNode = null;
        if (n.shape === "circle") {
            nodeBody = <circle cx={n.x + n.w / 2} cy={n.y + n.h / 2} r={n.w / 2} fill={fill} stroke={st} strokeWidth={1.5} />;
        } else if (n.shape === "triangle") {
            const pts = `${n.x},${n.y} ${n.x + n.w},${n.y + n.h / 2} ${n.x},${n.y + n.h}`;
            nodeBody = <polygon points={pts} fill={fill} stroke={st} strokeWidth={1.5} strokeLinejoin="round" />;
        } else if (n.shape === "point") {
            nodeBody = <circle cx={n.x + n.w / 2} cy={n.y + n.h / 2} r={3} fill={st} />;
        } else {
            nodeBody = <rect x={n.x} y={n.y} width={n.w} height={n.h} fill={fill} stroke={st} strokeWidth={1.5} />;
        }
        return buildNodeElement(nid, n, nodeBody, handlers);
    });
}

export function ArchitectureNodes({ geom, handlers }: NodeFnArgs): ReactNode[] {
    return Object.keys(geom.nodes).map(nid => {
        const n = geom.nodes[nid];
        const fillStrokeLeg = TYPE_STYLE[n.type || "external"] || TYPE_STYLE["external"];
        const fill = fillStrokeLeg[0];
        const stroke = fillStrokeLeg[1];
        const st = n.semStroke || stroke;
        const dashProps = n.semDash ? { strokeDasharray: n.semDash } : {};
        const nodeBody = (
            <>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill="var(--color-bg)" />
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={fill} stroke={st} strokeWidth={1.5} {...dashProps} />
            </>
        );
        return buildNodeElement(nid, n, nodeBody, handlers);
    });
}

export function renderLoopNotes(geom: GeometryResult): ReactNode[] {
    const labelNodes: ReactNode[] = [];
    Object.keys(geom.nodes).forEach(nid => {
        const n = geom.nodes[nid];
        let off = 0;
        const cy = n.y + n.h / 2;
        const x2 = n.x + n.w;
        n.loopNotes.forEach((note: string, i: number) => {
            const lx = x2 + 8;
            const ly = cy + 4 + off;
            labelNodes.push(<text key={`loop-${nid}-${i}-icon`} x={lx} y={ly} fill="var(--color-muted)" fontSize="11">↻</text>);
            if (note) {
                labelNodes.push(<text key={`loop-${nid}-${i}-text`} x={lx + 14} y={ly} fill="var(--color-muted)" fontSize="10">{note}</text>);
            }
            off += 15;
        });
    });
    return labelNodes;
}
