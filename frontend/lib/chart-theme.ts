/**
 * Shared Recharts theme — warm stone palette.
 * Import and spread into chart components for consistency.
 */

export const CHART_COLORS = {
  primary: "#57534e",
  secondary: "#a8a29e",
  tertiary: "#d6d3d1",
  accent: "#78716c",
  success: "#16a34a",
  warning: "#ca8a04",
  danger: "#dc2626",
} as const;

export const CHART_PALETTE = [
  "#57534e",
  "#78716c",
  "#a8a29e",
  "#d6d3d1",
  "#44403c",
  "#292524",
] as const;

export const CHART_STATUS_COLORS = {
  hit: "#16a34a",
  average: "#ca8a04",
  miss: "#dc2626",
} as const;

export const chartAxisStyle = {
  fontSize: 12,
  fontFamily: "var(--font-sans), system-ui, sans-serif",
  fill: "#a8a29e",
} as const;

export const chartGridStyle = {
  stroke: "#e7e5e4",
  strokeDasharray: "3 3",
} as const;

export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid #e7e5e4",
    borderRadius: "12px",
    boxShadow: "0 4px 16px -2px rgb(28 25 23 / 0.1)",
    padding: "8px 12px",
    fontSize: "13px",
    color: "#1c1917",
  },
  labelStyle: {
    color: "#57534e",
    fontWeight: 600,
    marginBottom: "4px",
  },
  cursor: { stroke: "#d6d3d1", strokeWidth: 1 },
} as const;
