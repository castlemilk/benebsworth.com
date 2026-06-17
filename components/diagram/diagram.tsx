"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layout, geometry } from "../../lib/diagram/layout";
import { FLOW_DOT, ARCH_DOT } from "./diagram-constants";
import { FlowNodes, CircuitNodes, ArchitectureNodes, renderLoopNotes } from "./diagram-nodes";
import type { NodeHandlers } from "./diagram-nodes";
import { renderEdges, renderJourneyDots, renderLegend } from "./diagram-edges";

export function Diagram({ data }: { data: Record<string, unknown> }) {
    const geom = useMemo(() => {
        const lo = new Layout(data);
        lo.run();
        return geometry(lo);
    }, [data]);

    const mode = geom.mode;

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
                const t = (x - timeRef.current) * 0.1;
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

    const handlers: NodeHandlers = {
        onMouseEnter: handleNodeMouseEnter,
        onMouseMove: handleNodeMouseMove,
        onMouseLeave: handleNodeMouseLeave,
    };

    const renderedNodes = mode === "flow"
        ? FlowNodes({ geom, handlers })
        : mode === "circuit"
        ? CircuitNodes({ geom, handlers })
        : ArchitectureNodes({ geom, handlers });

    const loopNotes = renderLoopNotes(geom);
    const { edges: renderedEdges, labels: edgeLabels } = renderEdges(geom, mode);
    const labelNodes: React.ReactNode[] = [...loopNotes, ...edgeLabels];

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
    const dotSvg = renderJourneyDots(geom, mode, dotDefault);

    const { legendNodes, adjustedW, adjustedH } = renderLegend(geom, mode);

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
                .electron-flow { stroke-dasharray: 2 8; }
                .electron-async { stroke-dasharray: 2 12; }
                @media (prefers-reduced-motion: no-preference) {
                    .flow { animation: dashmove 0.75s linear infinite; }
                    .flow-async { animation: dashasync 0.9s linear infinite; }
                    .flow-auth { animation: dashauth 1.2s linear infinite; }
                    .electron-flow { animation: dashmove 0.5s linear infinite; }
                    .electron-async { animation: dashmove 1.0s linear infinite; }
                }
                @keyframes dashmove { to { stroke-dashoffset: -10; } }
                @keyframes dashasync { to { stroke-dashoffset: -12; } }
                @keyframes dashauth { to { stroke-dashoffset: -8; } }
                .paused .flow, .paused .flow-async, .paused .flow-auth, .paused .electron-flow, .paused .electron-async { animation-play-state: paused; }
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
                    {geom.summary.map((c, i: number) => {
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
