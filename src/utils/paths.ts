import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

const home = homedir();

export function expandHome(p: string): string {
  if (p.startsWith("~")) {
    return join(home, p.slice(1));
  }
  return p;
}

export function contractHome(p: string): string {
  if (p.startsWith(home)) {
    return "~" + p.slice(home.length);
  }
  return p;
}

export function getProjectRoot(): string {
  return process.cwd();
}

export function resolveSkillsDir(
  relativeDir: string,
  scope: "global" | "project",
  globalDir?: string,
): string {
  if (scope === "global") {
    return globalDir ?? expandHome(join("~", relativeDir));
  }
  return resolve(getProjectRoot(), relativeDir);
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(p: string): Promise<boolean> {
  try {
    const { stat } = await import("node:fs/promises");
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}
