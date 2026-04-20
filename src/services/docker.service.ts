import { runCommand } from "@/services/cli.service";

export class DockerService {
  private wrapCmd(cmd: string) {
    return process.platform === "darwin" ? `zsh -ic "${cmd}"` : cmd;
  }

  public async checkInstalled() {
    return await runCommand(this.wrapCmd("docker --version"));
  }

  public async checkRunning() {
    return await runCommand(this.wrapCmd("docker info"));
  }

  public async getRunningContainers() {
    return await runCommand(
      this.wrapCmd("docker ps --format '{{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}'")
    );
  }

  public async startEngine() {
    const platform = process.platform;
    if (platform === "darwin") {
      return await runCommand('zsh -ic "open -a Docker"');
    } else if (platform === "linux") {
      let result = await runCommand("sudo systemctl start docker");
      if (!result.success) {
        result = await runCommand("sudo service docker start");
      }
      return result;
    }
    return { success: false, output: "Unsupported OS to auto-start Docker." };
  }

  public async composeUp(cwd: string) {
    let result = await runCommand(this.wrapCmd("docker compose up -d"), cwd);
    if (!result.success && result.output.includes("not a docker command")) {
      result = await runCommand(this.wrapCmd("docker-compose up -d"), cwd);
    }
    return result;
  }

  public async execContainer(containerName: string, command: string) {
    if (process.platform === "darwin") {
      const escapedCmd = command.replace(/"/g, '\\"');
      return await runCommand(`zsh -ic "docker exec ${containerName} ${escapedCmd}"`);
    } else {
      return await runCommand(`docker exec ${containerName} ${command}`);
    }
  }

  public async composeRestart(cwd: string, serviceName?: string) {
    const target = serviceName ? ` ${serviceName}` : "";
    let result = await runCommand(this.wrapCmd(`docker compose restart${target}`), cwd);
    if (!result.success && result.output.includes("not a docker command")) {
      result = await runCommand(this.wrapCmd(`docker-compose restart${target}`), cwd);
    }
    return result;
  }
}

export const dockerService = new DockerService();
