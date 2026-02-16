import * as p from "@clack/prompts";
import { readLockFile } from "../core/lock-file.js";
import { getAllInstalledSkills } from "../core/filesystem.js";
import { getActiveAgentDirs, getAgentDisplayName } from "../core/agents.js";
import { getProjectRoot } from "../utils/paths.js";
import { formatRelativeDate, formatCount, truncate } from "../utils/format.js";
import { colors, formatTable } from "../utils/ui.js";
import type { InstalledSkill } from "../types.js";

export async function listSkills(): Promise<void> {
  const s = p.spinner();
  s.start("Scanning for installed skills...");

  const lock = await readLockFile();
  const projectRoot = getProjectRoot();
  const agentDirs = await getActiveAgentDirs("all", projectRoot);
  const skills = await getAllInstalledSkills(agentDirs, lock);

  s.stop(`Found ${formatCount(skills.length, "skill")}`);

  if (skills.length === 0) {
    p.note("No skills found. Use 'Search & Install' to add skills.", "Empty");
    return;
  }

  // Group by scope
  const globalSkills = skills.filter((sk) => sk.scope === "global");
  const projectSkills = skills.filter((sk) => sk.scope === "project");

  // Display each scope group
  if (globalSkills.length > 0) {
    displaySkillTable(globalSkills, `Global Skills (${globalSkills.length})`);
  }
  if (projectSkills.length > 0) {
    displaySkillTable(projectSkills, `Project Skills (${projectSkills.length})`);
  }

  // Post-list action
  const action = await p.select({
    message: "Action:",
    options: [
      { value: "back", label: "Back to menu" },
      ...(skills.length > 0
        ? [{ value: "details", label: "View skill details" }]
        : []),
    ],
  });

  if (p.isCancel(action) || action === "back") return;

  if (action === "details") {
    await viewSkillDetails(skills);
  }
}

function displaySkillTable(skills: InstalledSkill[], title: string): void {
  // Header row
  const header = [
    colors.label("Name"),
    colors.label("Source"),
    colors.label("Agents"),
    colors.label("Updated"),
  ];

  const rows: string[][] = [header];

  for (const skill of skills) {
    const agents = skill.agents.map(getAgentDisplayName).join(", ");
    const source = skill.lockEntry?.source ?? "";
    const updated = skill.lockEntry?.updatedAt
      ? formatRelativeDate(skill.lockEntry.updatedAt)
      : "";

    rows.push([
      colors.skillName(truncate(skill.name, 30)),
      colors.source(truncate(source, 25)),
      colors.agents(truncate(agents, 30)),
      colors.date(updated),
    ]);
  }

  p.note(formatTable(rows), title);
}

async function viewSkillDetails(skills: InstalledSkill[]): Promise<void> {
  const selected = await p.select({
    message: "Select a skill:",
    options: skills.map((sk) => ({
      value: sk.name,
      label: sk.name,
      hint: sk.lockEntry?.source,
    })),
  });

  if (p.isCancel(selected)) return;

  const skill = skills.find((sk) => sk.name === selected);
  if (!skill) return;

  const agents = skill.agents.map(getAgentDisplayName).join(", ");
  const lines = [
    `${colors.label("Name:")}       ${colors.skillName(skill.name)}`,
    `${colors.label("Scope:")}      ${skill.scope}`,
    `${colors.label("Agents:")}     ${colors.agents(agents)}`,
    `${colors.label("Path:")}       ${colors.path(skill.path)}`,
  ];

  if (skill.lockEntry?.source) {
    lines.push(`${colors.label("Source:")}     ${skill.lockEntry.source}`);
  }
  if (skill.metadata?.description) {
    lines.push(`${colors.label("Description:")} ${skill.metadata.description}`);
  }
  if (skill.metadata?.version) {
    lines.push(`${colors.label("Version:")}    ${skill.metadata.version}`);
  }
  if (skill.lockEntry?.updatedAt) {
    lines.push(
      `${colors.label("Updated:")}    ${formatRelativeDate(skill.lockEntry.updatedAt)}`,
    );
  }

  p.note(lines.join("\n"), `Skill: ${skill.name}`);
}
