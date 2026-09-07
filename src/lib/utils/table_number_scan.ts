/**
 * Info: (20260824 - Emily) 掃一段文字裡出現過的「表 N.M」編號(#6710 覆蓋率判準的量尺)。
 *
 * ## 為什麼需要它
 *
 * 「還是有缺漏的章節/表格」到 08-24 為止都靠人眼翻頁。覆蓋率判準要機器判,
 * 就得先能從**原檔**與**成品**各掃出一份表號清單來相減 —— 這支就是那把尺。
 *
 * ## 兩個護欄,各自有一次真實誤報墊背
 *
 * 1. `(?<!理)`:08-24 實測,環境部排放係數「管理表 6.0.4」在原檔出現 20 次,
 *    第一版量尺把它當成「表6.0」—— 於是報告被判「漏了表6.0」,而原檔只有 19 張表,
 *    根本沒有表6.0。「理」擋掉的是**版本號**,不是表號。
 *    之後若出現新的複合詞誤報(統計表、對帳表…),加進這個排除類,並補一條測試。
 * 2. 尾端 `(?!…)`:表號至多兩段(表2.1、表3.6.1);第三段還有數字的
 *    (如未帶「理」字首的 6.0.4.1 之類版本串)不是表號,整串放掉。
 *
 * ## 為什麼自帶正規化
 *
 * 呼叫端(UAT 腳本)雖然餵的是 NFKC 後的文字,但這把尺不該依賴呼叫端記得這件事 ——
 * 全形數字(０-９)、全形句點(．)、表字後的空白,量尺自己吃掉。
 * 依賴呼叫端的正規化,分岔的那天量尺會靜默漏抓,而它是覆蓋率判準的量尺。
 */

const TABLE_NUMBER =
  /(?<!理)表\s*([0-9０-９]+(?:\s*[.．]\s*[0-9０-９]+){1,2})(?!\s*[.．]\s*[0-9０-９])/g;

const FULL_WIDTH_ZERO = 0xff10;
const FULL_WIDTH_NINE = 0xff19;

const normalizeNumber = (raw: string): string =>
  [...raw]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code >= FULL_WIDTH_ZERO && code <= FULL_WIDTH_NINE) {
        return String.fromCharCode(code - FULL_WIDTH_ZERO + 0x30);
      }
      if (char === "．") return ".";
      if (/\s/.test(char)) return "";
      return char;
    })
    .join("");

// Info: (20260824 - Emily) 依段落逐段比大小(2.10 要排在 2.9 後面,字典序會排錯)
const compareTableNumbers = (a: string, b: string): number => {
  const as = a.split(".").map(Number);
  const bs = b.split(".").map(Number);
  const length = Math.max(as.length, bs.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (as[i] ?? 0) - (bs[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/** Info: (20260824 - Emily) 回傳去重、依編號排序的表號清單(如 ["2.1","3.6","3.6.1"]) */
export const scanTableNumbers = (text: string): string[] => {
  const found = new Set<string>();
  for (const match of text.matchAll(TABLE_NUMBER)) {
    found.add(normalizeNumber(match[1]));
  }
  return [...found].sort(compareTableNumbers);
};
