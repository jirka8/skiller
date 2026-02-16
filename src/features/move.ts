import * as p from "@clack/prompts";
import pc from "picocolors";
import { readLockFile } from "../core/lock-file.js";
import { getAllInstalledSkills } from "../core/filesystem.js";
import { getActiveAgentDirs, getDetectedAgents, getAgentDisplayName } from "../core/agents.js";
import { getProjectRoot } from "../utils/paths.js";
import { skillsRemove, skillsAdd } from "../core/skills-cli.js";
import { formatCount } from "../utils/format.js";
import type { SkillScope } from "../types.js";

export async function moveSkills(): Promise<void> {
  const s = p.spinner();
  s.start("Scanning installed skills...");

  const lock = await readLockFile();
  const projectRoot = getProjectRoot();
  const agentDirs = await getActiveAgentDirs("all", projectRoot);
  const skills = await getAllInstalledSkills(agentDirs, lock);

  s.stop(`Found ${formatCount(skills.length, "skill")}`);

  if (skills.length === 0) {
    p.log.info("No skills installed to move.");
    return;
  }

  const selected = await p.select({
    message: "Select skill to move:",
    options: skills.map((sk) => ({
      value: sk.name,
      label: `${pc.bold(sk.name)}  ${pc.dim(sk.scope)}  ${pc.dim(sk.agents.map(getAgentDisplayName).join(", "))}`,
    })),
  });

  if (p.isCancel(selected)) return;

  const skill = skills.find((sk) => sk.name === selected)!;
  const source = skill.lockEntry?.source;

  if (!source) {
    p.log.error("Cannot move skill: source info missing from lock file.");
    return;
  }

  const moveType = await p.select({
    message: "What kind of move?",
    options: [
      {
        value: "scope",
        label: `Change scope (currently: ${skill.scope})`,
        hint: skill.scope === "global" ? "global → project" : "project → global",
      },
      {
        value: "agents",
        label: "Change target agents",
        hint: `currently: ${skill.agents.map(getAgentDisplayName).join(", ")}`,
      },
    ],
  });

  if (p.isCancel(moveType)) return;

  let newScope: SkillScope = skill.scope;
  let newAgents: string[] = skill.agents;

  if (moveType === "scope") {
    newScope = skill.scope === "global" ? "project" : "global";
    const confirm = await p.confirm({
      message: `Move ${pc.bold(skill.name)} from ${skill.scope} to ${newScope}?`,
    });
    if (p.isCancel(confirm) || !confirm) return;
  } else {
    const detectedAgents = await getDetectedAgents();
    const agents = await p.multiselect({
      message: "Select new target agents:",
      options: detectedAgents.map((a) => ({
        value: a.name,
        label: a.displayName,
        hint: skill.agents.includes(a.name) ? "currently installed" : undefined,
      })),
      required: true,
    });

    if (p.isCancel(agents)) return;
    newAgents = agents as string[];
  }

  // Execute: remove + reinstall
  const ms = p.spinner();
  ms.start(`Moving ${skill.name}...`);

  const removeResult = await skillsRemove(skill.name, {
    scope: skill.scope,
    agents: skill.agents,
  });

  if (!removeResult.success) {
    ms.stop(pc.red("Move failed during removal"));
    p.log.error(removeResult.output.trim());
    return;
  }

  const addResult = await skillsAdd(source, {
    scope: newScope,
    agents: newAgents,
  });

  if (addResult.success) {
    ms.stop(pc.green(`Moved ${skill.name} successfully`));
  } else {
    ms.stop(pc.red("Move failed during reinstall"));
    p.log.error(addResult.output.trim());
    p.log.warn(
      `The skill was removed but reinstall failed. You may need to reinstall manually: npx skills add ${source}`,
    );
  }
}
