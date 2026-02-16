import * as p from "@clack/prompts";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
import { colors } from "./utils/ui.js";
import type { MenuAction } from "./types.js";

function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
    );
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

// TTY detection — bail early if stdin is not interactive
if (!process.stdin.isTTY) {
  console.error(
    "Skiller requires an interactive terminal. Cannot run in piped or CI mode.",
  );
  process.exit(2);
}

// Signal handlers for clean exit
function handleSignal(): void {
  p.cancel("Operation interrupted.");
  process.exit(0);
}

process.on("SIGINT", handleSignal);
process.on("SIGTERM", handleSignal);

async function main(): Promise<void> {
  const version = getVersion();
  p.intro(colors.heading(` Skiller v${version} `));

  let actionsPerformed = 0;
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
          actionsPerformed++;
          break;
        case "list":
          await listSkills();
          actionsPerformed++;
          break;
        case "remove":
          await removeSkills();
          actionsPerformed++;
          break;
        case "check":
          await checkForUpdates();
          actionsPerformed++;
          break;
        case "update":
          await updateSkills();
          actionsPerformed++;
          break;
        case "move":
          await moveSkills();
          actionsPerformed++;
          break;
        case "deactivate":
          await deactivateReactivate();
          actionsPerformed++;
          break;
        case "dashboard":
          await showDashboard();
          actionsPerformed++;
          break;
        case "settings":
          await showSettings();
          actionsPerformed++;
          break;
        case "exit":
          running = false;
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      p.log.error(
        `${colors.error("Something went wrong:")}\n` +
          `${message}\n` +
          colors.muted("If this persists, check 'Settings & Info' for diagnostics."),
      );
    }
  }

  const summary =
    actionsPerformed > 0
      ? colors.muted(`${actionsPerformed} action${actionsPerformed === 1 ? "" : "s"} this session.`)
      : colors.muted("No actions performed.");
  p.outro(summary);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
