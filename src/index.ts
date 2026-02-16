import * as p from "@clack/prompts";
import pc from "picocolors";
import { showMainMenu } from "./menu.js";
import { listSkills } from "./features/list.js";
import { showDashboard } from "./features/dashboard.js";
import { showSettings } from "./features/settings.js";
import { searchAndInstall } from "./features/search.js";
import { removeSkills } from "./features/remove.js";
import { checkForUpdates } from "./features/check.js";
import { updateSkills } from "./features/update.js";
import { moveSkills } from "./features/move.js";
import { deactivateReactivate } from "./features/deactivate.js";
import type { MenuAction } from "./types.js";

async function main(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" Skiller - Skills Manager ")));

  let running = true;
  while (running) {
    const action = await showMainMenu();

    if (p.isCancel(action)) {
      running = false;
      break;
    }

    try {
      switch (action as MenuAction) {
        case "search":
          await searchAndInstall();
          break;
        case "list":
          await listSkills();
          break;
        case "remove":
          await removeSkills();
          break;
        case "check":
          await checkForUpdates();
          break;
        case "update":
          await updateSkills();
          break;
        case "move":
          await moveSkills();
          break;
        case "deactivate":
          await deactivateReactivate();
          break;
        case "dashboard":
          await showDashboard();
          break;
        case "settings":
          await showSettings();
          break;
        case "exit":
          running = false;
          break;
      }
    } catch (err) {
      p.log.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  p.outro(pc.dim("Goodbye!"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
