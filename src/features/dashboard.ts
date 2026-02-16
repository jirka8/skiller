import * as p from "@clack/prompts";
import pc from "picocolors";
import { readLockFile, getLockEntries } from "../core/lock-file.js";
import { getAllInstalledSkills } from "../core/filesystem.js";
import { getDetectedAgents, getActiveAgentDirs } from "../core/agents.js";
import { getProjectRoot, contractHome } from "../utils/paths.js";
import { formatCount, formatRelativeDate } from "../utils/format.js";

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

  // Agent overview
  const agentLines: string[] = [];
  for (const agent of detectedAgents) {
    const agentSkills = allSkills.filter((s) => s.agents.includes(agent.name));
    const globalCount = agentSkills.filter((s) => s.scope === "global").length;
    const projectCount = agentSkills.filter((s) => s.scope === "project").length;

    const counts: string[] = [];
    if (globalCount > 0) counts.push(`${globalCount} global`);
    if (projectCount > 0) counts.push(`${projectCount} project`);

    agentLines.push(
      `${pc.bold(agent.displayName)}  ${counts.length > 0 ? pc.cyan(counts.join(", ")) : pc.dim("no skills")}`,
    );
  }

  p.note(agentLines.join("\n"), `Detected Agents (${detectedAgents.length})`);

  // Skills summary
  const globalSkills = allSkills.filter((s) => s.scope === "global");
  const projectSkills = allSkills.filter((s) => s.scope === "project");

  const summaryLines = [
    `Total unique skills: ${pc.bold(String(allSkills.length))}`,
    `Global: ${pc.cyan(String(globalSkills.length))}  Project: ${pc.cyan(String(projectSkills.length))}`,
    `Lock file entries: ${pc.dim(String(lockEntries.length))}`,
  ];

  // Recent activity
  const sorted = [...lockEntries].sort(
    (a, b) => new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime(),
  );
  const recent = sorted.slice(0, 5);

  if (recent.length > 0) {
    summaryLines.push("");
    summaryLines.push(pc.bold("Recent activity:"));
    for (const [name, entry] of recent) {
      summaryLines.push(
        `  ${name}  ${pc.dim(entry.source)}  ${pc.dim(formatRelativeDate(entry.updatedAt))}`,
      );
    }
  }

  p.note(summaryLines.join("\n"), "Skills Summary");
}
