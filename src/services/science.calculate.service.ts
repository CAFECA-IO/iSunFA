import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class ScienceCalculateService {
  private readonly imageName = "isunfa-science:latest";

  // Info: (20260407 - Luphia) Timeout in milliseconds to prevent endless loops in Python
  private readonly timeoutMs = 10000;

  // Info: (20260407 - Luphia) Ensures the Docker image is built locally before running.
  private async ensureImageExists(): Promise<void> {
    try {
      const { stdout } = await execAsync(`docker images -q ${this.imageName}`);
      if (!stdout.trim()) {
        console.log(`[ScienceCalculateService] Building Docker image ${this.imageName} (this may take a few minutes for the first time)...`);
        const dockerfile = `
FROM python:3.10-slim
RUN pip install --no-cache-dir sympy scipy numpy
`;
        // Info: (20260407 - Luphia) Build the docker image securely by echoing dockerfile to docker build via stdin
        await execAsync(`echo "${dockerfile}" | docker build -t ${this.imageName} -`);
        console.log(`[ScienceCalculateService] Docker image ${this.imageName} built successfully.`);
      }
    } catch (error) {
      console.error("[ScienceCalculateService] Failed to ensure docker image exists:", error);
      throw new Error("Failed to prepare Docker dependency environment for calculation.");
    }
  }

  /**
   * Info: (20260407 - Luphia)
   * Executes arbitrary python calculation scripts safely inside the docker container
   * using stdin streaming. Will self-terminate if script takes too long.
   */
  public async calculate(pythonCode: string): Promise<string> {
    await this.ensureImageExists();

    return new Promise((resolve, reject) => {
      let resolved = false;

      /**
       * Info: (20260407 - Luphia)
       * Spawn docker container in interactive mode (-i) reading from stdin.
       * --rm ensures the container stops and is deleted once the execution ends.
       */
      const dockerProcess = spawn("docker", [
        "run",
        "--rm",
        "-i",
        this.imageName,
        "python",
        "-c",
        "import sys; exec(sys.stdin.read())"
      ]);

      let output = "";
      let errorOutput = "";

      dockerProcess.stdout.on("data", (data) => {
        output += data.toString();
      });

      dockerProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      // Info: (20260407 - Luphia) Guard Timeout
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Info: (20260407 - Luphia) Forceally stop Python execution to release container
          dockerProcess.kill("SIGKILL");
          reject(new Error(`Python Script Exhausted Timeout Limit of ${this.timeoutMs}ms.`));
        }
      }, this.timeoutMs);

      dockerProcess.on("close", (code) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);

        if (code !== 0) {
          reject(new Error(`Execution failed (Code ${code}): ${errorOutput}`));
        } else {
          resolve(output.trim());
        }
      });

      dockerProcess.on("error", (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        reject(err);
      });

      // Info: (20260407 - Luphia) Write Python syntax into STDIN
      dockerProcess.stdin.write(pythonCode);
      dockerProcess.stdin.end();
    });
  }
}
