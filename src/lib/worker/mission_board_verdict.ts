import { parseAbi, type PublicClient } from "viem";
import { MISSION_GIVE_UP_REJECTION_THRESHOLD } from "@/constants/worker_node";

/**
 * Info: (20260914 - Luphia) 「這筆任務已放棄」的**唯一**判準（PR #6650 review 需修-6）。
 *
 * 原本只有 `mission.closer.service.ts`（運算節點）會判：最新一次提交被拒絕、
 * 且提交次數 ≥ 3 → 寫 `giveup.md`。而 `issue.recorder.service.ts`（維運節點）
 * 是全站唯一寫訂單終態的地方，它靠**讀那個檔案**知道任務放棄了——兩個節點
 * 依 shared-nothing 原則不共用磁碟，真的分機器之後檔案過不了界，訂單永久卡在
 * EXECUTING／PAID，也沒有 DLQ。
 *
 * 跨界的合法通道是區塊鏈：放棄的事實本來就是從 MissionBoard 的狀態推出來的，
 * 所以讓 recorder 也從鏈上讀同一個判準。判準抽成純函式讓兩個節點**不可能**
 * 各寫一個 3；ABI 也只留一份。
 */
export const MISSION_BOARD_READ_ABI = parseAbi([
  "function tasks(uint256) external view returns (address creator, string contentCid, uint256 reward, uint256 createdAt, uint256 updatedAt, uint8 status, uint256 submissionCount)",
  "function taskSubmissions(uint256, uint256) external view returns (address submitter, string resultCid, uint256 consumedTokens, bool isRejected, uint256 disputeUntil)",
]);

/**
 * Info: (20260914 - Luphia) 純判準：最新一次提交被拒且累計提交數達門檻。
 * `submissionCount === 0` 時沒有「最新一次」可談，恆為未放棄。
 */
export const isTaskGivenUp = (
  submissionCount: bigint,
  latestSubmissionRejected: boolean,
): boolean =>
  submissionCount >= BigInt(MISSION_GIVE_UP_REJECTION_THRESHOLD) &&
  latestSubmissionRejected;

/**
 * Info: (20260914 - Luphia) 讀鏈的最小介面：只回答「這個 view 函式帶這些參數
 * 回什麼」。判準邏輯（`readGiveUpVerdict`）對著它寫，測試以一個閉包當替身，
 * 不必起 viem 用戶端；生產端由 `viemMissionBoardReader` 把真的 client 包成它。
 */
export type MissionBoardReader = (
  functionName: "tasks" | "taskSubmissions",
  args: readonly bigint[],
) => Promise<unknown>;

/**
 * Info: (20260914 - Luphia) 把 viem 的 `readContract` 包成 `MissionBoardReader`。
 * 兩個分支分開呼叫而不是把 `functionName` 當變數傳：viem 的泛型要靠字面值
 * 收斂參數 tuple，合併寫會落到 `readonly bigint[]` 對不上 `[bigint, bigint]`。
 */
export const viemMissionBoardReader = (
  client: Pick<PublicClient, "readContract">,
  mbAddress: `0x${string}`,
): MissionBoardReader => {
  return (functionName, args) =>
    functionName === "tasks"
      ? client.readContract({
          address: mbAddress,
          abi: MISSION_BOARD_READ_ABI,
          functionName: "tasks",
          args: [args[0]],
        })
      : client.readContract({
          address: mbAddress,
          abi: MISSION_BOARD_READ_ABI,
          functionName: "taskSubmissions",
          args: [args[0], args[1]],
        });
};

/**
 * Info: (20260914 - Luphia) 讀鏈上狀態並套用判準。讀法與 closer 逐字相同——
 * 先 `tasks` 取 submissionCount，再讀**最後一筆**提交（index = count − 1）。
 */
export const readGiveUpVerdict = async (
  read: MissionBoardReader,
  taskId: bigint,
): Promise<boolean> => {
  const task = (await read("tasks", [taskId])) as [
    string,
    string,
    bigint,
    bigint,
    bigint,
    number,
    bigint,
  ];
  const submissionCount = task[6];
  /**
   * Info: (20260914 - Luphia) 未達門檻就不讀第二次（review 三輪建議-9）：判準是
   * 「count ≥ 門檻 且最新一筆被拒」，count 不夠時第二次讀的結果不影響答案。
   * recorder 每 tick 對每個在途任務問一次，在途任務絕大多數 count 是 0～2，
   * 這一行省掉近半的鏈讀。`=== 0n` 的舊判斷被它涵蓋。
   */
  if (submissionCount < BigInt(MISSION_GIVE_UP_REJECTION_THRESHOLD)) {
    return false;
  }

  const latest = (await read("taskSubmissions", [
    taskId,
    submissionCount - 1n,
  ])) as [string, string, bigint, boolean, bigint];
  return isTaskGivenUp(submissionCount, latest[3]);
};
