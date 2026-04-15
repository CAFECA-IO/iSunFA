import { spawn } from "child_process";

export class SnapshotService {
  private readonly imageName = "ghcr.io/puppeteer/puppeteer:latest";

  // Info: (20260407 - Luphia) 60 Seconds timeout for safety bounds loading pages and scrolling
  private readonly timeoutMs = 60000;

  /**
   * Info: (20260407 - Luphia) Spawns a headless browser inside a Docker container, dynamically injecting
   * a script logic over stdin to prevent escaping & shell issues.
   * Resolves the returned page string strictly encoded as base64.
   */
  public async snapshot(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      // Info: (20260407 - Luphia) The dynamic script that will run inside the container's node environment
      const scriptCode = `
      const puppeteer = require('puppeteer');
      (async () => {
        try {
          const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          const page = await browser.newPage();
          // Full HD width, dynamic vertical height
          await page.setViewport({ width: 1920, height: 1080 });
          await page.goto('${url.replace(/'/g, "\\'")}', { waitUntil: 'networkidle2' });
          
          // Info: (20260407 - Luphia) Auto-scroll to trigger lazy-loaded elements
          await page.evaluate(async () => {
            await new Promise((resolve) => {
              let totalHeight = 0;
              const distance = 100;
              const timer = setInterval(() => {
                const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight - window.innerHeight){
                  clearInterval(timer);
                  window.scrollTo(0, 0);
                  resolve(null);
                }
              }, 100);
            });
          });
          
          const screenshotBase64 = await page.screenshot({ fullPage: true, encoding: 'base64' });
          console.log(screenshotBase64);
          await browser.close();
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
      })();
      `;

      // Info: (20260407 - Luphia) Spawn docker passing "node -" so it evaluates STDIN immediately.
      const dockerProcess = spawn("docker", [
        "run",
        "--rm",
        "-i", // Info: (20260407 - Luphia) Need interactive flag for STDIN bridging
        this.imageName,
        "node",
        "-",
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
          dockerProcess.kill("SIGKILL");
          reject(
            new Error(
              `Snapshot execution exceeded timeout limit of ${this.timeoutMs}ms.`,
            ),
          );
        }
      }, this.timeoutMs);

      dockerProcess.on("close", (code) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);

        if (code !== 0) {
          reject(
            new Error(`Docker Puppeteer failed (Code ${code}): ${errorOutput}`),
          );
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

      // Info: (20260407 - Luphia) Write code directly to STDIN over the pipeline
      dockerProcess.stdin.write(scriptCode);
      dockerProcess.stdin.end();
    });
  }
}
