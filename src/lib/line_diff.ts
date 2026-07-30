// Info: (20260717 - Tzuhan) 行級 diff(#55 修訂對照卡優化):純函式 LCS,無第三方依賴
// Info: (20260717 - Tzuhan) 用途:原文/修訂稿的逐行對照(same/removed/added),讓人工確認一眼看見「動了哪幾行」

export enum DiffLineTypeEnum {
  SAME = "SAME",
  REMOVED = "REMOVED",
  ADDED = "ADDED",
}

export interface IDiffLine {
  type: DiffLineTypeEnum;
  text: string;
}

// Info: (20260717 - Tzuhan) O(n×m) DP 的行數護欄:段落內文通常數十行,超限時由呼叫端退回並列顯示
export const LINE_DIFF_MAX_LINES = 500;

/**
 * Info: (20260717 - Tzuhan) 標準 LCS 行 diff:
 * 回傳 null 表示超出護欄(呼叫端退回「原文/修訂並列」的舊呈現,不做部分 diff 誤導使用者)
 */
export const diffLines = (
  original: string,
  revised: string,
): IDiffLine[] | null => {
  const a = original.split("\n");
  const b = revised.split("\n");
  if (a.length > LINE_DIFF_MAX_LINES || b.length > LINE_DIFF_MAX_LINES) {
    return null;
  }

  // Info: (20260717 - Tzuhan) LCS 長度表(DP)
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Info: (20260717 - Tzuhan) 回溯輸出:相同行 SAME;差異處先 REMOVED(原文)後 ADDED(修訂)
  const lines: IDiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push({ type: DiffLineTypeEnum.SAME, text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ type: DiffLineTypeEnum.REMOVED, text: a[i] });
      i++;
    } else {
      lines.push({ type: DiffLineTypeEnum.ADDED, text: b[j] });
      j++;
    }
  }
  while (i < a.length) {
    lines.push({ type: DiffLineTypeEnum.REMOVED, text: a[i] });
    i++;
  }
  while (j < b.length) {
    lines.push({ type: DiffLineTypeEnum.ADDED, text: b[j] });
    j++;
  }
  return lines;
};
