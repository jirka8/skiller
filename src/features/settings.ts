import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  AGENTS_DIR,
  AGENTS_SKILLS_DIR,
  LOCK_FILE_PATH,
  DISABLED_MANIFEST_PATH,
  AGENT_REGISTRY,
} from "../constants.js";
import { getDetectedAgents } from "../core/agents.js";
import { readLockFile, getLockEntries } from "../core/lock-file.js";
import { contractHome, pathExists } from "../utils/paths.js";
import { isCommandAvailable, runCommand } from "../utils/process.js";
import { formatCount } from "../utils/format.js";

export async function showSettings(): Promise<void> {
  const action = await p.select({
    message: "Settings & Info",
    options: [
      { value: "overview", label: "System Overview", hint: "paths, versions, agents" },
      { value: "agents", label: "Agent Details", hint: "all detected agents with paths" },
      { value: "diagnostics", label: "Diagnostics", hint: "check for common issues" },
      { value: "help", label: "Quick Help", hint: "how to use Skiller" },
    ],
  });

  if (p.isCancel(action)) return;

  switch (action) {
    case "overview":
      await showOverview();
      break;
    case "agents":
      await showAgentDetails();
      break;
    case "diagnostics":
      await runDiagnostics();
      break;
    case "help":
      showHelp();
      break;
  }
}

async function showOverview(): Promise<void> {
  const s = p.spinner();
  s.start("Checking system...");

  const detectedAgents = await getDetectedAgents();
  const hasNpx = await isCommandAvailable("npx");
  const lockExists = await pathExists(LOCK_FILE_PATH);
  const manifestExists = await pathExists(DISABLED_MANIFEST_PATH);
  const lock = await readLockFile();
  const lockEntries = getLockEntries(lock);

  let npxSkillsVersion = "";
  if (hasNpx) {
    try {
      const result = await runCommand("npx", ["skills", "--version"], { timeoutMs: 10_000 });
      if (result.exitCode === 0) npxSkillsVersion = result.stdout.trim();
    } catch { /* ignore */ }
  }

  s.stop("System info ready");

  const lines = [
    pc.bold("Runtime"),
    `  Node.js:         ${process.version}`,
    `  npx:             ${hasNpx ? pc.green("available") : pc.red("not found — install Node.js >= 18")}`,
    `  skills CLI:      ${npxSkillsVersion ? pc.green(npxSkillsVersion) : pc.dim("not detected")}`,
    `  Platform:        ${process.platform} ${process.arch}`,
    "",
    pc.bold("Paths"),
    `  Working dir:     ${pc.dim(process.cwd())}`,
    `  Agents dir:      ${pc.dim(contractHome(AGENTS_DIR))}`,
    `  Skills store:    ${pc.dim(contractHome(AGENTS_SKILLS_DIR))}`,
    `  Lock file:       ${lockExists ? pc.green(contractHome(LOCK_FILE_PATH)) : pc.yellow("not found")}`,
    `  Disabled manifest: ${manifestExists ? pc.green(contractHome(DISABLED_MANIFEST_PATH)) : pc.dim("not created yet")}`,
    "",
    pc.bold("Stats"),
    `  Detected agents: ${pc.cyan(String(detectedAgents.length))} / ${AGENT_REGISTRY.length} registered`,
    `  Lock entries:    ${formatCount(lockEntries.length, "skill")}`,
    "",
    pc.dim("Tip: Use 'Agent Details' for per-agent paths, 'Diagnostics' to check for issues."),
  ];

  p.note(lines.join("\n"), "System Overview");
}

async function showAgentDetails(): Promise<void> {
  const s = p.spinner();
  s.start("Detecting agents...");

  const detectedAgents = await getDetectedAgents();

  s.stop(`${formatCount(detectedAgents.length, "agent")} detected`);

  if (detectedAgents.length === 0) {
    p.log.warn("No agents detected. Make sure at least one AI coding agent is installed.");
    return;
  }

  const lines: string[] = [];
  for (const agent of detectedAgents) {
    const globalExists = await pathExists(agent.globalSkillsDir);

    lines.push(pc.bold(pc.cyan(agent.displayName)));
    lines.push(`  ID:         ${pc.dim(agent.name)}`);
    lines.push(`  Project:    ${pc.dim(agent.skillsDir)}`);
    lines.push(
      `  Global:     ${globalExists ? pc.green(contractHome(agent.globalSkillsDir)) : pc.dim(contractHome(agent.globalSkillsDir) + " (not created)")}`,
    );
    lines.push("");
  }

  p.note(lines.join("\n"), "Detected Agents");
}

async function runDiagnostics(): Promise<void> {
  const s = p.spinner();
  s.start("Running diagnostics...");

  const checks: Array<{ label: string; ok: boolean; detail: string }> = [];

  // Node version check
  const major = parseInt(process.version.slice(1));
  checks.push({
    label: "Node.js >= 18",
    ok: major >= 18,
    detail: major >= 18
      ? process.version
      : `${process.version} — upgrade to Node.js 18+`,
  });

  // npx available
  const hasNpx = await isCommandAvailable("npx");
  checks.push({
    label: "npx available",
    ok: hasNpx,
    detail: hasNpx
      ? "found in PATH"
      : "not found — install Node.js or check PATH",
  });

  // Agents dir exists
  const agentsDirExists = await pathExists(AGENTS_DIR);
  checks.push({
    label: "Agents directory",
    ok: agentsDirExists,
    detail: agentsDirExists
      ? contractHome(AGENTS_DIR)
      : `${contractHome(AGENTS_DIR)} — will be created on first skill install`,
  });

  // Lock file
  const lockExists = await pathExists(LOCK_FILE_PATH);
  checks.push({
    label: "Lock file",
    ok: lockExists,
    detail: lockExists
      ? "exists and readable"
      : "not found — install a skill first via 'npx skills add'",
  });

  // Lock file parseable
  if (lockExists) {
    const lock = await readLockFile();
    const valid = Object.keys(lock.skills).length >= 0;
    checks.push({
      label: "Lock file valid",
      ok: valid,
      detail: valid
        ? `${formatCount(getLockEntries(lock).length, "entry", "entries")}`
        : "corrupted — try reinstalling skills",
    });
  }

  // At least one agent
  const detected = await getDetectedAgents();
  checks.push({
    label: "Agents detected",
    ok: detected.length > 0,
    detail: detected.length > 0
      ? `${detected.length} agent(s): ${detected.map((a) => a.displayName).join(", ")}`
      : "none — install at least one AI coding agent",
  });

  s.stop("Diagnostics complete");

  const lines = checks.map((c) => {
    const icon = c.ok ? pc.green("PASS") : pc.red("FAIL");
    return `  ${icon}  ${pc.bold(c.label)}\n         ${pc.dim(c.detail)}`;
  });

  const passCount = checks.filter((c) => c.ok).length;
  const summary =
    passCount === checks.length
      ? pc.green(`All ${checks.length} checks passed`)
      : pc.yellow(`${passCount}/${checks.length} checks passed`);

  p.note(lines.join("\n\n") + "\n\n" + summary, "Diagnostics");
}

function showHelp(): void {
  const lines = [
    pc.bold("Getting started"),
    "  1. Use 'Search & Install' to find skills on skills.sh",
    "  2. Choose scope: global (everywhere) or project (current dir)",
    "  3. Select which agents should receive the skill",
    "",
    pc.bold("Managing skills"),
    "  'List'         — see installed skills, their agents, and scope",
    "  'Remove'       — permanently uninstall selected skills",
    "  'Move'         — change scope (global/project) or target agents",
    "  'Deactivate'   — temporarily disable without uninstalling",
    "",
    pc.bold("Keeping up to date"),
    "  'Check'        — see which skills have available updates",
    "  'Update'       — apply updates (all or selected)",
    "",
    pc.bold("Understanding scopes"),
    `  ${pc.cyan("Global")}    installed in ~/.{agent}/skills/`,
    "              available in every project",
    `  ${pc.cyan("Project")}   installed in .{agent}/skills/ (cwd)`,
    "              available only in this directory",
    "",
    pc.bold("Deactivation vs Removal"),
    `  ${pc.cyan("Deactivate")}  moves to .disabled/ dir, can be restored`,
    `  ${pc.cyan("Remove")}      permanently deletes via 'npx skills remove'`,
    "",
    pc.bold("How skills work"),
    "  Skills are directories with a SKILL.md file (frontmatter + instructions).",
    "  The canonical store is ~/.agents/skills/. Agent-specific dirs use symlinks.",
    "  Lock file at ~/.agents/.skill-lock.json tracks sources and hashes.",
    "",
    pc.dim("More info: https://skills.sh"),
  ];

  p.note(lines.join("\n"), "Quick Help");
}
