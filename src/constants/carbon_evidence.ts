// Info: (20260720 - Emily) 第三章證據鏈(#54):carbon-evidence fence 常數與決定性建構/解析
// Info: (20260720 - Emily) 模式沿用 Julian 的 custom chart fence 攔截(markdown_content code renderer):
// Info: (20260720 - Emily) fence 只存「資料位址」(accountBookId),數據由元件實時問 API(帳本閱覽權限裁決)
// Info: (20260720 - Emily) — 報告文本不落任何數字快照,憑證數據永遠是最新的認列結果

// Info: (20260720 - Emily) fence 語言標籤(```carbon-evidence)
export const CARBON_EVIDENCE_FENCE_LANG = "carbon-evidence";

// Info: (20260720 - Emily) 證據鏈所屬章節(CARBON_REPORT_OUTLINE 第三章「溫室氣體排放」):
// Info: (20260720 - Emily) 該章數據段落於帳本會話草稿生成時自動附掛證據鏈
export const CARBON_EVIDENCE_CHAPTER_ID = "ch3";

// Info: (20260720 - Emily) fence 內容的設定鍵(key: value 格式,同 custom chart 慣例)
export const CARBON_EVIDENCE_BOOK_KEY = "accountBookId";

// Info: (20260720 - Emily) 產出證據鏈區塊(決定性;內容僅資料位址,無任何數字)
export const buildEvidenceChainBlock = (accountBookId: string): string =>
  `\`\`\`${CARBON_EVIDENCE_FENCE_LANG}\n${CARBON_EVIDENCE_BOOK_KEY}: ${accountBookId}\n\`\`\``;

// Info: (20260720 - Emily) 內容是否已含證據鏈區塊(注入冪等護欄)
export const hasEvidenceChainBlock = (content: string): boolean =>
  content.includes(`\`\`\`${CARBON_EVIDENCE_FENCE_LANG}`);

/**
 * Info: (20260720 - Emily) 解析 fence 內容 → accountBookId;
 * 格式不符回 null(渲染端顯示原始碼區塊,不猜不炸)
 */
export const parseEvidenceFence = (raw: string): string | null => {
  const line = raw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(`${CARBON_EVIDENCE_BOOK_KEY}:`));
  if (!line) return null;
  const value = line.slice(CARBON_EVIDENCE_BOOK_KEY.length + 1).trim();
  return value.length > 0 && value.length <= 100 ? value : null;
};
