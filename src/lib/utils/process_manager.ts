import { ChildProcess } from "child_process";

export class ProcessManager {
  private activeProcesses: Set<ChildProcess> = new Set();
  private isShuttingDown = false;
  private initialized = false;

  constructor() { }

  public register(child: ChildProcess) {
    this.ensureInitialized();

    if (this.isShuttingDown) {
      child.kill("SIGTERM");
      return;
    }

    this.activeProcesses.add(child);

    // Info: (20260421 - Luphia) Remove from set when it closes to avoid memory leaks
    const removeHandler = () => this.activeProcesses.delete(child);
    child.on("close", removeHandler);
    child.on("error", removeHandler);
    child.on("exit", removeHandler);
  }

  public unregister(child: ChildProcess) {
    this.activeProcesses.delete(child);
  }

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    // Info: (20260421 - Luphia) In Next.js environments or hot-reloading, ensure we don't leak global handlers
    if (typeof process !== "undefined") {
      const handleShutdown = (signal: string) => {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        console.log(`\n[ProcessManager] ${signal} received. Terminating ${this.activeProcesses.size} active subprocesses...`);

        for (const child of this.activeProcesses) {
          if (!child.killed) {
            try {
              // Info: (20260421 - Luphia) Send SIGTERM instead of SIGKILL so processes like Docker can gracefully stop containers
              child.kill("SIGTERM");
            } catch (e) {
              console.warn("[ProcessManager] Failed to kill child process:", e);
            }
          }
        }
        this.activeProcesses.clear();
      };

      // Info: (20260421 - Luphia) Use once to not hijack the primary process shutdown
      process.once("SIGTERM", () => handleShutdown("SIGTERM"));
      process.once("SIGINT", () => handleShutdown("SIGINT"));
    }
  }
}

export const processManager = new ProcessManager();
