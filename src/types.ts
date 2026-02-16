// Lock file (v3) at ~/.agents/.skill-lock.json
export interface SkillLockEntry {
  source: string; // "owner/repo"
  sourceType: string; // "github" | "local" | "direct-url"
  sourceUrl: string;
  skillFolderHash?: string; // SHA for update detection
  installedAt: string;
  updatedAt: string;
}

export interface SkillLockFile {
  version: number;
  skills: Record<string, SkillLockEntry>;
}

// Parsed SKILL.md frontmatter
export interface SkillMetadata {
  name: string;
  version?: string;
  description?: string;
  author?: string;
  tags?: string[];
  globs?: string | string[];
  [key: string]: unknown;
}

// Installed skill representation
export interface InstalledSkill {
  name: string;
  path: string;
  scope: "global" | "project";
  agents: string[]; // agent IDs where this skill is linked
  metadata?: SkillMetadata;
  lockEntry?: SkillLockEntry;
  isSymlink: boolean;
  canonicalPath?: string; // resolved path in ~/.agents/skills/
}

// Agent configuration
export interface AgentConfig {
  name: string; // "claude-code"
  displayName: string; // "Claude Code"
  skillsDir: string; // ".claude/skills" (project-relative)
  globalSkillsDir: string; // absolute or ~-prefixed (global)
  detectInstalled: () => Promise<boolean>;
}

// Deactivation manifest at ~/.agents/.disabled-skills.json
export interface DisabledSkillEntry {
  canonicalPath: string;
  agentLinks: Record<string, { path: string; wasSymlink: boolean }>;
  disabledAt: string;
}

export interface DisabledManifest {
  version: number;
  skills: Record<string, DisabledSkillEntry>;
}

// Search API response
export interface SearchResult {
  name: string;
  source: string; // "owner/repo"
  description?: string;
  author?: string;
  tags?: string[];
  url?: string;
}

// Scope for operations
export type SkillScope = "global" | "project";

// Menu action identifiers
export type MenuAction =
  | "search"
  | "list"
  | "remove"
  | "check"
  | "update"
  | "move"
  | "deactivate"
  | "dashboard"
  | "settings"
  | "exit";
