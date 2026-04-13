import { runCommand } from "@/services/cli.service";

export class DockerService {
  public async checkInstalled() {
    return await runCommand("docker --version");
  }

  public async checkRunning() {
    return await runCommand("docker info");
  }

  public async startEngine() {
    const platform = process.platform;
    if (platform === 'darwin') {
      return await runCommand("open -a Docker");
    } else if (platform === 'linux') {
      let result = await runCommand("sudo systemctl start docker");
      if (!result.success) {
        result = await runCommand("sudo service docker start");
      }
      return result;
    }
    return { success: false, output: "Unsupported OS to auto-start Docker." };
  }

  public async composeUp(cwd: string) {
    let result = await runCommand("docker compose up -d", cwd);
    if (!result.success && result.output.includes("not a docker command")) {
      result = await runCommand("docker-compose up -d", cwd);
    }
    return result;
  }

  public async execContainer(containerName: string, command: string) {
    return await runCommand(`docker exec ${containerName} ${command}`);
  }
}

export const dockerService = new DockerService();
