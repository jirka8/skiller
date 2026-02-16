import { describe, it, expect } from "vitest";
import { getAgentByName, getAgentDisplayName } from "../core/agents.js";

describe("getAgentByName", () => {
  it("finds claude-code agent", () => {
    const agent = getAgentByName("claude-code");
    expect(agent).toBeDefined();
    expect(agent!.displayName).toBe("Claude Code");
    expect(agent!.skillsDir).toBe(".claude/skills");
  });

  it("finds cursor agent", () => {
    const agent = getAgentByName("cursor");
    expect(agent).toBeDefined();
    expect(agent!.displayName).toBe("Cursor");
  });

  it("finds windsurf agent", () => {
    const agent = getAgentByName("windsurf");
    expect(agent).toBeDefined();
    expect(agent!.globalSkillsDir).toContain(".codeium/windsurf/skills");
  });

  it("returns undefined for unknown agent", () => {
    const agent = getAgentByName("nonexistent");
    expect(agent).toBeUndefined();
  });
});

describe("getAgentDisplayName", () => {
  it("returns display name for known agent", () => {
    expect(getAgentDisplayName("claude-code")).toBe("Claude Code");
    expect(getAgentDisplayName("github-copilot")).toBe("GitHub Copilot");
  });

  it("returns raw name for unknown agent", () => {
    expect(getAgentDisplayName("unknown")).toBe("unknown");
  });
});
