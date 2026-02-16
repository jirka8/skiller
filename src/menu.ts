import * as p from "@clack/prompts";
import type { MenuAction } from "./types.js";

export async function showMainMenu(): Promise<MenuAction | symbol> {
  return p.select({
    message: "What would you like to do?",
    options: [
      { value: "search" as MenuAction, label: "Search & Install Skills", hint: "find and install from skills.sh" },
      { value: "list" as MenuAction, label: "List Installed Skills", hint: "view skills across agents" },
      { value: "remove" as MenuAction, label: "Remove Skills", hint: "uninstall selected skills" },
      { value: "check" as MenuAction, label: "Check for Updates", hint: "see available updates" },
      { value: "update" as MenuAction, label: "Update Skills", hint: "apply available updates" },
      { value: "move" as MenuAction, label: "Move Skills", hint: "change scope or agent" },
      { value: "deactivate" as MenuAction, label: "Deactivate / Reactivate", hint: "temporarily disable skills" },
      { value: "dashboard" as MenuAction, label: "Dashboard", hint: "overview of all agents and skills" },
      { value: "settings" as MenuAction, label: "Settings & Info", hint: "system info and paths" },
      { value: "exit" as MenuAction, label: "Exit" },
    ],
  });
}
