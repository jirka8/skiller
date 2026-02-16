import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseSkillMd, mergeSkillsByCanonical } from "../core/filesystem.js";
import type { InstalledSkill } from "../types.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
  lstat: vi.fn(),
  realpath: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
}));

const mockFs = await import("node:fs/promises");

describe("parseSkillMd", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("parses SKILL.md with frontmatter", async () => {
    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readFile).mockResolvedValue(`---
name: test-skill
version: "1.0.0"
description: A test skill
author: testuser
tags:
  - testing
  - demo
---
# Test Skill
Some content here.
`);

    const result = await parseSkillMd("/skills/test-skill");
    expect(result).toBeDefined();
    expect(result!.name).toBe("test-skill");
    expect(result!.version).toBe("1.0.0");
    expect(result!.description).toBe("A test skill");
    expect(result!.tags).toEqual(["testing", "demo"]);
  });

  it("returns undefined when SKILL.md does not exist", async () => {
    vi.mocked(mockFs.access).mockRejectedValue(new Error("ENOENT"));

    const result = await parseSkillMd("/skills/no-skill");
    expect(result).toBeUndefined();
  });

  it("returns basic metadata when frontmatter is empty", async () => {
    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readFile).mockResolvedValue("# Just content\nNo frontmatter.");

    const result = await parseSkillMd("/skills/basic-skill");
    expect(result).toBeDefined();
    expect(result!.name).toBe("basic-skill");
  });
});

describe("mergeSkillsByCanonical", () => {
  it("merges skills with same canonical path", () => {
    const skills: InstalledSkill[] = [
      {
        name: "my-skill",
        path: "/home/.claude/skills/my-skill",
        scope: "global",
        agents: ["claude-code"],
        isSymlink: true,
        canonicalPath: "/home/.agents/skills/my-skill",
      },
      {
        name: "my-skill",
        path: "/home/.cursor/skills/my-skill",
        scope: "global",
        agents: ["cursor"],
        isSymlink: true,
        canonicalPath: "/home/.agents/skills/my-skill",
      },
    ];

    const merged = mergeSkillsByCanonical(skills);
    expect(merged).toHaveLength(1);
    expect(merged[0].agents).toContain("claude-code");
    expect(merged[0].agents).toContain("cursor");
  });

  it("keeps skills with different canonical paths separate", () => {
    const skills: InstalledSkill[] = [
      {
        name: "skill-a",
        path: "/home/.claude/skills/skill-a",
        scope: "global",
        agents: ["claude-code"],
        isSymlink: false,
        canonicalPath: "/home/.claude/skills/skill-a",
      },
      {
        name: "skill-b",
        path: "/home/.cursor/skills/skill-b",
        scope: "global",
        agents: ["cursor"],
        isSymlink: false,
        canonicalPath: "/home/.cursor/skills/skill-b",
      },
    ];

    const merged = mergeSkillsByCanonical(skills);
    expect(merged).toHaveLength(2);
  });

  it("prefers metadata from skill that has it", () => {
    const skills: InstalledSkill[] = [
      {
        name: "my-skill",
        path: "/a",
        scope: "global",
        agents: ["claude-code"],
        isSymlink: true,
        canonicalPath: "/canonical",
        metadata: { name: "my-skill", description: "test" },
      },
      {
        name: "my-skill",
        path: "/b",
        scope: "global",
        agents: ["cursor"],
        isSymlink: true,
        canonicalPath: "/canonical",
      },
    ];

    const merged = mergeSkillsByCanonical(skills);
    expect(merged[0].metadata?.description).toBe("test");
  });
});
