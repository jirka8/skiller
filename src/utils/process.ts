import { spawn } from "node:child_process";

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; timeoutMs?: number },
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options?.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: options?.timeoutMs,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
  });
}

export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const result = await runCommand("which", [command], { timeoutMs: 5000 });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
