import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { publicClient } from "@/lib/viem_public";
import { parseAbi, formatEther } from "viem";
import { ITask, TaskStatus } from "@/interfaces/mission_board";

const MB_ABI = parseAbi([
  "function tasks(uint256) view returns (address creator, string contentCid, uint256 reward, uint256 createdAt, uint256 updatedAt, uint8 status, uint256 submissionCount)",
  "function taskSubmissions(uint256, uint256) view returns (address submitter, string resultCid, uint256 consumedTokens, bool isRejected, uint256 disputeUntil)",
]);

const BATCH_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const user = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      return jsonFail(API_ERRORS.AUTH_ADMIN_REQUIRED);
    }

    const missionBoardAddress = process.env
      .NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

    if (!missionBoardAddress) {
      return jsonFail(API_ERRORS.IS_CONFIG_MISSING);
    }

    const allTasks: ITask[] = [];
    let currentId = 0n;
    let keepReading = true;

    // Info: (20260420 - Luphia) Batch read tasks
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
          }),
        ),
      );

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === "fulfilled" && res.value) {
          const resultTuple = res.value as [
            string,
            string,
            bigint,
            bigint,
            bigint,
            number,
            bigint,
          ];
          const [
            creator,
            contentCid,
            reward,
            createdAt,
            updatedAt,
            status,
            submissionCount,
          ] = resultTuple;

          if (creator === "0x0000000000000000000000000000000000000000") {
            keepReading = false;
            break;
          }

          allTasks.push({
            taskId: Number(currentId) + i,
            creator,
            contentCid,
            reward: formatEther(reward), // Info: (20260420 - Luphia) convert from wei
            createdAt: Number(createdAt),
            updatedAt: Number(updatedAt),
            status: status as TaskStatus,
            submissionCount: Number(submissionCount),
            submissions: [],
          });
        } else {
          keepReading = false;
          break;
        }
      }
      currentId += BigInt(BATCH_SIZE);
    }

    // Info: (20260420 - Luphia) Fetch submissions for tasks that have them
    const tasksWithSubmissions = allTasks.filter((t) => t.submissionCount > 0);
    const subCalls = [];
    const subCallMap: { taskId: number; subIndex: number }[] = [];

    for (const task of tasksWithSubmissions) {
      for (let i = 0; i < task.submissionCount; i++) {
        subCalls.push({
          address: missionBoardAddress,
          abi: MB_ABI,
          functionName: "taskSubmissions" as const,
          args: [BigInt(task.taskId), BigInt(i)] as readonly [bigint, bigint],
        });
        subCallMap.push({ taskId: task.taskId, subIndex: i });
      }
    }

    if (subCalls.length > 0) {
      // Info: (20260420 - Luphia) Chunk submissions calls if there are many to avoid RPC limits
      const SUB_BATCH = 100;
      for (let i = 0; i < subCalls.length; i += SUB_BATCH) {
        const chunk = subCalls.slice(i, i + SUB_BATCH);

        const chunkResults = await Promise.allSettled(
          chunk.map((c) =>
            publicClient.readContract({
              address: c.address,
              abi: c.abi,
              functionName: c.functionName,
              args: c.args,
            }),
          ),
        );

        for (let j = 0; j < chunkResults.length; j++) {
          const res = chunkResults[j];
          if (res.status === "fulfilled" && res.value) {
            const resultTuple = res.value as [
              string,
              string,
              bigint,
              boolean,
              bigint,
            ];
            const [
              submitter,
              resultCid,
              consumedTokens,
              isRejected,
              disputeUntil,
            ] = resultTuple;

            const mapEntry = subCallMap[i + j];
            const task = allTasks.find((t) => t.taskId === mapEntry.taskId);

            if (task) {
              task.submissions.push({
                submitter,
                resultCid,
                consumedTokens: formatEther(consumedTokens),
                isRejected,
                disputeUntil: Number(disputeUntil),
                subIndex: mapEntry.subIndex,
              });
            }
          }
        }
      }
    }

    for (const task of allTasks) {
      task.submissions.sort((a, b) => a.subIndex - b.subIndex);
    }
    allTasks.sort((a, b) => b.taskId - a.taskId);

    return jsonOk(allTasks);
  } catch (error) {
    console.error("MissionBoard API Error:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
