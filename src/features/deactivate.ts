import * as p from "@clack/prompts";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join, dirname } from "node:path";
import { readLockFile } from "../core/lock-file.js";
import { getAllInstalledSkills, isSymlink, resolveCanonicalPath } from "../core/filesystem.js";
import { getActiveAgentDirs, getAgentDisplayName, getDetectedAgents } from "../core/agents.js";
import { getProjectRoot, pathExists } from "../utils/paths.js";
import { DISABLED_MANIFEST_PATH, AGENTS_SKILLS_DIR } from "../constants.js";
import { formatCount } from "../utils/format.js";
import { colors, nextSteps } from "../utils/ui.js";
import type { DisabledManifest, DisabledSkillEntry, InstalledSkill } from "../types.js";

// --- Manifest I/O ---

async function readManifest(): Promise<DisabledManifest> {
  if (!(await pathExists(DISABLED_MANIFEST_PATH))) {
    return { version: 1, skills: {} };
  }
  try {
    const raw = await readFile(DISABLED_MANIFEST_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { version: 1, skills: {} };
  }
}

async function writeManifest(manifest: DisabledManifest): Promise<void> {
  await mkdir(dirname(DISABLED_MANIFEST_PATH), { recursive: true });
  await writeFile(DISABLED_MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

// --- Disable ---

async function ensureDisabledDir(baseDir: string): Promise<string> {
  const disabledDir = join(baseDir, ".disabled");
  await mkdir(disabledDir, { recursive: true });
  return disabledDir;
}

async function disableSkill(skill: InstalledSkill): Promise<void> {
  const manifest = await readManifest();
  const entry: DisabledSkillEntry = {
    canonicalPath: skill.canonicalPath ?? skill.path,
    agentLinks: {},
    disabledAt: new Date().toISOString(),
  };

  // Move agent-specific skill dirs to .disabled/
  const detectedAgents = await getDetectedAgents();
  for (const agent of detectedAgents) {
    for (const scope of ["global", "project"] as const) {
      const baseDir = scope === "global"
        ? agent.globalSkillsDir
        : join(getProjectRoot(), agent.skillsDir);

      const skillPath = join(baseDir, skill.name);
      if (!(await pathExists(skillPath))) continue;

      const wasSymlink = await isSymlink(skillPath);
      entry.agentLinks[`${agent.name}:${scope}`] = {
        path: skillPath,
        wasSymlink,
      };

      const disabledDir = await ensureDisabledDir(baseDir);
      const targetPath = join(disabledDir, skill.name);

      if (!(await pathExists(targetPath))) {
        await rename(skillPath, targetPath);
      }
    }
  }

  // Also move canonical path if in ~/.agents/skills/
  const canonicalPath = skill.canonicalPath ?? skill.path;
  if (canonicalPath.startsWith(AGENTS_SKILLS_DIR)) {
    const canonicalDisabled = await ensureDisabledDir(AGENTS_SKILLS_DIR);
    const targetCanonical = join(canonicalDisabled, skill.name);
    if (await pathExists(canonicalPath) && !(await pathExists(targetCanonical))) {
      await rename(canonicalPath, targetCanonical);
    }
  }

  manifest.skills[skill.name] = entry;
  await writeManifest(manifest);
}

// --- Re-enable ---

async function reactivateSkill(name: string): Promise<void> {
  const manifest = await readManifest();
  const entry = manifest.skills[name];
  if (!entry) return;

  // Restore canonical path first
  if (entry.canonicalPath.startsWith(AGENTS_SKILLS_DIR)) {
    const disabledPath = join(AGENTS_SKILLS_DIR, ".disabled", name);
    if (await pathExists(disabledPath)) {
      await rename(disabledPath, entry.canonicalPath);
    }
  }

  // Restore agent links
  for (const [key, link] of Object.entries(entry.agentLinks)) {
    const disabledDir = join(dirname(link.path), ".disabled");
    const disabledPath = join(disabledDir, name);

    if (await pathExists(disabledPath)) {
      if (link.wasSymlink) {
        // Re-create symlink
        const { symlink } = await import("node:fs/promises");
        const canonical = await resolveCanonicalPath(disabledPath);
        if (canonical) {
          // Remove from disabled, create symlink at original location
          await rename(disabledPath, disabledPath + ".tmp");
          try {
            await symlink(entry.canonicalPath, link.path);
            const { rm } = await import("node:fs/promises");
            await rm(disabledPath + ".tmp", { recursive: true });
          } catch {
            // Fallback: just move back
            await rename(disabledPath + ".tmp", link.path);
          }
        }
      } else {
        await rename(disabledPath, link.path);
      }
    }
  }

  delete manifest.skills[name];
  await writeManifest(manifest);
}

// --- UI ---

export async function deactivateReactivate(): Promise<void> {
  const mode = await p.select({
    message: "Choose action:",
    options: [
      { value: "deactivate", label: "Deactivate skills", hint: "temporarily disable" },
      { value: "reactivate", label: "Reactivate skills", hint: "re-enable disabled skills" },
    ],
  });

  if (p.isCancel(mode)) return;

  if (mode === "deactivate") {
    await handleDeactivate();
  } else {
    await handleReactivate();
  }
}

async function handleDeactivate(): Promise<void> {
  const s = p.spinner();
  s.start("Scanning installed skills...");

  const lock = await readLockFile();
  const projectRoot = getProjectRoot();
  const agentDirs = await getActiveAgentDirs("all", projectRoot);
  const skills = await getAllInstalledSkills(agentDirs, lock);

  // Filter out already disabled
  const manifest = await readManifest();
  const activeSkills = skills.filter((sk) => !manifest.skills[sk.name]);

  s.stop(`Found ${formatCount(activeSkills.length, "active skill")}`);

  if (activeSkills.length === 0) {
    p.log.info("No active skills to deactivate.");
    return;
  }

  const selected = await p.multiselect({
    message: "Select skills to deactivate:",
    options: activeSkills.map((sk) => ({
      value: sk.name,
      label: `${sk.name}  ${colors.agents(sk.agents.map(getAgentDisplayName).join(", "))}`,
    })),
    required: true,
  });

  if (p.isCancel(selected)) return;

  const names = selected as string[];
  const confirm = await p.confirm({
    message: `Deactivate ${formatCount(names.length, "skill")}? (can be reactivated later)`,
  });

  if (p.isCancel(confirm) || !confirm) return;

  const deactivated: string[] = [];
  const failed: string[] = [];

  for (const name of names) {
    const skill = activeSkills.find((sk) => sk.name === name);
    if (!skill) continue;

    const ds = p.spinner();
    ds.start(`Deactivating ${name}...`);

    try {
      await disableSkill(skill);
      ds.stop(colors.success(`Deactivated ${name}`));
      deactivated.push(name);
    } catch (err) {
      ds.stop(colors.error(`Failed to deactivate ${name}`));
      p.log.error((err as Error).message);
      failed.push(name);
    }
  }

  if (deactivated.length > 0) {
    nextSteps("Deactivation complete", [
      `Deactivated ${formatCount(deactivated.length, "skill")}: ${deactivated.map((n) => colors.skillName(n)).join(", ")}`,
      ...(failed.length > 0
        ? [`Failed: ${failed.map((n) => colors.error(n)).join(", ")}`]
        : []),
      "Use 'Reactivate' to re-enable these skills later",
    ]);
  }
}

async function handleReactivate(): Promise<void> {
  const manifest = await readManifest();
  const disabledNames = Object.keys(manifest.skills);

  if (disabledNames.length === 0) {
    p.log.info("No deactivated skills found.");
    return;
  }

  const selected = await p.multiselect({
    message: "Select skills to reactivate:",
    options: disabledNames.map((name) => ({
      value: name,
      label: `${name}  ${colors.date(`disabled ${manifest.skills[name].disabledAt.split("T")[0]}`)}`,
    })),
    required: true,
  });

  if (p.isCancel(selected)) return;

  const names = selected as string[];
  const reactivated: string[] = [];
  const failed: string[] = [];

  for (const name of names) {
    const rs = p.spinner();
    rs.start(`Reactivating ${name}...`);

    try {
      await reactivateSkill(name);
      rs.stop(colors.success(`Reactivated ${name}`));
      reactivated.push(name);
    } catch (err) {
      rs.stop(colors.error(`Failed to reactivate ${name}`));
      p.log.error((err as Error).message);
      failed.push(name);
    }
  }

  if (reactivated.length > 0) {
    nextSteps("Reactivation complete", [
      `Reactivated ${formatCount(reactivated.length, "skill")}: ${reactivated.map((n) => colors.skillName(n)).join(", ")}`,
      ...(failed.length > 0
        ? [`Failed: ${failed.map((n) => colors.error(n)).join(", ")}`]
        : []),
      "These skills are now active for their assigned agents",
    ]);
  }
}
