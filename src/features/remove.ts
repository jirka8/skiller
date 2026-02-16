import * as p from "@clack/prompts";
import pc from "picocolors";
import { readLockFile } from "../core/lock-file.js";
import { getAllInstalledSkills } from "../core/filesystem.js";
import { getActiveAgentDirs, getAgentDisplayName } from "../core/agents.js";
import { getProjectRoot } from "../utils/paths.js";
import { skillsRemove } from "../core/skills-cli.js";
import { formatCount } from "../utils/format.js";

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
      label: `${skill.name}  ${pc.dim(skill.agents.map(getAgentDisplayName).join(", "))}  ${pc.dim(skill.scope)}`,
    })),
    required: true,
  });

  if (p.isCancel(selected)) return;

  const names = selected as string[];
  const confirm = await p.confirm({
    message: `Remove ${formatCount(names.length, "skill")}? This cannot be undone.`,
  });

  if (p.isCancel(confirm) || !confirm) return;

  for (const name of names) {
    const removeSpinner = p.spinner();
    removeSpinner.start(`Removing ${name}...`);

    const result = await skillsRemove(name);

    if (result.success) {
      removeSpinner.stop(pc.green(`Removed ${name}`));
    } else {
      removeSpinner.stop(pc.red(`Failed to remove ${name}`));
      p.log.error(result.output.trim());
    }
  }
}
