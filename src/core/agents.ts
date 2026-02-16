import { join } from "node:path";
import { AGENT_REGISTRY } from "../constants.js";
import { pathExists } from "../utils/paths.js";
import type { AgentConfig } from "../types.js";

export async function getDetectedAgents(): Promise<AgentConfig[]> {
  const detected: AgentConfig[] = [];

  for (const agent of AGENT_REGISTRY) {
    try {
      if (await agent.detectInstalled()) {
        detected.push(agent);
      }
    } catch {
      // Skip agents we can't detect
    }
  }

  return detected;
}

export function getAgentByName(name: string): AgentConfig | undefined {
  return AGENT_REGISTRY.find((a) => a.name === name);
}

export function getAgentDisplayName(name: string): string {
  return getAgentByName(name)?.displayName ?? name;
}

export function getAgentSkillsDirs(
  agent: AgentConfig,
  projectRoot?: string,
): { global: string; project?: string } {
  const result: { global: string; project?: string } = {
    global: agent.globalSkillsDir,
  };

  if (projectRoot) {
    result.project = join(projectRoot, agent.skillsDir);
  }

  return result;
}

export async function getActiveAgentDirs(
  scope: "global" | "project" | "all",
  projectRoot?: string,
): Promise<
  Array<{ dir: string; scope: "global" | "project"; agentName: string }>
> {
  const detected = await getDetectedAgents();
  const dirs: Array<{
    dir: string;
    scope: "global" | "project";
    agentName: string;
  }> = [];

  for (const agent of detected) {
    if (scope === "global" || scope === "all") {
      if (await pathExists(agent.globalSkillsDir)) {
        dirs.push({
          dir: agent.globalSkillsDir,
          scope: "global",
          agentName: agent.name,
        });
      }
    }

    if ((scope === "project" || scope === "all") && projectRoot) {
      const projectDir = join(projectRoot, agent.skillsDir);
      if (await pathExists(projectDir)) {
        dirs.push({
          dir: projectDir,
          scope: "project",
          agentName: agent.name,
        });
      }
    }
  }

  return dirs;
}
