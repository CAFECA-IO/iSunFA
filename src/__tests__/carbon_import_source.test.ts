// Info: (20260806 - Tzuhan) 匯入檔案引用(cid 優先、File 退路)的不變式

import {
  appendImportSource,
  type ICarbonImportSource,
} from "@/hooks/use_carbon_chat.helpers";

/**
 * Info: (20260806 - Tzuhan) 只記錄 append 的最小替身。
 * jsdom 的 FormData 不會保留 File 的同一性,而「送出去的是哪一個檔案」正是要斷言的事。
 */
class FormDataSpy {
  public readonly entries: [string, unknown][] = [];

  public append(key: string, value: unknown): void {
    this.entries.push([key, value]);
  }

  public keys(): string[] {
    return this.entries.map(([key]) => key);
  }

  public get(key: string): unknown {
    return this.entries.find(([entryKey]) => entryKey === key)?.[1];
  }
}

const asFormData = (spy: FormDataSpy): FormData => spy as unknown as FormData;

const FAKE_FILE = { name: "report.pdf" } as unknown as File;

describe("appendImportSource", () => {
  it("有 cid 時只送 cid 與宣告的檔名/型別,不夾帶檔案本體", () => {
    const spy = new FormDataSpy();
    const source: ICarbonImportSource = {
      cid: "bafyimportcid",
      fileName: "report.pdf",
      mimeType: "application/pdf",
      file: FAKE_FILE,
    };

    appendImportSource(asFormData(spy), source);

    expect(spy.keys()).toEqual(["cid", "fileName", "mimeType"]);
    expect(spy.get("cid")).toBe("bafyimportcid");
    // Info: (20260806 - Tzuhan) 這一條就是整個改動的目的:14 次呼叫不再各自重送整份 PDF
    expect(spy.keys()).not.toContain("file");
  });

  it("沒有 cid 時退回直傳 File —— 上傳失敗不該讓整份匯入做不了", () => {
    const spy = new FormDataSpy();
    const source: ICarbonImportSource = {
      cid: null,
      fileName: "report.pdf",
      mimeType: "application/pdf",
      file: FAKE_FILE,
    };

    appendImportSource(asFormData(spy), source);

    expect(spy.keys()).toEqual(["file"]);
    expect(spy.get("file")).toBe(FAKE_FILE);
  });

  it("空字串 cid 視為沒有 cid(而非送一個伺服端取不回的 cid)", () => {
    const spy = new FormDataSpy();

    appendImportSource(asFormData(spy), {
      cid: "",
      fileName: "report.pdf",
      mimeType: "application/pdf",
      file: FAKE_FILE,
    });

    expect(spy.keys()).toEqual(["file"]);
  });

  /**
   * Info: (20260806 - Tzuhan) 兩者皆無 = 重載之後只剩 pendingImport、cid 沒存下來。
   * 這時要在發請求前就炸開:送出去只會換到一個 VA_NO_FILE_UPLOADED,
   * 而那個訊息會讓使用者以為是檔案有問題。
   */
  it("cid 與 file 都沒有時立即拋出,不送出註定失敗的請求", () => {
    const spy = new FormDataSpy();

    expect(() =>
      appendImportSource(asFormData(spy), {
        cid: null,
        fileName: "report.pdf",
        mimeType: "application/pdf",
        file: null,
      }),
    ).toThrow("import source has neither cid nor file");
    expect(spy.entries).toHaveLength(0);
  });
});
