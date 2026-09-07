/**
 * Info: (20260818 - Luphia) 守恆差額該不該自動補平的判斷（純函式）。
 *
 * 抽出來是因為這是修復腳本裡**唯一有風險的一段**：凍結的意義是「有人動了不該動的
 * 東西」，而一支會自己把帳弄平的腳本會讓那件事無聲無息。所以規則要能被測到，
 * 而不是埋在一支只有維運會跑的腳本裡。
 *
 * 差額的來源（見 `teamWalletRepo.allocate` 的更正段）：分配改為鑄到成員自己的鏈上
 * 錢包之後，池減少而沒有任何分配列承接，`ALLOCATE` 又被勾稽排除——2026-08-18 修法
 * 之前的每一筆分配都留下一個永久差額。修法之後每筆 `ALLOCATE` 都配一筆負的 `ADJUST`。
 */

export const CONSERVATION_REPAIR_ACTION = {
  // Info: (20260818 - Luphia) 守恆已成立，什麼都不用做
  NONE: "NONE",
  // Info: (20260818 - Luphia) 帳是平的但錢包還凍著（前一次修復到一半）
  UNFREEZE_ONLY: "UNFREEZE_ONLY",
  // Info: (20260818 - Luphia) 差額解釋得通：補一筆負 ADJUST
  REPAIR: "REPAIR",
  // Info: (20260818 - Luphia) 解釋不通：拒絕動手，交人工
  REFUSE: "REFUSE",
} as const;

export type ConservationRepairAction =
  (typeof CONSERVATION_REPAIR_ACTION)[keyof typeof CONSERVATION_REPAIR_ACTION];

export interface IConservationState {
  /** Info: (20260818 - Luphia) 恆等式左側 − 右側 */
  diff: bigint;
  /** Info: (20260818 - Luphia) 沒有配對負 ADJUST 的 ALLOCATE 淨額（修法之前的那些） */
  unpairedAllocate: bigint;
  /** Info: (20260818 - Luphia) 這個錢包是否已經被修復腳本補過一次 */
  alreadyRepaired: boolean;
  /** Info: (20260818 - Luphia) 目前是否為凍結狀態 */
  frozen: boolean;
}

export interface IConservationRepairDecision {
  action: ConservationRepairAction;
  /** Info: (20260818 - Luphia) 要補的金額（REPAIR 時為 `-diff`，其餘為 0） */
  adjustAmount: bigint;
  reason: string;
}

export function resolveConservationRepair(
  state: IConservationState,
): IConservationRepairDecision {
  const { diff, unpairedAllocate, alreadyRepaired, frozen } = state;

  if (diff === BigInt(0)) {
    return frozen
      ? {
          action: CONSERVATION_REPAIR_ACTION.UNFREEZE_ONLY,
          adjustAmount: BigInt(0),
          reason: "守恆已成立但仍為凍結",
        }
      : {
          action: CONSERVATION_REPAIR_ACTION.NONE,
          adjustAmount: BigInt(0),
          reason: "守恆成立",
        };
  }

  /**
   * Info: (20260818 - Luphia) 補過一次又出現差額 → 不是舊帳。
   *
   * 舊帳只會有一筆：那是修法之前累積的存量。修完之後再長出差額代表現在還有一條
   * 活路徑在破壞守恆（或有人直接動了資料），那正是凍結要攔的事，不該被抹平。
   */
  if (alreadyRepaired) {
    return {
      action: CONSERVATION_REPAIR_ACTION.REFUSE,
      adjustAmount: BigInt(0),
      reason: "已修復過一次卻又出現差額，不是存量問題",
    };
  }

  /**
   * Info: (20260818 - Luphia) 差額必須**恰好**等於未配對的 ALLOCATE 淨額。
   *
   * 不用「差額為正就補」或「取小的那個補」：那會把任何其他成因的差額一起吃掉，
   * 而其他成因正是這道防線存在的理由。多一分少一分都交人工。
   */
  if (diff !== unpairedAllocate) {
    return {
      action: CONSERVATION_REPAIR_ACTION.REFUSE,
      adjustAmount: BigInt(0),
      reason: `差額 ${diff} 與未配對的 ALLOCATE 淨額 ${unpairedAllocate} 不符`,
    };
  }

  return {
    action: CONSERVATION_REPAIR_ACTION.REPAIR,
    adjustAmount: -diff,
    reason: "差額等於未配對的 ALLOCATE 淨額（修法之前的存量）",
  };
}
