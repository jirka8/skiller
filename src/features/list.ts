import * as p from "@clack/prompts";
import pc from "picocolors";
import { readLockFile } from "../core/lock-file.js";
import { getAllInstalledSkills } from "../core/filesystem.js";
import { getActiveAgentDirs, getAgentDisplayName } from "../core/agents.js";
import { getProjectRoot } from "../utils/paths.js";
import { formatPath, formatRelativeDate, formatCount } from "../utils/format.js";

export async function listSkills(): Promise<void> {
  const scope = await p.select({
    message: "Which scope?",
    options: [
      { value: "all" as const, label: "All (global + project)" },
      { value: "global" as const, label: "Global only" },
      { value: "project" as const, label: "Project only" },
    ],
  });

  if (p.isCancel(scope)) return;

  const s = p.spinner();
  s.start("Scanning for installed skills...");

  const lock = await readLockFile();
  const projectRoot = getProjectRoot();
  const agentDirs = await getActiveAgentDirs(scope, projectRoot);
  const skills = await getAllInstalledSkills(agentDirs, lock);

  s.stop(`Found ${formatCount(skills.length, "skill")}`);

  if (skills.length === 0) {
    p.note("No skills found. Use 'Search & Install' to add skills.", "Empty");
    return;
  }

  const lines: string[] = [];
  for (const skill of skills) {
    const agents = skill.agents.map(getAgentDisplayName).join(", ");
    const source = skill.lockEntry?.source ?? "";
    const updated = skill.lockEntry?.updatedAt
      ? formatRelativeDate(skill.lockEntry.updatedAt)
      : "";

    lines.push(
      `${pc.bold(skill.name)}` +
        (source ? `  ${pc.dim(source)}` : "") +
        `  ${pc.cyan(agents)}` +
        `  ${pc.dim(skill.scope)}` +
        (updated ? `  ${pc.dim(updated)}` : ""),
    );

    if (skill.metadata?.description) {
      lines.push(`  ${pc.dim(skill.metadata.description)}`);
    }
  }

  p.note(lines.join("\n"), `Installed Skills (${skills.length})`);
}
