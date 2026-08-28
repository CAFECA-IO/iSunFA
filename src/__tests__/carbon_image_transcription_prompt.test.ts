import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Info: (20260827 - Emily) 影像轉錄鐵律的條文不得被刪(#6708 的修法;PR #6725 round-2 中-1)。
 *
 * 這是掃描測試,回答的只有一個問題:**條文還在不在**(§1.11)。
 * prompt 的**效果**只能抽樣量測(08-24 run G / 08-27 重匯:`grep -c "呂麗"` = 0),
 * 但「有人為了 token 預算精簡措辭、把其中一條禁止句刪掉」是可以釘死的 ——
 * 而那件事的後果是 #6708 復發:模型讀不動架構圖的直式小字,
 * 就從第一章沿革撈真人名、再依姓氏編出其餘委員,湊出一份大半不實的委員名單,
 * 印在送第三方查證的文件上。而唯一的既有偵測方式是手動重匯一輪再 grep 成品 PDF。
 *
 * `buildImagePagesInstruction` 是模組私有函式,所以掃的是源碼字串 ——
 * 這正是掃描測試該用的地方:它不宣稱驗了行為,只宣稱條文在位。
 *
 * Info: (20260828 - Emily) 兩條紀律(round-2 中-1 的提醒):
 * 1. **斷言錨在短而獨特的子字串**,不整句比對 —— 整句比對會被標點全形/半形、
 *    語序微調、加一個「請」誤判成「條文被刪」。那種紅燈的成本是有人來查半小時、
 *    發現什麼都沒壞,幾次之後這個檔案就會被當成噪音關掉,而它守的是 #6708。
 * 2. **這裡只宣稱條文在不在**;prompt 真正的效果由重匯實測負責
 *    (`grep -c "呂麗"` = 0 那一輪),掃描綠不等於模型不編人名。
 */

const SERVICE = path.join(
  process.cwd(),
  "src/services/report_import.service.ts",
);

describe("影像轉錄鐵律的條文(#6708)", () => {
  const source = fs.readFileSync(SERVICE, "utf-8");

  it("禁止句一:不得從文件其他章節撈人名", () => {
    expect(source).toContain("其他章節");
    expect(source).toContain("撈人名");
  });

  it("禁止句二:不得依姓氏或職稱慣例生成名字", () => {
    expect(source).toContain("姓氏或職稱慣例");
  });

  it("局部無法辨識有明確的輸出格式範本(給「讀不出」一條合法出路)", () => {
    /**
     * Info: (20260827 - Emily) #6708 的根因不是「模型會亂編」,是原 prompt
     * 只說「不要臆造」卻沒給「怎麼寫讀不出」——缺少合法出路時,補全是模型的必然行為。
     * 所以格式範本與禁止句同等重要,兩者缺一條這個修法就退回去了。
     */
    expect(source).toContain("無法逐一辨識");
    expect(source).toContain("見原文第");
    expect(source).toContain("若干");
  });

  it("整張圖無法辨識也有格式(不是只處理局部)", () => {
    expect(source).toContain("本節內容為圖片");
  });

  it("寧可留白的立場寫在條文裡", () => {
    expect(source).toContain("寧可留白");
    expect(source).toContain("比留白嚴重");
  });

  it("兩個 prompt 組裝點都帶入這段指令(接線,不只是條文存在)", () => {
    const calls = source.match(/buildImagePagesInstruction\(source\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});
