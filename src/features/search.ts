import * as p from "@clack/prompts";
import { searchSkills, skillsAdd } from "../core/skills-cli.js";
import { getDetectedAgents } from "../core/agents.js";
import { colors, nextSteps } from "../utils/ui.js";
import type { SearchResult } from "../types.js";

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
    s.stop(colors.error("Search failed"));
    p.log.error(
      `Could not reach skills.sh: ${(err as Error).message}\n` +
        colors.muted("Check your network connection and try again."),
    );
    const retry = await p.confirm({ message: "Retry search?" });
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
        value: r.installSource,
        label: `${colors.skillName(r.name)}${r.description ? `  ${colors.muted(r.description)}` : ""}`,
        hint: r.source,
      })),
      { value: "__cancel__", label: colors.muted("Cancel") },
    ],
  });

  if (p.isCancel(selected) || selected === "__cancel__") return;

  // Grouped install flow: scope + agents + confirm
  const detectedAgents = await getDetectedAgents();
  const agentChoices = detectedAgents.map((a) => ({
    value: a.name,
    label: a.displayName,
  }));

  const installOpts = await p.group(
    {
      scope: () =>
        p.select({
          message: "Install scope:",
          options: [
            { value: "global" as const, label: "Global (available everywhere)" },
            { value: "project" as const, label: "Project (current directory only)" },
          ],
        }),
      agents: () =>
        p.multiselect({
          message: "Install for which agents?",
          options: agentChoices,
          required: true,
        }),
      confirm: ({ results }) =>
        p.confirm({
          message: `Install ${colors.skillName(selected as string)} (${results.scope}) for ${(results.agents as string[])?.length ?? 0} agent(s)?`,
        }),
    },
    {
      onCancel: () => {
        p.cancel("Installation cancelled.");
      },
    },
  );

  if (!installOpts.confirm) return;

  const installSpinner = p.spinner();
  installSpinner.start("Installing...");

  const result = await skillsAdd(selected as string, {
    scope: installOpts.scope,
    agents: installOpts.agents as string[],
  });

  if (result.success) {
    installSpinner.stop(colors.success("Installed successfully!"));
    if (result.output.trim()) {
      p.log.info(colors.muted(result.output.trim()));
    }
    nextSteps("What's next?", [
      "Run 'List Installed Skills' to verify the installation",
      `Skill installed for: ${colors.agents((installOpts.agents as string[]).join(", "))}`,
    ]);
  } else {
    installSpinner.stop(colors.error("Installation failed"));
    p.log.error(
      `Failed to install ${colors.skillName(selected as string)}.\n` +
        colors.muted(result.output.trim() || "No output from skills CLI.") +
        "\n" +
        colors.muted("Check that 'skills' CLI is installed and accessible."),
    );
  }
}
