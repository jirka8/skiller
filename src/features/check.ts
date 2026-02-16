import * as p from "@clack/prompts";
import pc from "picocolors";
import { skillsCheck } from "../core/skills-cli.js";

export async function checkForUpdates(): Promise<void> {
  const s = p.spinner();
  s.start("Checking for updates...");

  try {
    const result = await skillsCheck();

    if (result.success) {
      s.stop("Check complete");
      const output = result.output.trim();
      if (output) {
        p.note(output, "Update Check Results");
      } else {
        p.log.success("All skills are up to date.");
      }
    } else {
      s.stop(pc.red("Check failed"));
      p.log.error(result.output.trim());
    }
  } catch (err) {
    s.stop(pc.red("Check failed"));
    p.log.error((err as Error).message);
  }
}
