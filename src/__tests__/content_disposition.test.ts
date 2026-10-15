/**
 * Info: (20260914 - Julian) 下載檔名的兩端：`fileOk` 產生、`parseContentDispositionFilename` 讀回。
 *
 * 這兩支在不同的檔案裡（`response.ts` 在伺服器、`request.ts` 在瀏覽器），
 * 而它們之間的約定只存在於 `Content-Disposition` 這個字串裡 ——
 * 沒有任何型別把它們綁在一起。
 *
 * 20260914 就是這麼壞的：`fileOk` 為了中文公司抬頭改成 RFC 6266 的
 * 兩種形式並存，讀的那一端還只認 `filename="..."`，於是伺服器送對了、
 * 使用者的下載資料夾裡卻是一整排底線。tsc 與 eslint 都不會說話。
 *
 * 所以這個檔案守的是**往返**，不是各自的實作：
 * 任何一端單獨改，下面最後那一組就會紅。
 */

import { describe, it, expect } from "@jest/globals";
import { fileOk } from "@/lib/utils/response";
import { parseContentDispositionFilename } from "@/lib/utils/request";

const headerOf = (filename: string): string =>
  fileOk("x", filename, "text/csv").headers.get("Content-Disposition") ?? "";

describe("fileOk 產生的 Content-Disposition", () => {
  it("純 ASCII 檔名兩種形式都給，且內容一致", () => {
    const header = headerOf("salary-records-2026-08.csv");

    expect(header).toContain('filename="salary-records-2026-08.csv"');
    expect(header).toContain("filename*=UTF-8''salary-records-2026-08.csv");
  });

  /**
   * Info: (20260914 - Julian) 中文抬頭：`filename*` 帶真名，`filename=` 是退路。
   *
   * HTTP header 的值是 ISO-8859-1，中文不能直接放進 `filename="..."` ——
   * 各家瀏覽器的處理不一致（亂碼、或整個忽略）。
   */
  it("非 ASCII 檔名：filename* 帶真名，filename= 換成底線", () => {
    const header = headerOf("測試公司_工資清冊_2026-08.csv");

    expect(header).toContain(
      `filename*=UTF-8''${encodeURIComponent("測試公司_工資清冊_2026-08.csv")}`,
    );
    // Info: (20260914 - Julian) 退路那一份：每個非 ASCII 字元各換成一個底線
    expect(header).toContain('filename="__________2026-08.csv"');
  });

  /**
   * Info: (20260914 - Julian) **檔名是使用者輸入**（公司名稱進了檔名）。
   *
   * 一個 `"` 就能提前關掉 `filename="..."` 並在 header 裡多塞一段；
   * 一個 `\r\n` 在某些環境是換行注入。一律拿掉而不是跳脫 ——
   * 拿掉容易驗證，代價只是檔名少幾個字。
   *
   * 少了這一條，把 `safe` 那一行刪掉不會有任何紅燈。
   */
  it("引號、反斜線、路徑分隔符與控制字元一律拿掉", () => {
    const header = headerOf('a"b\\c/d\r\ne.csv');

    expect(header).toContain('filename="abcde.csv"');
    expect(header).not.toContain("\r");
    expect(header).not.toContain("\n");
  });

  it("整個檔名都是非 ASCII 且被清空時有預設值，不會產生空的 filename=", () => {
    const header = headerOf('"');

    expect(header).toContain('filename="download"');
  });
});

describe("Content-Disposition 的往返", () => {
  /**
   * Info: (20260914 - Julian) 這一組是這個檔案存在的理由。
   *
   * 只驗一端的話，兩端各自「正確」但對不上仍然全綠 ——
   * 那正是 20260914 實際發生的事。
   */
  it.each([
    ["純 ASCII", "salary-records-2026-08.csv"],
    ["中文公司抬頭", "測試股份有限公司_工資清冊_2026-08.csv"],
    ["跨月範圍", "測試股份有限公司_工資清冊_2026-07_2026-09.csv"],
    ["含空白與括號", "測試公司 (台北)_工資清冊_2026-08.csv"],
  ])("%s：送出去什麼，讀回來就是什麼", (_label, filename) => {
    expect(parseContentDispositionFilename(headerOf(filename))).toBe(filename);
  });

  /**
   * Info: (20260914 - Julian) 壞掉的百分號編碼退回 ASCII 那一份，而不是整個下載炸掉。
   *
   * 這不是 `fileOk` 送得出來的形狀（它一律走 `encodeURIComponent`），
   * 但讀的那一端面對的是網路，不是我們的伺服器。
   */
  it("filename* 的編碼壞掉時退回 filename=", () => {
    expect(
      parseContentDispositionFilename(
        `attachment; filename="fallback.csv"; filename*=UTF-8''%E6%B8`,
      ),
    ).toBe("fallback.csv");
  });

  it("只有舊形式時照舊讀得到（既有行為沒有被換掉）", () => {
    expect(
      parseContentDispositionFilename('attachment; filename="legacy.csv"'),
    ).toBe("legacy.csv");
  });

  it("沒有標頭就回 null，讓呼叫端用自己的預設", () => {
    expect(parseContentDispositionFilename(null)).toBeNull();
    expect(parseContentDispositionFilename("attachment")).toBeNull();
  });
});
