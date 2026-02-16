import { describe, it, expect, vi, beforeEach } from "vitest";
import { readLockFile, getLockEntries, findLockEntry, getSkillSource } from "../core/lock-file.js";
import type { SkillLockFile } from "../types.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  access: vi.fn(),
}));

const mockFs = await import("node:fs/promises");

const SAMPLE_LOCK: SkillLockFile = {
  version: 3,
  skills: {
    "my-skill": {
      source: "owner/repo",
      sourceType: "github",
      sourceUrl: "https://github.com/owner/repo",
      skillFolderHash: "abc123",
      installedAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-15T00:00:00Z",
    },
    "another-skill": {
      source: "other/repo",
      sourceType: "github",
      sourceUrl: "https://github.com/other/repo",
      installedAt: "2025-02-01T00:00:00Z",
      updatedAt: "2025-02-01T00:00:00Z",
    },
  },
};

describe("readLockFile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty lock when file does not exist", async () => {
    vi.mocked(mockFs.access).mockRejectedValue(new Error("ENOENT"));

    const result = await readLockFile("/nonexistent/path");
    expect(result).toEqual({ version: 3, skills: {} });
  });

  it("parses valid lock file", async () => {
    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify(SAMPLE_LOCK));

    const result = await readLockFile("/valid/path");
    expect(result.version).toBe(3);
    expect(Object.keys(result.skills)).toHaveLength(2);
    expect(result.skills["my-skill"].source).toBe("owner/repo");
  });

  it("returns empty lock for invalid JSON", async () => {
    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readFile).mockResolvedValue("not json{{{");

    const result = await readLockFile("/invalid/path");
    expect(result).toEqual({ version: 3, skills: {} });
  });

  it("returns empty lock for object without skills key", async () => {
    vi.mocked(mockFs.access).mockResolvedValue(undefined);
    vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify({ version: 3 }));

    const result = await readLockFile("/bad/structure");
    expect(result).toEqual({ version: 3, skills: {} });
  });
});

describe("getLockEntries", () => {
  it("returns entries as tuples", () => {
    const entries = getLockEntries(SAMPLE_LOCK);
    expect(entries).toHaveLength(2);
    expect(entries[0][0]).toBe("my-skill");
    expect(entries[0][1].source).toBe("owner/repo");
  });

  it("returns empty array for empty lock", () => {
    const entries = getLockEntries({ version: 3, skills: {} });
    expect(entries).toHaveLength(0);
  });
});

describe("findLockEntry", () => {
  it("finds exact match", () => {
    const entry = findLockEntry(SAMPLE_LOCK, "my-skill");
    expect(entry).toBeDefined();
    expect(entry!.source).toBe("owner/repo");
  });

  it("finds case-insensitive match", () => {
    const entry = findLockEntry(SAMPLE_LOCK, "My-Skill");
    expect(entry).toBeDefined();
    expect(entry!.source).toBe("owner/repo");
  });

  it("returns undefined for non-existent skill", () => {
    const entry = findLockEntry(SAMPLE_LOCK, "nonexistent");
    expect(entry).toBeUndefined();
  });
});

describe("getSkillSource", () => {
  it("returns source when available", () => {
    expect(getSkillSource(SAMPLE_LOCK.skills["my-skill"])).toBe("owner/repo");
  });

  it("falls back to sourceUrl", () => {
    const entry = { ...SAMPLE_LOCK.skills["my-skill"], source: "" };
    expect(getSkillSource(entry)).toBe("https://github.com/owner/repo");
  });
});
