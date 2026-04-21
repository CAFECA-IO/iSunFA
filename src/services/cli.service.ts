"use server";

import { exec } from "child_process";
import { processManager } from "@/lib/utils/process_manager";

// Info: (20260412 - Luphia) Utility to run generic shell commands asynchronously.
export async function runCommand(
  command: string,
  cwd?: string,
  maxBuffer?: number,
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    // Info: (20260421 - Luphia) Apply a default timeout of 15 seconds to prevent indefinite hangs
    const child = exec(command, { cwd, maxBuffer, timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          resolve({ success: false, output: `Process exceeded timeout limits and was killed: ${command}` });
          return;
        }
        resolve({ success: false, output: stderr || error.message || stdout });
      } else {
        resolve({ success: true, output: stdout });
      }
    });

    processManager.register(child);
  });
}
