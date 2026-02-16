import * as p from "@clack/prompts";
import pc from "picocolors";
import { readLockFile, getLockEntries } from "../core/lock-file.js";
import { skillsUpdate } from "../core/skills-cli.js";

export async function updateSkills(): Promise<void> {
  const lock = await readLockFile();
  const entries = getLockEntries(lock);

  if (entries.length === 0) {
    p.log.info("No skills installed to update.");
    return;
  }

  const target = await p.select({
    message: "What to update?",
    options: [
      { value: "__all__", label: "Update all skills" },
      ...entries.map(([name, entry]) => ({
        value: name,
        label: `${name}  ${pc.dim(entry.source)}`,
      })),
    ],
  });

  if (p.isCancel(target)) return;

  const s = p.spinner();
  const skillName = target === "__all__" ? undefined : (target as string);
  s.start(skillName ? `Updating ${skillName}...` : "Updating all skills...");

  try {
    const result = await skillsUpdate(skillName);

    if (result.success) {
      s.stop(pc.green("Update complete"));
      if (result.output.trim()) {
        p.log.info(result.output.trim());
      }
    } else {
      s.stop(pc.red("Update failed"));
      p.log.error(result.output.trim());
    }
  } catch (err) {
    s.stop(pc.red("Update failed"));
    p.log.error((err as Error).message);
  }
}
