import * as p from "@clack/prompts";
import { rm, readFile, writeFile } from "node:fs/promises";
import { readLockFile } from "../core/lock-file.js";
import { getAllInstalledSkills } from "../core/filesystem.js";
import {
  getActiveAgentDirs,
  getAgentDisplayName,
  getDetectedAgents,
} from "../core/agents.js";
import { getProjectRoot, pathExists } from "../utils/paths.js";
import { LOCK_FILE_PATH, AGENTS_SKILLS_DIR } from "../constants.js";
import { formatCount } from "../utils/format.js";
import { colors, nextSteps } from "../utils/ui.js";
import type { InstalledSkill, SkillLockFile } from "../types.js";
import { join } from "node:path";

export async function removeSkills(): Promise<void> {
  const s = p.spinner();
  s.start("Scanning installed skills...");

  const lock = await readLockFile();
  const projectRoot = getProjectRoot();
  const agentDirs = await getActiveAgentDirs("all", projectRoot);
  const skills = await getAllInstalledSkills(agentDirs, lock);

  s.stop(`Found ${formatCount(skills.length, "skill")}`);

  if (skills.length === 0) {
    p.log.info("No skills installed.");
    return;
  }

  const selected = await p.multiselect({
    message: "Select skills to remove:",
    options: skills.map((skill) => ({
      value: skill.name,
      label: `${skill.name}  ${colors.agents(skill.agents.map(getAgentDisplayName).join(", "))}  ${colors.scope(skill.scope)}`,
    })),
    required: true,
  });

  if (p.isCancel(selected)) return;

  const names = selected as string[];
  const confirm = await p.confirm({
    message: `Remove ${formatCount(names.length, "skill")}? This cannot be undone.`,
  });

  if (p.isCancel(confirm) || !confirm) return;

  const removed: string[] = [];
  const failed: string[] = [];

  for (const name of names) {
    const skill = skills.find((sk) => sk.name === name);
    if (!skill) continue;

    const removeSpinner = p.spinner();
    removeSpinner.start(`Removing ${name}...`);

    try {
      await removeSkillFromDisk(skill);
      await removeFromLockFile(name);
      removeSpinner.stop(colors.success(`Removed ${name}`));
      removed.push(name);
    } catch (err) {
      removeSpinner.stop(colors.error(`Failed to remove ${name}`));
      p.log.error(
        `Could not remove ${colors.skillName(name)}: ${(err as Error).message}\n` +
          colors.muted("Check file permissions and try again."),
      );
      failed.push(name);
    }
  }

  // Summary
  if (removed.length > 0) {
    nextSteps("Removal complete", [
      `Removed: ${removed.map((n) => colors.skillName(n)).join(", ")}`,
      ...(failed.length > 0
        ? [`Failed: ${failed.map((n) => colors.error(n)).join(", ")}`]
        : []),
      "Run 'List Installed Skills' to verify",
    ]);
  }
}

/**
 * Remove a skill from disk:
 * 1. Remove symlinks/dirs from all agent skills directories
 * 2. Remove canonical directory from ~/.agents/skills/
 */
async function removeSkillFromDisk(skill: InstalledSkill): Promise<void> {
  const detectedAgents = await getDetectedAgents();
  const projectRoot = getProjectRoot();

  // Remove from all agent skills dirs (both global and project)
  for (const agent of detectedAgents) {
    for (const [baseDir] of [
      [agent.globalSkillsDir],
      [join(projectRoot, agent.skillsDir)],
    ]) {
      const skillPath = join(baseDir, skill.name);
      if (await pathExists(skillPath)) {
        await rm(skillPath, { recursive: true, force: true });
      }
    }
  }

  // Remove canonical path in ~/.agents/skills/
  const canonicalPath = skill.canonicalPath ?? skill.path;
  if (canonicalPath.startsWith(AGENTS_SKILLS_DIR) && (await pathExists(canonicalPath))) {
    await rm(canonicalPath, { recursive: true, force: true });
  }
}

/**
 * Remove a skill entry from the lock file.
 */
async function removeFromLockFile(skillName: string): Promise<void> {
  if (!(await pathExists(LOCK_FILE_PATH))) return;

  try {
    const raw = await readFile(LOCK_FILE_PATH, "utf-8");
    const lock: SkillLockFile = JSON.parse(raw);

    if (lock.skills[skillName]) {
      delete lock.skills[skillName];
      await writeFile(LOCK_FILE_PATH, JSON.stringify(lock, null, 2));
    }
  } catch {
    // Lock file is non-critical, don't fail the whole removal
  }
}
