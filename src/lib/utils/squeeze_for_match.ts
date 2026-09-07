/**
 * Info: (20260820 - Emily) 「同一個標題字串是不是同一個」的唯一 canonical 判定。
 *
 * ## 為什麼要 NFKC，為什麼要去空白
 *
 * 去空白是因為文字層會在中文之間插入換行與空格：
 * `3.4 計 算\n細節` 與 `3.4計算細節` 在紙上是同一句話。
 *
 * NFKC 是因為抽出來的字不一定是同一個碼位：**實測「第一章」的「一」抽出來是
 * U+2F00（康熙部首），不是 U+4E00** —— 字面看起來一樣但字串不相等。
 * 這一條是實測出來的，不是理論上的預防。
 *
 * ## 為什麼要有這一支
 *
 * 2026-08-20 的 PR review 點出這個運算當時有**四份位元組相同的實作**：
 * `carbon_toc_pages.ts` 的 `squeezeForTocMatch`（帶著上面那個理由）、
 * `markdown_echoed_heading.ts` 的 `normalizeForCompare`、
 * 以及 `uat_carbon_report.ts` 裡兩份區域 `squeeze`。
 *
 * 而它們比對的是**同一種東西** —— 節標題。四份分岔的失效方式是靜默的：
 * 某一份加了規則（例如再收斂全角括號），另外三份沒加，
 * 於是「目錄對得上」與「標題沒有重複」兩條判準對同一份紙給出不一致的答案。
 *
 * 同一個對象的判定要有單一 canonical 函式。要改判定規則就改這裡，一次改全部。
 */
export const squeezeForMatch = (value: string): string =>
  value.normalize("NFKC").replace(/\s+/g, "");
