import * as p from "@clack/prompts";
import { readLockFile } from "../core/lock-file.js";
import { getAllInstalledSkills } from "../core/filesystem.js";
import { getActiveAgentDirs, getAgentDisplayName } from "../core/agents.js";
import { getProjectRoot } from "../utils/paths.js";
import { formatRelativeDate, formatCount } from "../utils/format.js";
import { colors } from "../utils/ui.js";
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

  // Sort: global first, then alphabetical within each scope
  const sorted = [...skills].sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === "global" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Interactive browse loop
  let browsing = true;
  while (browsing) {
    const globalCount = sorted.filter((sk) => sk.scope === "global").length;
    const projectCount = sorted.filter((sk) => sk.scope === "project").length;

    const scopeHint = [
      globalCount > 0 ? `${globalCount} global` : "",
      projectCount > 0 ? `${projectCount} project` : "",
    ]
      .filter(Boolean)
      .join(", ");

    const selected = await p.select({
      message: `Installed Skills (${skills.length} — ${scopeHint}) — type to filter:`,
      options: [
        ...sorted.map((sk) => {
          const agents = sk.agents.map(getAgentDisplayName).join(", ");
          const source = sk.lockEntry?.source ?? "";
          return {
            value: sk.name,
            label: `${sk.name}  ${colors.agents(agents)}`,
            hint: [sk.scope, source].filter(Boolean).join(" · "),
          };
        }),
        { value: "__back__", label: colors.muted("Back to menu") },
      ],
    });

    if (p.isCancel(selected) || selected === "__back__") {
      browsing = false;
      break;
    }

    const skill = sorted.find((sk) => sk.name === selected);
    if (skill) {
      showSkillDetails(skill);
    }
  }
}

function showSkillDetails(skill: InstalledSkill): void {
  const agents = skill.agents.map(getAgentDisplayName).join(", ");
  const lines = [
    `${colors.label("Name:")}        ${colors.skillName(skill.name)}`,
    `${colors.label("Scope:")}       ${skill.scope}`,
    `${colors.label("Agents:")}      ${colors.agents(agents)}`,
    `${colors.label("Path:")}        ${colors.path(skill.path)}`,
  ];

  if (skill.lockEntry?.source) {
    lines.push(`${colors.label("Source:")}      ${skill.lockEntry.source}`);
  }
  if (skill.metadata?.description) {
    lines.push(`${colors.label("Description:")}  ${skill.metadata.description}`);
  }
  if (skill.metadata?.version) {
    lines.push(`${colors.label("Version:")}     ${skill.metadata.version}`);
  }
  if (skill.lockEntry?.updatedAt) {
    lines.push(
      `${colors.label("Updated:")}     ${formatRelativeDate(skill.lockEntry.updatedAt)}`,
    );
  }
  if (skill.metadata?.tags?.length) {
    lines.push(
      `${colors.label("Tags:")}        ${colors.muted(skill.metadata.tags.join(", "))}`,
    );
  }

  p.note(lines.join("\n"), `Skill: ${skill.name}`);
}
