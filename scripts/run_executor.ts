import { spawn, ChildProcess } from "child_process";

function generateRandomId(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const numberArg = args[0];
  const numExecutors = parseInt(numberArg, 10);

  if (isNaN(numExecutors) || numExecutors <= 0) {
    console.error("❌ Usage: npm run executor <number>");
    console.error("💡 Example: npm run executor 3");
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🚀 Starting ${numExecutors} Mission Executors`);
  console.log(`======================================================\n`);

  const activeProcesses: Array<{ id: string; process: ChildProcess }> = [];

  // Info: (20260521 - Luphia) Graceful shutdown handler
  const shutdown = () => {
    console.log(
      "\n[Master] Received shutdown signal. Stopping all executors...",
    );
    for (const item of activeProcesses) {
      console.log(`[Master] Stopping executor [${item.id}]...`);
      item.process.kill("SIGTERM");
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  for (let i = 1; i <= numExecutors; i++) {
    const id = generateRandomId();
    console.log(`[Master] Starting Executor #${i} with ID: [${id}]`);

    const child = spawn("npx", ["tsx", "scripts/executor_worker.ts", id], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    activeProcesses.push({ id, process: child });

    // Info: (20260521 - Luphia) Helper to prefix child logs with their ID
    const prefixLogs = (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (line.trim() !== "") {
          console.log(`[${id}] ${line}`);
        }
      }
    };

    child.stdout.on("data", prefixLogs);
    child.stderr.on("data", prefixLogs);

    child.on("close", (code) => {
      console.log(`[Master] Executor [${id}] exited with code ${code}`);
      const index = activeProcesses.findIndex((p) => p.id === id);
      if (index !== -1) {
        activeProcesses.splice(index, 1);
      }
      if (activeProcesses.length === 0) {
        console.log("[Master] All executors have stopped. Exiting.");
        process.exit(0);
      }
    });
  }
}

main().catch((err) => {
  console.error("[Master] Fatal error:", err);
  process.exit(1);
});
