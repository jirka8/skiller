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

  // Sort alphabetically
  const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));

  // Browse loop: filter → select → detail → repeat
  let browsing = true;
  while (browsing) {
    // Step 1: Filter prompt
    const query = await p.text({
      message: `Search installed skills (${skills.length} total) — or press Enter to show all:`,
      placeholder: "filter by name, source, agent...",
      defaultValue: "",
    });

    if (p.isCancel(query)) return;

    // Filter skills by query across name, source, agents, scope
    const q = (query ?? "").toLowerCase().trim();
    const filtered = q
      ? sorted.filter((sk) => {
          const agents = sk.agents.map(getAgentDisplayName).join(" ");
          const source = sk.lockEntry?.source ?? "";
          const haystack = `${sk.name} ${source} ${agents} ${sk.scope}`.toLowerCase();
          return haystack.includes(q);
        })
      : sorted;

    if (filtered.length === 0) {
      p.log.warn(`No skills matching "${q}". Try a different filter.`);
      continue;
    }

    // Step 2: Select from filtered list
    const selected = await p.select({
      message: `${filtered.length} skill${filtered.length === 1 ? "" : "s"} found:`,
      options: [
        ...filtered.map((sk) => {
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

    // Step 3: Show detail
    const skill = sorted.find((sk) => sk.name === selected);
    if (skill) {
      showSkillDetails(skill);
      // Pause so the user can read the detail before looping
      const next = await p.select({
        message: "Continue:",
        options: [
          { value: "browse", label: "Browse more skills" },
          { value: "back", label: "Back to menu" },
        ],
      });
      if (p.isCancel(next) || next === "back") {
        browsing = false;
      }
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
