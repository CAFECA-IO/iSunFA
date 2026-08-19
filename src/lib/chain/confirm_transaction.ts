import { publicClient } from "@/lib/viem";

/**
 * Info: (20260818 - Luphia) 等待交易上鏈，**並確認它沒有 revert**（第三輪）。
 *
 * `waitForTransactionReceipt` 對 revert 的交易一樣正常回傳收據——只有逾時才拋。
 * 因此「送得出去」不等於「做成了」，而本 repo 有二十處只 await 而不看 `status`。
 *
 * 最貴的兩種：
 *
 * - **銷毀**：離鏈帳本記下「已收回」、團隊池加回點數，而成員錢包一分沒少，
 *   等於憑空多出一批點數。
 * - **鑄造**（`issuePurchasedPointsToMember`）：三條金流的共用點。
 *   一筆 reverted 的鑄造會讓 `manageAllocation` 把池扣掉、分錄寫下、
 *   回填一個指向失敗交易的 txHash，而補償永遠不會觸發；
 *   `refundPersonalCreditCharge` 則會蓋上 `refundedAt` 而用戶沒拿到退款。
 *
 * 放在共用的 lib 而不是各服務自己寫一份：第三輪的 review 指出，
 * 上一次的修正把這個函式留在 `token.service.ts` 裡，於是掃描測試的
 * 涵蓋範圍剛好等於被修的那一個檔案。
 *
 * 丟錯而不是回 false：呼叫端多半已有 try/catch 把錯誤轉成
 * `{ success: false, message }`，在那裡統一處理比在每一處各寫一次分支乾淨。
 */
export async function confirmTransaction(hash: `0x${string}`): Promise<void> {
  await confirmTransactionReceipt(hash);
}

/**
 * Info: (20260819 - Luphia) 同上，但把收據交回呼叫端。
 *
 * 有些寫入的結果只在收據裡：`mintCard` 的 tokenId 要從 ERC721 的 `Transfer`
 * 事件讀（`writeContract` 只回交易哈希，而 `simulateContract` 回的是模擬當下的
 * 號碼，中間有人鑄一張就對不上）。
 *
 * 檢查 `status` 的程式碼仍然只有一份：`confirmTransaction` 轉呼這一支。
 * 掃描測試（`chain_receipt_status.test.ts`）禁止本檔以外出現
 * `waitForTransactionReceipt`，因此需要收據的呼叫端必須走這裡，
 * 而不是自己等一次——那正是它要防的形狀。
 */
export async function confirmTransactionReceipt(
  hash: `0x${string}`,
): Promise<Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`交易已上鏈但執行失敗（reverted）: ${hash}`);
  }
  return receipt;
}
