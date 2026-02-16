import { readFile, readdir, lstat, realpath } from "node:fs/promises";
import { join, basename } from "node:path";
import matter from "gray-matter";
import { pathExists, isDirectory } from "../utils/paths.js";
import type { SkillMetadata, InstalledSkill, SkillLockFile } from "../types.js";
import { findLockEntry } from "./lock-file.js";
import { AGENTS_SKILLS_DIR } from "../constants.js";

export async function parseSkillMd(skillDir: string): Promise<SkillMetadata | undefined> {
  const skillMdPath = join(skillDir, "SKILL.md");
  if (!(await pathExists(skillMdPath))) return undefined;

  try {
    const raw = await readFile(skillMdPath, "utf-8");
    const { data } = matter(raw);
    return {
      name: data.name || basename(skillDir),
      version: data.version,
      description: data.description,
      author: data.author,
      tags: data.tags,
      globs: data.globs,
      ...data,
    };
  } catch {
    return { name: basename(skillDir) };
  }
}

export async function isSymlink(p: string): Promise<boolean> {
  try {
    const stats = await lstat(p);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

export async function resolveCanonicalPath(p: string): Promise<string | undefined> {
  try {
    return await realpath(p);
  } catch {
    return undefined;
  }
}

export async function scanSkillsDirectory(
  dir: string,
  scope: "global" | "project",
  agentName: string,
  lock?: SkillLockFile,
): Promise<InstalledSkill[]> {
  if (!(await pathExists(dir)) || !(await isDirectory(dir))) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const skills: InstalledSkill[] = [];

  for (const entry of entries) {
    // Skip hidden dirs (like .disabled)
    if (entry.name.startsWith(".")) continue;
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

    const skillPath = join(dir, entry.name);

    // Verify it's actually a directory (follow symlink)
    if (!(await isDirectory(skillPath))) continue;

    const metadata = await parseSkillMd(skillPath);
    const symlink = await isSymlink(skillPath);
    const canonical = symlink ? await resolveCanonicalPath(skillPath) : skillPath;
    const lockEntry = lock ? findLockEntry(lock, entry.name) : undefined;

    skills.push({
      name: entry.name,
      path: skillPath,
      scope,
      agents: [agentName],
      metadata,
      lockEntry,
      isSymlink: symlink,
      canonicalPath: canonical,
    });
  }

  return skills;
}

export function mergeSkillsByCanonical(skills: InstalledSkill[]): InstalledSkill[] {
  const map = new Map<string, InstalledSkill>();

  for (const skill of skills) {
    const key = skill.canonicalPath ?? skill.path;
    const existing = map.get(key);

    if (existing) {
      // Merge agents
      for (const agent of skill.agents) {
        if (!existing.agents.includes(agent)) {
          existing.agents.push(agent);
        }
      }
      // Prefer metadata from the one that has it
      if (!existing.metadata && skill.metadata) {
        existing.metadata = skill.metadata;
      }
      if (!existing.lockEntry && skill.lockEntry) {
        existing.lockEntry = skill.lockEntry;
      }
    } else {
      map.set(key, { ...skill });
    }
  }

  return Array.from(map.values());
}

export async function getAllInstalledSkills(
  agentDirs: Array<{
    dir: string;
    scope: "global" | "project";
    agentName: string;
  }>,
  lock?: SkillLockFile,
): Promise<InstalledSkill[]> {
  const allSkills: InstalledSkill[] = [];

  for (const { dir, scope, agentName } of agentDirs) {
    const skills = await scanSkillsDirectory(dir, scope, agentName, lock);
    allSkills.push(...skills);
  }

  return mergeSkillsByCanonical(allSkills);
}
