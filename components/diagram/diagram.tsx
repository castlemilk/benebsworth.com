"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layout, geometry } from "../../lib/diagram/layout";

const FLOW_NODE_FILL = "rgba(16,185,129,0.04)";
const FLOW_NODE_STROKE = "#10b981";
const FLOW_PILL_FILL = "rgba(52,211,153,0.06)";
const FLOW_PILL_STROKE = "#00E0B8";
const FLOW_CONN = "#10b981";
const FLOW_DOT = "#00E0B8";

const ARCH_CONN = "#00E0B8";
const ARCH_ASYNC = "#fb923c";
const ARCH_AUTH = "#fb7185";
const ARCH_DOT = "#7C5CFF";

const MARGIN = 34.0;
const BOTTOM_PAD = 44.0;

const TYPE_STYLE: Record<string, [string, string, string]> = {
    "signal": ["rgba(124,92,255,0.15)", "#7C5CFF", "signal"],
    "backend":  ["rgba(0,224,184,0.15)", "#00E0B8", "block"],
    "database": ["rgba(76,29,149,0.45)", "#a78bfa", "data"],
    "cloud":    ["rgba(120,53,15,0.35)", "#fbbf24", "cloud infra"],
    "security": ["rgba(255,255,255,0.05)", "#fb7185", "security"],
    "bus":      ["rgba(154,52,18,0.35)", "#fb923c", "message bus"],
    "external": ["rgba(30,41,59,0.5)", "#94a3b8", "external"],
};

export function Diagram({ data }: { data: any }) {
    const geom = useMemo(() => {
        const lo = new Layout(data);
        lo.run();
        return geometry(lo);
    }, [data]);

    const mode = geom.mode;
    const W = geom.width;
    const H = geom.height;

    const [paused, setPaused] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        if (paused) {
            svgRef.current.pauseAnimations();
        } else {
            svgRef.current.unpauseAnimations();
        }
    }, [paused]);

    const [oscope, setOscope] = useState<{ visible: boolean, x: number, y: number, signal: string | null }>({
        visible: false, x: 0, y: 0, signal: null
    });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timeRef = useRef(0);
    const reqRef = useRef<number | null>(null);

    useEffect(() => {
        const drawSignal = () => {
            if (!canvasRef.current || !oscope.signal) return;
            const ctx = canvasRef.current.getContext("2d");
            if (!ctx) return;

            timeRef.current -= 1;
            ctx.clearRect(0, 0, 160, 60);

            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let i=0; i<=160; i+=20) { ctx.moveTo(i,0); ctx.lineTo(i,60); }
            for(let j=0; j<=60; j+=20) { ctx.moveTo(0,j); ctx.lineTo(160,j); }
            ctx.stroke();

            ctx.strokeStyle = '#00E0B8';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let x = 0; x < 160; x++) {
                let t = (x - timeRef.current) * 0.1;
                let y = 30;
                if (oscope.signal === 'square') {
                    y = 30 + (Math.sin(t) > 0 ? -15 : 15);
                } else if (oscope.signal === 'sine') {
                    y = 30 - Math.sin(t) * 15;
                } else if (oscope.signal === 'sawtooth') {
                    y = 30 - (((t / Math.PI) % 2) - 1) * 15;
                } else if (oscope.signal === 'pulse') {
                    y = 30 + (Math.sin(t) > 0.8 ? -15 : 15);
                } else if (oscope.signal === 'dc') {
                    y = 30 + Math.sin(t*0.5)*1 + (Math.random()-0.5)*3;
                }
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            if (!paused) {
                reqRef.current = requestAnimationFrame(drawSignal);
            }
        };

        if (oscope.visible && !paused) {
            reqRef.current = requestAnimationFrame(drawSignal);
        } else if (paused && reqRef.current) {
             cancelAnimationFrame(reqRef.current);
             reqRef.current = null;
        }

        return () => {
            if (reqRef.current) {
                cancelAnimationFrame(reqRef.current);
                reqRef.current = null;
            }
        };
    }, [oscope.visible, oscope.signal, paused]);

    const handleNodeMouseEnter = (signal: string) => {
        setOscope(prev => ({ ...prev, visible: true, signal }));
    };
    const handleNodeMouseMove = (e: React.MouseEvent) => {
        setOscope(prev => ({ ...prev, x: e.clientX + 15, y: e.clientY + 15 }));
    };
    const handleNodeMouseLeave = () => {
        setOscope(prev => ({ ...prev, visible: false, signal: null }));
    };

    const used_types: { fill: string, stroke: string, leg: string }[] = [];

    const renderedNodes = Object.keys(geom.nodes).map(nid => {
        const n = geom.nodes[nid];
        const isFlow = mode === "flow";
        const isArch = mode !== "flow";
        const fillStrokeLeg = TYPE_STYLE[n.type || "external"] || TYPE_STYLE["external"];
        if (isArch && !used_types.some(u => u.leg === fillStrokeLeg[2])) {
            used_types.push({ fill: fillStrokeLeg[0], stroke: fillStrokeLeg[1], leg: fillStrokeLeg[2] });
        }
        
        let nodeBody = null;
        if (isFlow) {
            if (n.shape === "pill") {
                nodeBody = <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={20} fill={FLOW_PILL_FILL} stroke={FLOW_PILL_STROKE} strokeWidth={1.5} />;
            } else if (n.shape === "decision") {
                nodeBody = <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={FLOW_NODE_FILL} stroke={FLOW_NODE_STROKE} strokeDasharray="4 3" />;
            } else {
                nodeBody = <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={FLOW_NODE_FILL} stroke={FLOW_NODE_STROKE} />;
            }
        } else if (mode === "circuit") {
            const st = "#00E0B8";
            const fill = "rgba(0,224,184,0.05)";
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
        } else {
            const fill = fillStrokeLeg[0];
            const stroke = fillStrokeLeg[1];
            const st = n.semStroke || stroke;
            const dashProps = n.semDash ? { strokeDasharray: n.semDash } : {};
            nodeBody = (
                <>
                    <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill="var(--color-bg)" />
                    <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={8} fill={fill} stroke={st} strokeWidth={1.5} {...dashProps} />
                </>
            );
        }

        const cx = n.x + n.w / 2;
        const cy = n.y + n.h / 2;
        let nodeText = null;
        if (n.shape === "point") {
            // Text outside the point
            nodeText = (
                <>
                    <text x={cx} y={n.y - 12} fill="var(--color-fg)" fontSize="13" fontWeight="500">{n.labelLines[0]}</text>
                    {n.sublabel && <text x={cx} y={n.y + n.h + 16} fill="var(--color-muted)" fontSize="11">{n.sublabel}</text>}
                </>
            );
        } else if (n.sublabel) {
            const ly = n.y + (n.h - 18) / 2 + 4;
            if (n.labelLines.length === 1) {
                nodeText = (
                    <>
                        <text x={cx} y={ly} fill="var(--color-fg)" fontSize="13" fontWeight="500">{n.labelLines[0]}</text>
                        <text x={cx} y={n.y + n.h - 10} fill="var(--color-muted)" fontSize="10">{n.sublabel}</text>
                    </>
                );
            } else {
                nodeText = (
                    <>
                        <text x={cx} y={ly - 7} fill="var(--color-fg)" fontSize="13" fontWeight="500">
                            <tspan x={cx}>{n.labelLines[0]}</tspan>
                            <tspan x={cx} dy="15">{n.labelLines[1]}</tspan>
                        </text>
                        <text x={cx} y={n.y + n.h - 10} fill="var(--color-muted)" fontSize="10">{n.sublabel}</text>
                    </>
                );
            }
        } else {
            const weight = n.shape === "pill" ? "600" : "500";
            if (n.labelLines.length === 1) {
                nodeText = <text x={cx} y={cy + 4} fill="var(--color-fg)" fontSize="13" fontWeight={weight}>{n.labelLines[0]}</text>;
            } else {
                nodeText = (
                    <text x={cx} y={cy - 3} fill="var(--color-fg)" fontSize="13" fontWeight={weight}>
                        <tspan x={cx}>{n.labelLines[0]}</tspan>
                        <tspan x={cx} dy="15">{n.labelLines[1]}</tspan>
                    </text>
                );
            }
        }

        const gProps = n.signal ? {
            className: "signal-node",
            "data-signal": n.signal,
            style: { cursor: "crosshair" },
            onMouseEnter: () => handleNodeMouseEnter(n.signal!),
            onMouseMove: handleNodeMouseMove,
            onMouseLeave: handleNodeMouseLeave,
        } : {};

        return (
            <g key={`node-${nid}`} {...gProps}>
                {nodeBody}
                {nodeText}
            </g>
        );
    });

    const labelNodes: React.ReactNode[] = [];
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

    const renderedEdges = geom.edges.map((e: any, i: number) => {
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
            labelNodes.push(<text key={`edge-label-${i}`} x={e.labelPos[0]} y={e.labelPos[1]} fill="var(--color-muted)" fontSize="10">{e.label}</text>);
        }

        return <path key={`edge-${i}`} className={cls} d={e.d} stroke={stroke} strokeWidth={width} opacity={opacity} markerEnd={marker} />;
    });

    const renderedGroups = Object.keys(geom.groups).map(gid => {
        const g = geom.groups[gid];
        if (!g.box) return null;
        const [x, y, w, h] = g.box;
        let stroke = mode === "circuit" ? "rgba(0,224,184,0.6)" : "#fbbf24";
        let dash = "8 4", fs = 11, rx = 12;
        if (g.kind === "subnet") {
            stroke = "#fb7185"; dash = "4 4"; fs = 10; rx = 8;
        }
        return (
            <React.Fragment key={`group-${gid}`}>
                <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray={dash} opacity="0.8" />
                <text x={x + 14} y={y + 18} fill={stroke} fontSize={fs} opacity="0.9">{g.label}</text>
            </React.Fragment>
        );
    });

    const dotDefault = mode === "flow" ? FLOW_DOT : ARCH_DOT;
    const dotSvg: React.ReactNode[] = [];
    geom.journeys.forEach((j: any, ji: number) => {
        const color = j.color || dotDefault;
        let prevId: string | null = null;
        const lastId = `j${ji}_${j.hops.length - 1}`;
        j.hops.forEach((hop: any, hi: number) => {
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

    const legendNodes: React.ReactNode[] = [];
    let adjustedH = H;
    let adjustedW = W;
    if (mode !== "flow") {
        let ly = H - BOTTOM_PAD + 6;
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
            geom.legendExtra.forEach((ex: any, i: number) => {
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

    return (
        <div className="flex flex-col items-center justify-center w-full relative my-8 rounded-xl border border-white/5 shadow-xl bg-[#060d20]/50 overflow-hidden">
            <style dangerouslySetInnerHTML={{__html: `
                :root {
                  --color-bg: #0a0a0a;
                  --color-fg: #e2e8f0;
                  --color-muted: #94a3b8;
                  --color-border: #1e293b;
                  --color-border-hover: #334155;
                  --color-grid-line: #0f1b33;
                  --color-card-bg: #060d20;
                }
                .flow { stroke-dasharray: 5 5; }
                .flow-async { stroke-dasharray: 2 4; }
                .flow-auth { stroke-dasharray: 4 4; }
                @media (prefers-reduced-motion: no-preference) {
                    .flow { animation: dashmove 0.75s linear infinite; }
                    .flow-async { animation: dashasync 0.9s linear infinite; }
                    .flow-auth { animation: dashauth 1.2s linear infinite; }
                }
                @keyframes dashmove { to { stroke-dashoffset: -10; } }
                @keyframes dashasync { to { stroke-dashoffset: -12; } }
                @keyframes dashauth { to { stroke-dashoffset: -8; } }
                .paused .flow, .paused .flow-async, .paused .flow-auth { animation-play-state: paused; }
            `}} />
            
            <div className={`relative flex items-center justify-center w-full pt-12 pb-8 px-6 ${paused ? 'paused' : ''}`}>
                <button 
                    onClick={() => setPaused(!paused)}
                    className="absolute top-4 right-4 z-20 bg-[#060d20]/80 backdrop-blur-sm border border-[#1e293b] text-[#94a3b8] rounded-md px-3 py-1.5 text-[11px] font-medium hover:text-[#e2e8f0] hover:border-[#334155] cursor-pointer transition-all"
                    aria-pressed={paused}
                >
                    {paused ? '▶ play' : '⏸ pause'}
                </button>
                <svg ref={svgRef} id="flowsvg" className="max-w-full h-auto" width={adjustedW} height={adjustedH} viewBox={`0 0 ${adjustedW} ${adjustedH}`} role="img">
                    <title>{geom.title} animated diagram</title>
                    <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </marker>
                    </defs>
                    {mode !== "flow" && renderedGroups}
                    <g fill="none">
                        {renderedEdges}
                    </g>
                    {labelNodes}
                    <g>
                        {dotSvg}
                    </g>
                    <g fontFamily="Inter, monospace" textAnchor="middle">
                        {renderedNodes}
                    </g>
                    {legendNodes.length > 0 && (
                        <g fontFamily="Inter, monospace" fontSize="11">
                            {legendNodes}
                        </g>
                    )}
                </svg>
            </div>

            {mode !== "flow" && geom.summary && geom.summary.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-5 w-full max-w-5xl px-4">
                    {geom.summary.map((c: any, i: number) => {
                        let accentBg = "bg-[#7C5CFF]";
                        if (c.accent === "violet") accentBg = "bg-[#a78bfa]";
                        if (c.accent === "rose") accentBg = "bg-[#fb7185]";
                        return (
                            <div key={`summary-${i}`} className="border border-[#1e293b] rounded-[10px] bg-[#060d20] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${accentBg}`}></div>
                                    <h3 className="text-[0.8rem] font-semibold text-[#e2e8f0] m-0">{c.title}</h3>
                                </div>
                                <ul className="list-none p-0 m-0">
                                    {c.items?.map((it: string, j: number) => (
                                        <li key={`item-${i}-${j}`} className="text-[0.72rem] text-[#94a3b8] leading-relaxed">• {it}</li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}
            {geom.footer && <p className="text-[#475569] text-[0.7rem] mt-4">{geom.footer}</p>}

            {/* Oscilloscope Tooltip */}
            <div 
                className="fixed pointer-events-none transition-opacity duration-100 bg-[#060d20] border border-[#1e293b] rounded-lg p-2 z-[100] shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] text-[#00E0B8] font-mono"
                style={{
                    opacity: oscope.visible ? 1 : 0,
                    left: oscope.x,
                    top: oscope.y
                }}
            >
                <div className="text-[10px] text-[#94a3b8] mb-1 uppercase tracking-widest">
                    Signal: {oscope.signal}
                </div>
                <canvas ref={canvasRef} width="160" height="60" className="block w-[160px] h-[60px]" />
            </div>
        </div>
    );
}
