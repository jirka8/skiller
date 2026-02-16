import { AgentConfig } from "./types.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

export const SKILLS_API_URL = "https://skills.sh/api/search";
export const SEARCH_LIMIT = 10;
export const SEARCH_TIMEOUT_MS = 10_000;

const home = homedir();

// Base paths
export const AGENTS_DIR = join(home, ".agents");
export const AGENTS_SKILLS_DIR = join(AGENTS_DIR, "skills");
export const LOCK_FILE_PATH = join(AGENTS_DIR, ".skill-lock.json");
export const DISABLED_MANIFEST_PATH = join(AGENTS_DIR, ".disabled-skills.json");

// Helper to check if a path exists
async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Agent registry - key agents with their skill directory mappings
export const AGENT_REGISTRY: AgentConfig[] = [
  {
    name: "claude-code",
    displayName: "Claude Code",
    skillsDir: ".claude/skills",
    globalSkillsDir: join(home, ".claude", "skills"),
    detectInstalled: () => pathExists(join(home, ".claude")),
  },
  {
    name: "cursor",
    displayName: "Cursor",
    skillsDir: ".cursor/skills",
    globalSkillsDir: join(home, ".cursor", "skills"),
    detectInstalled: () => pathExists(join(home, ".cursor")),
  },
  {
    name: "windsurf",
    displayName: "Windsurf",
    skillsDir: ".windsurf/skills",
    globalSkillsDir: join(home, ".codeium", "windsurf", "skills"),
    detectInstalled: () => pathExists(join(home, ".codeium", "windsurf")),
  },
  {
    name: "github-copilot",
    displayName: "GitHub Copilot",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".copilot", "skills"),
    detectInstalled: () => pathExists(join(home, ".copilot")),
  },
  {
    name: "amp",
    displayName: "Amp",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".amp", "skills"),
    detectInstalled: () => pathExists(join(home, ".amp")),
  },
  {
    name: "codex",
    displayName: "Codex",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".codex", "skills"),
    detectInstalled: () => pathExists(join(home, ".codex")),
  },
  {
    name: "gemini-cli",
    displayName: "Gemini CLI",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".gemini", "skills"),
    detectInstalled: () => pathExists(join(home, ".gemini")),
  },
  {
    name: "aider",
    displayName: "Aider",
    skillsDir: ".aider/skills",
    globalSkillsDir: join(home, ".aider", "skills"),
    detectInstalled: () => pathExists(join(home, ".aider")),
  },
  {
    name: "cline",
    displayName: "Cline",
    skillsDir: ".cline/skills",
    globalSkillsDir: join(home, ".cline", "skills"),
    detectInstalled: () => pathExists(join(home, ".cline")),
  },
  {
    name: "roo-code",
    displayName: "Roo Code",
    skillsDir: ".roo/skills",
    globalSkillsDir: join(home, ".roo", "skills"),
    detectInstalled: () => pathExists(join(home, ".roo")),
  },
  {
    name: "continue",
    displayName: "Continue",
    skillsDir: ".continue/skills",
    globalSkillsDir: join(home, ".continue", "skills"),
    detectInstalled: () => pathExists(join(home, ".continue")),
  },
  {
    name: "zed",
    displayName: "Zed",
    skillsDir: ".zed/skills",
    globalSkillsDir: join(home, ".zed", "skills"),
    detectInstalled: () => pathExists(join(home, ".zed")),
  },
  {
    name: "void",
    displayName: "Void",
    skillsDir: ".void/skills",
    globalSkillsDir: join(home, ".void", "skills"),
    detectInstalled: () => pathExists(join(home, ".void")),
  },
  {
    name: "trae",
    displayName: "Trae",
    skillsDir: ".trae/skills",
    globalSkillsDir: join(home, ".trae", "rules", "skills"),
    detectInstalled: () => pathExists(join(home, ".trae")),
  },
  {
    name: "augment",
    displayName: "Augment",
    skillsDir: ".augment/skills",
    globalSkillsDir: join(home, ".augment", "skills"),
    detectInstalled: () => pathExists(join(home, ".augment")),
  },
  {
    name: "opencode",
    displayName: "OpenCode",
    skillsDir: ".opencode/skills",
    globalSkillsDir: join(home, ".opencode", "skills"),
    detectInstalled: () => pathExists(join(home, ".opencode")),
  },
  {
    name: "kilo-code",
    displayName: "Kilo Code",
    skillsDir: ".kilo/skills",
    globalSkillsDir: join(home, ".kilo", "skills"),
    detectInstalled: () => pathExists(join(home, ".kilo")),
  },
  {
    name: "junie",
    displayName: "Junie",
    skillsDir: ".junie/skills",
    globalSkillsDir: join(home, ".junie", "skills"),
    detectInstalled: () => pathExists(join(home, ".junie")),
  },
  {
    name: "amazon-q",
    displayName: "Amazon Q",
    skillsDir: ".amazonq/skills",
    globalSkillsDir: join(home, ".amazonq", "skills"),
    detectInstalled: () => pathExists(join(home, ".amazonq")),
  },
  {
    name: "tabnine",
    displayName: "Tabnine",
    skillsDir: ".tabnine/skills",
    globalSkillsDir: join(home, ".tabnine", "skills"),
    detectInstalled: () => pathExists(join(home, ".tabnine")),
  },
  {
    name: "codeium",
    displayName: "Codeium",
    skillsDir: ".codeium/skills",
    globalSkillsDir: join(home, ".codeium", "skills"),
    detectInstalled: () => pathExists(join(home, ".codeium")),
  },
  {
    name: "sourcegraph-cody",
    displayName: "Sourcegraph Cody",
    skillsDir: ".cody/skills",
    globalSkillsDir: join(home, ".cody", "skills"),
    detectInstalled: () => pathExists(join(home, ".cody")),
  },
  {
    name: "supermaven",
    displayName: "Supermaven",
    skillsDir: ".supermaven/skills",
    globalSkillsDir: join(home, ".supermaven", "skills"),
    detectInstalled: () => pathExists(join(home, ".supermaven")),
  },
  {
    name: "double",
    displayName: "Double",
    skillsDir: ".double/skills",
    globalSkillsDir: join(home, ".double", "skills"),
    detectInstalled: () => pathExists(join(home, ".double")),
  },
  {
    name: "pear-ai",
    displayName: "Pear AI",
    skillsDir: ".pear/skills",
    globalSkillsDir: join(home, ".pear", "skills"),
    detectInstalled: () => pathExists(join(home, ".pear")),
  },
  {
    name: "cloi",
    displayName: "Cloi",
    skillsDir: ".cloi/skills",
    globalSkillsDir: join(home, ".cloi", "skills"),
    detectInstalled: () => pathExists(join(home, ".cloi")),
  },
  {
    name: "aide",
    displayName: "Aide",
    skillsDir: ".aide/skills",
    globalSkillsDir: join(home, ".aide", "skills"),
    detectInstalled: () => pathExists(join(home, ".aide")),
  },
  {
    name: "melty",
    displayName: "Melty",
    skillsDir: ".melty/skills",
    globalSkillsDir: join(home, ".melty", "skills"),
    detectInstalled: () => pathExists(join(home, ".melty")),
  },
  {
    name: "boltai",
    displayName: "Bolt AI",
    skillsDir: ".bolt/skills",
    globalSkillsDir: join(home, ".bolt", "skills"),
    detectInstalled: () => pathExists(join(home, ".bolt")),
  },
  {
    name: "lovable",
    displayName: "Lovable",
    skillsDir: ".lovable/skills",
    globalSkillsDir: join(home, ".lovable", "skills"),
    detectInstalled: () => pathExists(join(home, ".lovable")),
  },
  {
    name: "v0",
    displayName: "v0",
    skillsDir: ".v0/skills",
    globalSkillsDir: join(home, ".v0", "skills"),
    detectInstalled: () => pathExists(join(home, ".v0")),
  },
  {
    name: "replit",
    displayName: "Replit Agent",
    skillsDir: ".replit/skills",
    globalSkillsDir: join(home, ".replit", "skills"),
    detectInstalled: () => pathExists(join(home, ".replit")),
  },
  {
    name: "devin",
    displayName: "Devin",
    skillsDir: ".devin/skills",
    globalSkillsDir: join(home, ".devin", "skills"),
    detectInstalled: () => pathExists(join(home, ".devin")),
  },
  {
    name: "claude-desktop",
    displayName: "Claude Desktop (MCP)",
    skillsDir: ".claude-desktop/skills",
    globalSkillsDir: join(home, ".claude-desktop", "skills"),
    detectInstalled: () => pathExists(join(home, ".claude-desktop")),
  },
  {
    name: "chatgpt-desktop",
    displayName: "ChatGPT Desktop",
    skillsDir: ".chatgpt/skills",
    globalSkillsDir: join(home, ".chatgpt", "skills"),
    detectInstalled: () => pathExists(join(home, ".chatgpt")),
  },
  {
    name: "warp",
    displayName: "Warp",
    skillsDir: ".warp/skills",
    globalSkillsDir: join(home, ".warp", "skills"),
    detectInstalled: () => pathExists(join(home, ".warp")),
  },
  {
    name: "fig",
    displayName: "Fig",
    skillsDir: ".fig/skills",
    globalSkillsDir: join(home, ".fig", "skills"),
    detectInstalled: () => pathExists(join(home, ".fig")),
  },
  {
    name: "custom",
    displayName: "Custom / Universal",
    skillsDir: ".agents/skills",
    globalSkillsDir: join(home, ".agents", "skills"),
    detectInstalled: async () => true,
  },
];
