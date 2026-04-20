import { jsonOk } from "@/lib/utils/response";
import { prisma } from "@/lib/prisma";
import { publicClient } from "@/lib/viem_public";
import { SYSTEM_STATUS } from "@/constants/status";
import { dockerService } from "@/services/docker.service";

export async function GET() {
  const status = {
    database: SYSTEM_STATUS.CHECKING as string,
    blockchain: SYSTEM_STATUS.CHECKING as string,
    storage: SYSTEM_STATUS.CHECKING as string,
    timestamp: new Date().toISOString(),
  };

  let allHealthy = true;

  // Info: (20260419 - Luphia) 1. Check Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = SYSTEM_STATUS.HEALTHY;
  } catch (error) {
    status.database = SYSTEM_STATUS.UNHEALTHY;
    console.error("[HealthCheck] Database error:", error);
    allHealthy = false;
  }

  // Info: (20260419 - Luphia) 2. Check Blockchain
  try {
    await publicClient.getBlockNumber();
    status.blockchain = SYSTEM_STATUS.HEALTHY;
  } catch (error) {
    status.blockchain = SYSTEM_STATUS.UNHEALTHY;
    console.error("[HealthCheck] Blockchain error:", error);
    allHealthy = false;
  }

  // Info: (20260419 - Luphia) 3. Check Storage
  const storageDomain = process.env.STORAGE_DOMAIN;
  if (!storageDomain) {
    status.storage = SYSTEM_STATUS.UNCONFIGURED;
    allHealthy = false;
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(storageDomain, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      status.storage = SYSTEM_STATUS.HEALTHY;
    } catch (error) {
      status.storage = SYSTEM_STATUS.UNHEALTHY;
      console.error("[HealthCheck] Storage error:", error);
      allHealthy = false;
    }
  }

  // Info: (20260419 - Luphia) 4. Check Docker Containers
  type IDockerContainerInfo = { id: string; image: string; name: string; status: string; uptime: string; rawStatus: string };
  const dockerInfo: { status: string; uptime?: string; containers: IDockerContainerInfo[] } = { status: SYSTEM_STATUS.CHECKING, containers: [] };
  try {
    const isRunning = await dockerService.checkRunning();
    if (isRunning.success) {
      dockerInfo.status = SYSTEM_STATUS.HEALTHY;
      const containers = await dockerService.getRunningContainers();
      if (containers.success && containers.output) {
        const VALID_CONTAINERS = ['gateway', 'database', 'postgres', 'storage', 'blockchain'];
        const lines = containers.output.split('\n').filter(Boolean);
        if (lines.length > 0) {
          dockerInfo.containers = lines.map(line => {
            const parts = line.split('|'); // ID|Image|Names|Status
            if (parts.length >= 4) {
              const name = parts[2];
              if (!VALID_CONTAINERS.some(c => name.includes(c))) return null;

              const statusStr = parts[3];
              let uptime = statusStr;
              const match = statusStr.match(/Up\s+(.+)$/i);
              if (match) {
                uptime = match[1];
              }
              const isUp = statusStr.toLowerCase().startsWith("up");
              return {
                id: parts[0],
                image: parts[1],
                name: name,
                status: isUp ? SYSTEM_STATUS.HEALTHY : SYSTEM_STATUS.UNHEALTHY,
                uptime: uptime,
                rawStatus: statusStr
              };
            }
            return null;
          }).filter(c => c !== null) as IDockerContainerInfo[];

          const firstLine = lines[0];
          const parts = firstLine.split('|');
          if (parts.length >= 4) {
            const statusStr = parts[3];
            const match = statusStr.match(/Up\s+(.+)$/i);
            dockerInfo.uptime = match ? match[1] : statusStr;
          }
        }
      }
    } else {
      dockerInfo.status = SYSTEM_STATUS.UNHEALTHY;
      allHealthy = false;
      console.error("[HealthCheck] Docker is not running");
    }
  } catch (err) {
    dockerInfo.status = SYSTEM_STATUS.UNHEALTHY;
    allHealthy = false;
    console.error("[HealthCheck] Docker check error:", err);
  }

  const finalStatus = {
    ...status,
    docker: dockerInfo.status,
    dockerUptime: dockerInfo.uptime || "---",
    containers: dockerInfo.containers,
  };

  const message = allHealthy ? "System is healthy" : "System is degraded";
  return jsonOk(finalStatus, message);
}
