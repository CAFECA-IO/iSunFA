"use server";

import { exec } from "child_process";

// Info: (20260412 - Luphia) Utility to run generic shell commands asynchronously.
export async function runCommand(
  command: string,
  cwd?: string,
  maxBuffer?: number,
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    exec(command, { cwd, maxBuffer }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, output: stderr || error.message || stdout });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
}
