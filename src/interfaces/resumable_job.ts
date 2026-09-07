/**
 * Info: (20260827 - Luphia) 可中斷任務的對外檢視（issue #6712 / #6714）。
 *
 * 只有書籤，**沒有任何內容**：步驟 id 與計數而已。內容留在各功能自己的儲存，
 * 而個人會話那一份是端到端加密的——伺服器沒有金鑰，也不該有。
 *
 * 住在 interfaces 而不是 service：客戶端要讀它，而從 service 匯入型別會把整個
 * service 模組（連著 Prisma 的 repository）拉進客戶端的相依圖。
 */
export interface IJobView {
  id: string;
  // Info: (20260827 - Luphia) JOB_TYPE 常數
  type: string;
  // Info: (20260827 - Luphia) JOB_STATUS 常數；RESUMABLE＝掃描行程判定「現在夠了」
  status: string;
  /**
   * Info: (20260827 - Luphia) 綁定的資源。碳盤查是聊天室 channel，因此畫面可以
   * 用它從「我的所有未完成任務」裡挑出屬於當前聊天室的那一筆。
   */
  resourceKey: string;
  // Info: (20260827 - Luphia) JOB_PAUSE_REASON 常數；null＝不是暫停狀態
  pauseReason: string | null;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  remainingStepIds: string[];
  // Info: (20260827 - Luphia) epoch 毫秒
  updatedAt: number;
}
