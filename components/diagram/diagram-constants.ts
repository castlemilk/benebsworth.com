export const FLOW_NODE_FILL = "rgba(16,185,129,0.04)";
export const FLOW_NODE_STROKE = "#10b981";
export const FLOW_PILL_FILL = "rgba(52,211,153,0.06)";
export const FLOW_PILL_STROKE = "#00E0B8";
export const FLOW_CONN = "#10b981";
export const FLOW_DOT = "#00E0B8";

export const ARCH_CONN = "#00E0B8";
export const ARCH_ASYNC = "#fb923c";
export const ARCH_AUTH = "#fb7185";
export const ARCH_DOT = "#7C5CFF";

export const MARGIN = 34.0;
export const BOTTOM_PAD = 44.0;

export const TYPE_STYLE: Record<string, [string, string, string]> = {
    "signal": ["rgba(124,92,255,0.15)", "#7C5CFF", "signal"],
    "backend":  ["rgba(0,224,184,0.15)", "#00E0B8", "block"],
    "database": ["rgba(76,29,149,0.45)", "#a78bfa", "data"],
    "cloud":    ["rgba(120,53,15,0.35)", "#fbbf24", "cloud infra"],
    "security": ["rgba(255,255,255,0.05)", "#fb7185", "security"],
    "bus":      ["rgba(154,52,18,0.35)", "#fb923c", "message bus"],
    "external": ["rgba(30,41,59,0.5)", "#94a3b8", "external"],
};
