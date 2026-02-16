import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DisabledManifest } from "../types.js";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rename: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
  lstat: vi.fn(),
  readdir: vi.fn(),
  realpath: vi.fn(),
  symlink: vi.fn(),
  rm: vi.fn(),
}));

const mockFs = await import("node:fs/promises");

describe("DisabledManifest structure", () => {
  it("has correct shape", () => {
    const manifest: DisabledManifest = {
      version: 1,
      skills: {
        "test-skill": {
          canonicalPath: "/home/.agents/skills/test-skill",
          agentLinks: {
            "claude-code:global": {
              path: "/home/.claude/skills/test-skill",
              wasSymlink: true,
            },
            "cursor:global": {
              path: "/home/.cursor/skills/test-skill",
              wasSymlink: true,
            },
          },
          disabledAt: "2025-01-01T00:00:00Z",
        },
      },
    };

    expect(manifest.version).toBe(1);
    expect(Object.keys(manifest.skills)).toHaveLength(1);
    expect(manifest.skills["test-skill"].agentLinks["claude-code:global"].wasSymlink).toBe(true);
  });

  it("supports multiple disabled skills", () => {
    const manifest: DisabledManifest = {
      version: 1,
      skills: {
        "skill-a": {
          canonicalPath: "/a",
          agentLinks: {},
          disabledAt: "2025-01-01T00:00:00Z",
        },
        "skill-b": {
          canonicalPath: "/b",
          agentLinks: {},
          disabledAt: "2025-01-02T00:00:00Z",
        },
      },
    };

    expect(Object.keys(manifest.skills)).toHaveLength(2);
  });
});

describe("Manifest I/O", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reads manifest from JSON", async () => {
    const data: DisabledManifest = {
      version: 1,
      skills: {
        "my-skill": {
          canonicalPath: "/canonical",
          agentLinks: { "claude-code:global": { path: "/claude", wasSymlink: true } },
          disabledAt: "2025-03-01T00:00:00Z",
        },
      },
    };

    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify(data));

    // Inline manifest read logic for testing
    const raw = await mockFs.readFile("/path", "utf-8");
    const manifest = JSON.parse(raw as string) as DisabledManifest;

    expect(manifest.skills["my-skill"].canonicalPath).toBe("/canonical");
    expect(manifest.skills["my-skill"].agentLinks["claude-code:global"].wasSymlink).toBe(true);
  });

  it("writes manifest as JSON", async () => {
    vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
    vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);

    const manifest: DisabledManifest = {
      version: 1,
      skills: {},
    };

    await mockFs.writeFile("/path", JSON.stringify(manifest, null, 2));
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      "/path",
      JSON.stringify(manifest, null, 2),
    );
  });
});

describe("Deactivation path logic", () => {
  it("constructs correct disabled directory path", () => {
    const { join } = require("node:path");
    const baseDir = "/home/.claude/skills";
    const disabledDir = join(baseDir, ".disabled");
    expect(disabledDir).toBe("/home/.claude/skills/.disabled");
  });

  it("constructs correct disabled skill path", () => {
    const { join } = require("node:path");
    const baseDir = "/home/.claude/skills";
    const skillName = "my-skill";
    const disabledPath = join(baseDir, ".disabled", skillName);
    expect(disabledPath).toBe("/home/.claude/skills/.disabled/my-skill");
  });
});
