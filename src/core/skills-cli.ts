import { runCommand, isCommandAvailable } from "../utils/process.js";
import { SKILLS_API_URL, SEARCH_LIMIT, SEARCH_TIMEOUT_MS } from "../constants.js";
import type { SearchResult, SkillScope } from "../types.js";

// --- HTTP Search (direct, no npx dependency) ---

export async function searchSkills(
  query: string,
  limit: number = SEARCH_LIMIT,
): Promise<SearchResult[]> {
  const url = `${SKILLS_API_URL}?q=${encodeURIComponent(query)}&limit=${limit}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}`);
    }

    const data = await response.json();

    // Normalize response - API may return array or { results: [] }
    const results = Array.isArray(data) ? data : data.results ?? data.skills ?? [];

    return results.map((item: Record<string, unknown>) => ({
      name: (item.name as string) || (item.slug as string) || "unknown",
      source: (item.source as string) || (item.repo as string) || (item.github as string) || "",
      description: (item.description as string) || "",
      author: (item.author as string) || "",
      tags: (item.tags as string[]) || [],
      url: (item.url as string) || "",
    }));
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("Search timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// --- npx skills CLI wrapper ---

async function ensureNpx(): Promise<void> {
  if (!(await isCommandAvailable("npx"))) {
    throw new Error(
      "npx is not available. Please install Node.js >= 18 to use skill management commands.",
    );
  }
}

export async function skillsAdd(
  source: string,
  options?: {
    scope?: SkillScope;
    agents?: string[];
    cwd?: string;
  },
): Promise<{ success: boolean; output: string }> {
  await ensureNpx();

  const args = ["skills", "add", source];

  if (options?.scope === "global") {
    args.push("--global");
  }

  if (options?.agents?.length) {
    for (const agent of options.agents) {
      args.push("--agent", agent);
    }
  }

  const result = await runCommand("npx", args, {
    cwd: options?.cwd,
    timeoutMs: 60_000,
  });

  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr,
  };
}

export async function skillsRemove(
  skillName: string,
  options?: {
    scope?: SkillScope;
    agents?: string[];
    cwd?: string;
  },
): Promise<{ success: boolean; output: string }> {
  await ensureNpx();

  const args = ["skills", "remove", skillName];

  if (options?.scope === "global") {
    args.push("--global");
  }

  if (options?.agents?.length) {
    for (const agent of options.agents) {
      args.push("--agent", agent);
    }
  }

  const result = await runCommand("npx", args, {
    cwd: options?.cwd,
    timeoutMs: 30_000,
  });

  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr,
  };
}

export async function skillsCheck(
  cwd?: string,
): Promise<{ success: boolean; output: string }> {
  await ensureNpx();

  const result = await runCommand("npx", ["skills", "check"], {
    cwd,
    timeoutMs: 30_000,
  });

  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr,
  };
}

export async function skillsUpdate(
  skillName?: string,
  cwd?: string,
): Promise<{ success: boolean; output: string }> {
  await ensureNpx();

  const args = ["skills", "update"];
  if (skillName) args.push(skillName);

  const result = await runCommand("npx", args, {
    cwd,
    timeoutMs: 60_000,
  });

  return {
    success: result.exitCode === 0,
    output: result.stdout || result.stderr,
  };
}
