import fs from "fs/promises";
import path from "path";
import { parseAbi } from "viem";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";
import { publicClient } from "@/lib/viem_public";

const MB_ABI = parseAbi([
  "function tasks(uint256) view returns (address creator, string contentCid, uint256 reward, uint256 createdAt, uint256 updatedAt, uint8 status, uint256 submissionCount)",
]);

const BATCH_SIZE = 50;

export async function POST(req: NextRequest) {
  try {
    const { body } = await validateAdminFido2(req);

    if (body.action !== "gc") {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const missionBoardAddress = process.env.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;
    if (!missionBoardAddress) {
      return jsonFail(API_ERRORS.IS_CONFIG_MISSING);
    }

    // Info: (20260426 - Luphia) 1. Fetch all valid task IDs from the blockchain
    const validTaskIds = new Set<number>();
    let currentId = 0n;
    let keepReading = true;

    while (keepReading) {
      const calls = Array.from({ length: BATCH_SIZE }, (_, i) => ({
        address: missionBoardAddress,
        abi: MB_ABI,
        functionName: "tasks" as const,
        args: [currentId + BigInt(i)] as readonly [bigint],
      }));

      const results = await Promise.allSettled(
        calls.map((c) =>
          publicClient.readContract({
            address: c.address,
            abi: c.abi,
            functionName: c.functionName,
            args: c.args,
          })
        )
      );

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === "fulfilled" && res.value) {
          const resultTuple = res.value as [string, string, bigint, bigint, bigint, number, bigint];
          const creator = resultTuple[0];

          if (creator === "0x0000000000000000000000000000000000000000") {
            keepReading = false;
            break;
          }

          validTaskIds.add(Number(currentId) + i);
        } else {
          keepReading = false;
          break;
        }
      }
      currentId += BigInt(BATCH_SIZE);
    }

    // Info: (20260426 - Luphia) 2. Scan missions and issues directories and GC invalid ones
    const directoriesToClean = ["missions", "issues"];
    const deletedFolders: string[] = [];

    for (const dirName of directoriesToClean) {
      const dirPath = path.join(/* webpackIgnore: true */ /* turbopackIgnore: true */ process.cwd(), dirName);

      let folders: import("fs").Dirent[] = [];
      try {
        folders = await fs.readdir(dirPath, { withFileTypes: true });
      } catch {
        // Info: (20260426 - Luphia) Directory doesn't exist
        continue;
      }

      for (const folder of folders) {
        if (!folder.isDirectory()) continue;
        const folderName = folder.name;

        // Info: (20260426 - Luphia) Exclude system folders like ".DS_Store", "0", "1", etc if they are not formatted properly
        if (!folderName.includes("_")) {
          // Info: (20260424 - Luphia) some folders in issues are just "10", "11". We should clean those too if they don't match the new `{address}_{taskId}` format.
          await fs.rm(path.join(/* webpackIgnore: true */ /* turbopackIgnore: true */ dirPath, folderName), { recursive: true, force: true });
          deletedFolders.push(`${dirName}/${folderName}`);
          continue;
        }

        const [addr, taskIdStr] = folderName.split("_");
        const taskId = Number(taskIdStr);

        // Info: (20260426 - Luphia) Delete if address doesn't match OR taskId is not valid
        if (addr.toLowerCase() !== missionBoardAddress.toLowerCase() || !validTaskIds.has(taskId)) {
          await fs.rm(path.join(/* webpackIgnore: true */ /* turbopackIgnore: true */ dirPath, folderName), { recursive: true, force: true });
          deletedFolders.push(`${dirName}/${folderName}`);
        }
      }
    }

    return jsonOk({ success: true, deleted: deletedFolders.length, details: deletedFolders });
  } catch (error) {
    console.error("GC Action Error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
