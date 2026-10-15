import { spawn, ChildProcess } from "child_process";

/**
 * Info: (20261015 - Luphia) 同時啟動 Next.js 伺服器與背景 worker（`npm start`、`npm run swarm`）。
 *
 * 用法：`npx tsx scripts/run_server_with_worker.ts [next start 的參數，例如 -p 10020]`
 *
 * 分工：
 * - 伺服器是主體：它結束，整個行程跟著結束（交給 pm2 等外部監控重啟），worker 一併收掉。
 * - worker 是附屬：它自己結束（例如租約被別的 worker 接手、或崩潰），**伺服器不受影響**，
 *   10 秒後重新啟動一個 worker——它會先待命，等租約空出來再接手。
 * - 同一個資料庫上同時只有一個 worker 在跑迴圈（`WorkerLease`），因此 `start` 與 `swarm`
 *   並存、或另外用 pm2 跑 `npm run worker` 都不會重複派發任務。
 *
 * 關機：收到 SIGINT / SIGTERM 時轉給兩者。worker 走兩段式中斷（先做完手上的事），
 * 超過 WORKER_GRACE_MS 仍未結束就再送一次訊號強制結束。
 */

const WORKER_RESTART_DELAY_MS = 10 * 1000;
const WORKER_GRACE_MS = 60 * 1000;

const nextArgs = process.argv.slice(2).filter((arg) => arg !== "--");

let stopping = false;
let server: ChildProcess | null = null;
let worker: ChildProcess | null = null;
let workerRestartTimer: NodeJS.Timeout | null = null;

function prefixed(stream: NodeJS.ReadableStream | null, label: string) {
  stream?.on("data", (data: Buffer) => {
    for (const line of data.toString().split("\n")) {
      if (line.trim() !== "") console.log(`[${label}] ${line}`);
    }
  });
}

function startWorker(): void {
  if (stopping) return;
  const child = spawn("npx", ["tsx", "scripts/run_worker.ts"], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  worker = child;
  prefixed(child.stdout, "worker");
  prefixed(child.stderr, "worker");
  child.on("exit", (code, signal) => {
    if (worker === child) worker = null;
    if (stopping) return;
    console.log(
      `[launcher] Worker exited (code ${code ?? "null"}, signal ${signal ?? "none"}); restarting in ${WORKER_RESTART_DELAY_MS / 1000}s.`,
    );
    workerRestartTimer = setTimeout(startWorker, WORKER_RESTART_DELAY_MS);
  });
}

function stopWorker(): Promise<void> {
  if (workerRestartTimer) clearTimeout(workerRestartTimer);
  const child = worker;
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const force = setTimeout(() => {
      console.log("[launcher] Worker did not stop in time; forcing.");
      child.kill("SIGTERM");
    }, WORKER_GRACE_MS);
    child.once("exit", () => {
      clearTimeout(force);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

async function shutdown(exitCode: number): Promise<void> {
  if (stopping) return;
  stopping = true;
  if (server && server.exitCode === null) server.kill("SIGTERM");
  await stopWorker();
  process.exit(exitCode);
}

function main(): void {
  server = spawn("npx", ["next", "start", ...nextArgs], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: "inherit",
  });
  server.on("exit", (code) => {
    console.log(`[launcher] Server exited (code ${code ?? "null"}).`);
    void shutdown(code ?? 1);
  });

  startWorker();

  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));
}

main();
