import * as p from "@clack/prompts";
import pc from "picocolors";

/**
 * Semantic color conventions used across all features.
 * Centralizes color usage so the TUI is visually consistent.
 */
export const colors = {
  // Status
  success: pc.green,
  error: pc.red,
  warn: pc.yellow,
  info: pc.blue,

  // Content
  muted: pc.dim,
  accent: pc.cyan,
  bold: pc.bold,
  heading: (s: string) => pc.bold(pc.cyan(s)),

  // Domain-specific
  skillName: pc.bold,
  source: pc.dim,
  agents: pc.cyan,
  scope: pc.dim,
  path: pc.dim,
  date: pc.dim,
  count: pc.cyan,
  label: pc.dim,
} as const;

/**
 * Display a "next steps" note after a successful operation.
 */
export function nextSteps(title: string, steps: string[]): void {
  const body = steps.map((s) => `  ${colors.accent(">")} ${s}`).join("\n");
  p.note(body, title);
}

/**
 * Build a formatted table string with aligned columns.
 * Strips ANSI codes for width calculation so colored text aligns correctly.
 */
export function formatTable(
  rows: string[][],
  opts?: { padding?: number },
): string {
  if (rows.length === 0) return "";

  const padding = opts?.padding ?? 2;
  const colCount = Math.max(...rows.map((r) => r.length));

  // Calculate max visible width per column (strip ANSI for measurement)
  const widths: number[] = new Array(colCount).fill(0);
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const visible = stripAnsi(row[i] ?? "").length;
      if (visible > widths[i]) widths[i] = visible;
    }
  }

  // Build aligned lines
  return rows
    .map((row) =>
      row
        .map((cell, i) => {
          if (i === row.length - 1) return cell; // no padding on last column
          const visible = stripAnsi(cell).length;
          const pad = widths[i] - visible + padding;
          return cell + " ".repeat(Math.max(pad, 1));
        })
        .join(""),
    )
    .join("\n");
}

// Strip ANSI escape codes for width calculation
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, "");
}
