import { readFile } from "node:fs/promises";
import { LOCK_FILE_PATH } from "../constants.js";
import { pathExists } from "../utils/paths.js";
import type { SkillLockFile, SkillLockEntry } from "../types.js";

const EMPTY_LOCK: SkillLockFile = { version: 3, skills: {} };

export async function readLockFile(
  path: string = LOCK_FILE_PATH,
): Promise<SkillLockFile> {
  if (!(await pathExists(path))) {
    return EMPTY_LOCK;
  }

  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || !parsed.skills) {
      return EMPTY_LOCK;
    }

    return {
      version: parsed.version ?? 3,
      skills: parsed.skills as Record<string, SkillLockEntry>,
    };
  } catch {
    return EMPTY_LOCK;
  }
}

export function getLockEntries(lock: SkillLockFile): [string, SkillLockEntry][] {
  return Object.entries(lock.skills);
}

export function findLockEntry(
  lock: SkillLockFile,
  skillName: string,
): SkillLockEntry | undefined {
  // Try exact match first
  if (lock.skills[skillName]) {
    return lock.skills[skillName];
  }

  // Try case-insensitive match
  const lower = skillName.toLowerCase();
  for (const [key, entry] of Object.entries(lock.skills)) {
    if (key.toLowerCase() === lower) {
      return entry;
    }
  }

  return undefined;
}

export function getSkillSource(entry: SkillLockEntry): string {
  return entry.source || entry.sourceUrl || "unknown";
}
