import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import path from "path";
import fs from "fs";

// Info: (20260521 - Luphia) Load env variables from the project root .env first
const projectRoot = process.cwd();
const srcEnv = path.join(projectRoot, ".env");

if (fs.existsSync(srcEnv)) {
  const defaultEnv = dotenv.config({ path: srcEnv });
  dotenvExpand.expand(defaultEnv);
}

// Info: (20260521 - Luphia) Import service, ensuring they are resolved using the project root paths
import { processNext as processMissionExecutorNext } from "../src/services/mission.executor.service";
import {
  installWorkerShutdownHandlers,
  isShuttingDown,
} from "../src/lib/worker/shutdown";

// Info: (20260521 - Luphia) Setup executor using argument ID
const id = process.argv[2];
if (!id || !/^[0-9a-z]{8}$/.test(id)) {
  console.error(`[Executor Worker] Invalid or missing executor ID: ${id}`);
  process.exit(1);
}

// Info: (20260521 - Luphia) Start service loop
async function startExecutorLoop() {
  console.log(`Executor loop started. Monitoring missions for tasks...`);

  // Info: (20260811 - Luphia) 兩段式中斷 + 結束前釋放 mission 執行鎖（見 lib/worker/shutdown）
  installWorkerShutdownHandlers(`Executor ${id}`);

  const intervalMs = 10000; // Info: (20260521 - Luphia) 10 seconds

  while (!isShuttingDown()) {
    try {
      await processMissionExecutorNext();
      if (isShuttingDown()) break;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error(`Error in executor processNext:`, error);
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  }

  console.log(`Executor worker stopped.`);
  process.exit(0);
}

startExecutorLoop().catch((err) => {
  console.error(`Fatal error:`, err);
  process.exit(1);
});
