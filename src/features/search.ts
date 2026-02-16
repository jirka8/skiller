import * as p from "@clack/prompts";
import pc from "picocolors";
import { searchSkills, skillsAdd } from "../core/skills-cli.js";
import { getDetectedAgents } from "../core/agents.js";
import type { SearchResult, SkillScope } from "../types.js";

export async function searchAndInstall(): Promise<void> {
  const query = await p.text({
    message: "Search for skills:",
    placeholder: "e.g. typescript, react, testing...",
    validate: (val) => {
      if (!val.trim()) return "Please enter a search query";
    },
  });

  if (p.isCancel(query)) return;

  const s = p.spinner();
  s.start("Searching skills.sh...");

  let results: SearchResult[];
  try {
    results = await searchSkills(query);
  } catch (err) {
    s.stop("Search failed");
    const retry = await p.confirm({
      message: `Search failed: ${(err as Error).message}. Retry?`,
    });
    if (p.isCancel(retry) || !retry) return;
    return searchAndInstall();
  }

  s.stop(`Found ${results.length} results`);

  if (results.length === 0) {
    p.log.info("No skills found for that query. Try different keywords.");
    return;
  }

  const selected = await p.select({
    message: "Select a skill to install:",
    options: [
      ...results.map((r) => ({
        value: r.source || r.name,
        label: `${pc.bold(r.name)}${r.description ? `  ${pc.dim(r.description)}` : ""}`,
        hint: r.source,
      })),
      { value: "__cancel__", label: pc.dim("Cancel") },
    ],
  });

  if (p.isCancel(selected) || selected === "__cancel__") return;

  // Scope selection
  const scope = await p.select({
    message: "Install scope:",
    options: [
      { value: "global" as const, label: "Global (available everywhere)" },
      { value: "project" as const, label: "Project (current directory only)" },
    ],
  });

  if (p.isCancel(scope)) return;

  // Agent selection
  const detectedAgents = await getDetectedAgents();
  const agentChoices = detectedAgents.map((a) => ({
    value: a.name,
    label: a.displayName,
  }));

  const agents = await p.multiselect({
    message: "Install for which agents?",
    options: agentChoices,
    required: true,
  });

  if (p.isCancel(agents)) return;

  // Confirm
  const confirm = await p.confirm({
    message: `Install ${pc.bold(selected as string)} (${scope}) for ${(agents as string[]).length} agent(s)?`,
  });

  if (p.isCancel(confirm) || !confirm) return;

  const installSpinner = p.spinner();
  installSpinner.start("Installing...");

  const result = await skillsAdd(selected as string, {
    scope,
    agents: agents as string[],
  });

  if (result.success) {
    installSpinner.stop(pc.green("Installed successfully!"));
    if (result.output.trim()) {
      p.log.info(result.output.trim());
    }
  } else {
    installSpinner.stop(pc.red("Installation failed"));
    p.log.error(result.output.trim());
  }
}
