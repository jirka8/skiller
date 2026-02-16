import pc from "picocolors";
import { contractHome } from "./paths.js";

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

export function formatPath(p: string, maxLen = 50): string {
  return truncate(contractHome(p), maxLen);
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatRelativeDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch {
    return iso;
  }
}

export function formatSkillRow(
  name: string,
  source: string,
  agents: string[],
  scope: string,
): string {
  const agentStr = agents.length > 3
    ? `${agents.slice(0, 3).join(", ")} +${agents.length - 3}`
    : agents.join(", ");

  return `${pc.bold(name)}  ${pc.dim(source)}  ${pc.cyan(agentStr)}  ${pc.dim(scope)}`;
}

export function formatCount(n: number, singular: string, plural?: string): string {
  const p = plural ?? singular + "s";
  return `${n} ${n === 1 ? singular : p}`;
}

export function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}
