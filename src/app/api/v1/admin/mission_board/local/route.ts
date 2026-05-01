import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import fs from "fs/promises";
import path from "path";
import { ILocalMission, LocalMissionStatus } from "@/interfaces/mission_board";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const user = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const missionsDir = path.join(process.cwd(), "missions");

    try {
      await fs.access(missionsDir);
    } catch {
      // Info: (20260427 - Luphia) Missions folder doesn't exist yet
      return jsonOk([]);
    }

    const folders = await fs.readdir(missionsDir, { withFileTypes: true });
    const localMissions: ILocalMission[] = [];

    for (const folder of folders) {
      if (!folder.isDirectory()) continue;

      const folderId = folder.name;
      const folderPath = path.join(missionsDir, folderId);

      const files = await fs.readdir(folderPath);

      const hasSubmit = files.includes("submit.executor.json");
      const hasExecutionLog = files.includes("execution_log.json");
      const failedMdFiles = files.filter(
        (f) => f.startsWith("failed_") && f.endsWith(".md"),
      );
      const failureCount = failedMdFiles.length;

      let status: LocalMissionStatus = "pending";
      if (hasSubmit) {
        status = "completed";
      } else if (hasExecutionLog) {
        status = "executing";
      } else if (failureCount >= 3) {
        status = "failed";
      }

      const failedLogs = [];
      if (status === "failed" || failureCount > 0) {
        for (const file of failedMdFiles) {
          const content = await fs.readFile(
            path.join(folderPath, file),
            "utf8",
          );
          failedLogs.push({ filename: file, content });
        }
      }

      localMissions.push({
        folderId,
        status,
        failureCount,
        failedLogs,
      });
    }

    return jsonOk(localMissions);
  } catch (error) {
    console.error("Local Mission Read Error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
