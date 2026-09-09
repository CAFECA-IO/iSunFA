// Info: (20260909 - Emily) 重試／接續撞上「cid 被拒」時要說對的那一句(#6783 review 中-1)。

import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import {
  classifyImportRetryFailure,
  shouldDropDeniedImportCid,
  ImportRetryFailureEnum,
  IMPORT_RETRY_FAILURE_TEXT_KEY,
  type ICarbonImportSource,
} from "@/hooks/use_carbon_chat.helpers";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

const DENIED = API_ERRORS.AUTH_PERMISSION_DENIED.code;

/** Info: (20260909 - Emily) 重載之後的形狀:cid 從待匯入紀錄還原,File 是記憶體物件所以沒了 */
const afterReload = (cid: string | null): ICarbonImportSource => ({
  cid,
  fileName: "report.pdf",
  mimeType: "application/pdf",
  file: null,
});

describe("classifyImportRetryFailure:哪一種失敗「稍後再試」沒有用", () => {
  it("cid 被拒 + 本機沒有檔案 → 要使用者重新上傳(這就是上線日的場景)", () => {
    expect(classifyImportRetryFailure(DENIED, afterReload("cid-old"))).toBe(
      ImportRetryFailureEnum.NEEDS_FILE,
    );
  });

  it("cid 被拒但本機還有檔案 → 仍算可重試(丟掉 cid 之後直傳那條路是通的)", () => {
    expect(
      classifyImportRetryFailure(DENIED, {
        ...afterReload("cid-old"),
        file: { name: "report.pdf" } as unknown as File,
      }),
    ).toBe(ImportRetryFailureEnum.RETRYABLE);
  });

  it("兩者都沒有 → 要使用者重新上傳(appendImportSource 會在發請求前就拋)", () => {
    expect(classifyImportRetryFailure(null, afterReload(null))).toBe(
      ImportRetryFailureEnum.NEEDS_FILE,
    );
  });

  it("source 是 null → 要使用者重新上傳", () => {
    expect(classifyImportRetryFailure(null, null)).toBe(
      ImportRetryFailureEnum.NEEDS_FILE,
    );
  });

  it("其他錯誤碼(額度、逾時、伺服器)→ 稍後再試", () => {
    ["TW000012", "IS000011", "IS000001", null].forEach((code) => {
      expect(classifyImportRetryFailure(code, afterReload("cid-live"))).toBe(
        ImportRetryFailureEnum.RETRYABLE,
      );
    });
  });

  it("兩種結論的文案是不同的兩句,而且都存在", () => {
    /*
     * Info: (20260909 - Emily) 分不開就等於沒分:這一條擋的是「兩個 enum 值指到同一個 key」
     * 那種看起來有分類、實際上還是同一句話的修法。
     */
    const needsFile =
      IMPORT_RETRY_FAILURE_TEXT_KEY[ImportRetryFailureEnum.NEEDS_FILE];
    const retryable =
      IMPORT_RETRY_FAILURE_TEXT_KEY[ImportRetryFailureEnum.RETRYABLE];
    expect(needsFile).not.toBe(retryable);
    expect(needsFile).toBe("carbon_chatbot.import_resume_needs_file");
    expect(retryable).toBe("carbon_chatbot.import_failed");
    ["zh_tw", "zh_cn", "en", "ja", "ko"].forEach((locale) => {
      const source = fs.readFileSync(
        path.join(
          process.cwd(),
          `src/i18n/locales/${locale}/carbon_chatbot.ts`,
        ),
        "utf-8",
      );
      expect(source).toContain("import_resume_needs_file:");
      expect(source).toContain("import_failed:");
    });
  });
});

describe("shouldDropDeniedImportCid:失效的 cid 不留著再撞一次", () => {
  it("cid 被拒 → 丟掉(下一次走直傳,或在發請求前就被擋下)", () => {
    expect(shouldDropDeniedImportCid(DENIED, afterReload("cid-old"))).toBe(
      true,
    );
  });

  it("被拒但本來就沒有 cid → 沒有東西可丟", () => {
    expect(shouldDropDeniedImportCid(DENIED, afterReload(null))).toBe(false);
  });

  it("不是被拒 → 不能丟(額度不足那種,cid 還是好的,丟了就得重新上傳)", () => {
    /*
     * Info: (20260909 - Emily) 這一條是這支修正最容易做壞的地方:
     * 「失敗就把 cid 丟掉」會讓點數用完的人在補點數之後被要求重新上傳整份報告,
     * 而 #6714 那條產品流程存在的理由正是不要他重新上傳。
     */
    ["TW000012", "IS000011", null].forEach((code) => {
      expect(shouldDropDeniedImportCid(code, afterReload("cid-old"))).toBe(
        false,
      );
    });
  });
});

describe("hook 接線(源碼掃描;node 環境無法渲染 hook)", () => {
  const hook = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
    "utf-8",
  );

  it("兩處 catch 都走共用出口,而且沒有一處還留著 import_failed 直寫", () => {
    /*
     * Info: (20260909 - Emily) 上界與下界成對(§1.15):
     * 下界 = 兩個 catch 各自呼叫一次;上界 = 這兩條路徑上不得再出現直寫的 import_failed。
     */
    const retryCatch = hook.slice(
      hook.indexOf("retry failed chapters failed"),
      hook.indexOf("setIsRetryingImport(false)"),
    );
    const resumeCatch = hook.slice(
      hook.indexOf("resume paused chapters failed"),
      hook.lastIndexOf("setIsRetryingImport(false)"),
    );
    expect(retryCatch).toMatch(
      /reportImportRetryFailure\(error, originSessionId\)/,
    );
    expect(resumeCatch).toMatch(
      /reportImportRetryFailure\(error, originSessionId\)/,
    );
    expect(retryCatch).not.toContain('t("carbon_chatbot.import_failed")');
    expect(resumeCatch).not.toContain('t("carbon_chatbot.import_failed")');
  });

  it("共用出口把丟掉 cid 之後的紀錄存回去(否則重載又帶著死 cid 回來)", () => {
    const exit = hook.slice(
      hook.indexOf("const reportImportRetryFailure"),
      hook.indexOf("const retryFailedImportChapters"),
    );
    expect(exit).toMatch(/lastImportSourceRef\.current = withoutCid;/);
    expect(exit).toMatch(
      /persistPendingImport\(\s*originSessionId,\s*pending,\s*withoutCid,/,
    );
  });
});
