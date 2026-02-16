import * as p from "@clack/prompts";
import { readLockFile, getLockEntries } from "../core/lock-file.js";
import { getAllInstalledSkills } from "../core/filesystem.js";
import { getDetectedAgents, getActiveAgentDirs } from "../core/agents.js";
import { getProjectRoot } from "../utils/paths.js";
import { formatRelativeDate } from "../utils/format.js";
import { colors, formatTable } from "../utils/ui.js";

export async function showDashboard(): Promise<void> {
  const s = p.spinner();
  s.start("Gathering dashboard data...");

  const lock = await readLockFile();
  const lockEntries = getLockEntries(lock);
  const detectedAgents = await getDetectedAgents();
  const projectRoot = getProjectRoot();
  const agentDirs = await getActiveAgentDirs("all", projectRoot);
  const allSkills = await getAllInstalledSkills(agentDirs, lock);

  s.stop("Dashboard ready");

  // Agent overview — aligned table
  const agentRows: string[][] = [
    [colors.label("Agent"), colors.label("Skills")],
  ];

  for (const agent of detectedAgents) {
    const agentSkills = allSkills.filter((sk) => sk.agents.includes(agent.name));
    const globalCount = agentSkills.filter((sk) => sk.scope === "global").length;
    const projectCount = agentSkills.filter((sk) => sk.scope === "project").length;

    const counts: string[] = [];
    if (globalCount > 0) counts.push(`${globalCount} global`);
    if (projectCount > 0) counts.push(`${projectCount} project`);

    agentRows.push([
      colors.bold(agent.displayName),
      counts.length > 0 ? colors.agents(counts.join(", ")) : colors.muted("no skills"),
    ]);
  }

  p.note(formatTable(agentRows), `Detected Agents (${detectedAgents.length})`);

  // Skills summary
  const globalSkills = allSkills.filter((sk) => sk.scope === "global");
  const projectSkills = allSkills.filter((sk) => sk.scope === "project");

  const summaryLines = [
    `Total unique skills: ${colors.bold(String(allSkills.length))}`,
    `Global: ${colors.count(String(globalSkills.length))}  Project: ${colors.count(String(projectSkills.length))}`,
    `Lock file entries: ${colors.muted(String(lockEntries.length))}`,
  ];

  // Recent activity — aligned table
  const sorted = [...lockEntries].sort(
    (a, b) => new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime(),
  );
  const recent = sorted.slice(0, 5);

  if (recent.length > 0) {
    summaryLines.push("");
    summaryLines.push(colors.bold("Recent activity:"));

    const recentRows: string[][] = [];
    for (const [name, entry] of recent) {
      recentRows.push([
        `  ${colors.skillName(name)}`,
        colors.source(entry.source),
        colors.date(formatRelativeDate(entry.updatedAt)),
      ]);
    }
    summaryLines.push(formatTable(recentRows));
  }

  p.note(summaryLines.join("\n"), "Skills Summary");
}
