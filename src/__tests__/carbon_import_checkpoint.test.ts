import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { foldImportChunks } from "@/hooks/use_carbon_chat.helpers";

/**
 * Info: (20260827 - Luphia) 匯入中斷時的檢查點（issue #6723）。
 *
 * 守的缺陷：成果**只在整段跑完之後才落地**。14 份要跑 7～14 分鐘，這段時間內
 * 關掉分頁、切走頁面、或任何一次非暫停的拋錯，已經扣過點的份全部白費，
 * 下次從第 1 份重扣（單次預扣估算約 677 點，商業方案掉 6 份約 4,000 點）。
 *
 * 「暫停」那條路一直是對的，因為它是**正常結束**——迴圈自己跳出來，後面的落地
 * 照跑，而所有既有測試都只走那一條。這一組專門走其他每一種中斷方式。
 */

type Chunk = Parameters<typeof foldImportChunks>[0][number];

const chunk = (over: Partial<NonNullable<Chunk>> = {}): Chunk => ({
  segments: [],
  unmapped: [],
  ...over,
});

describe("foldImportChunks：中途與最後共用同一支摺疊", () => {
  it("同一段落的多份內容依序接起來", () => {
    const folded = foldImportChunks([
      chunk({
        segments: [{ paragraphId: "s1", title: "節一", content: "前半" }],
      }),
      chunk({
        segments: [{ paragraphId: "s1", title: "節一", content: "後半" }],
      }),
    ]);
    expect(folded.segments).toHaveLength(1);
    expect(folded.segments[0].content).toBe("前半\n\n後半");
  });

  /**
   * Info: (20260827 - Luphia) 這一條守的是 20260817 那個缺陷的行為面：
   * 活動數據要**累加**。排放章會被切成兩份，賦值會讓後回來的那份整批蓋掉
   * 前一份——現場只看到一個偏低的數字，沒有任何跡象顯示發生過覆蓋。
   */
  it("活動數據累加，不是後蓋前", () => {
    const folded = foldImportChunks([
      chunk({
        activities: [{ id: "a1" }, { id: "a2" }] as never,
      }),
      chunk({ activities: [{ id: "a3" }] as never }),
    ]);
    expect(folded.activities).toHaveLength(3);
  });

  it("同表號的表格只留一張", () => {
    const table = { tableNo: "T1" } as never;
    const folded = foldImportChunks([
      chunk({
        segments: [
          {
            paragraphId: "s1",
            title: "節一",
            content: "a",
            sourceTables: [table],
          },
        ],
      }),
      chunk({
        segments: [
          {
            paragraphId: "s1",
            title: "節一",
            content: "b",
            sourceTables: [table],
          },
        ],
      }),
    ]);
    expect(folded.segments[0].sourceTables).toHaveLength(1);
  });

  // Info: (20260827 - Luphia) 還沒回來的份是 null；摺疊要當它不存在而不是炸掉
  it("尚未完成的份（null）直接略過", () => {
    const folded = foldImportChunks([
      null,
      chunk({ segments: [{ paragraphId: "s1", title: "節一", content: "x" }] }),
      null,
    ]);
    expect(folded.segments).toHaveLength(1);
    expect(folded.unmapped).toEqual([]);
  });

  // Info: (20260827 - Luphia) 一份都沒回來時要是空的，不是 undefined
  it("全部都還沒回來時回空集合", () => {
    const folded = foldImportChunks([null, null]);
    expect(folded).toEqual({ segments: [], unmapped: [], activities: [] });
  });
});

describe("檢查點的接線", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );

  /**
   * Info: (20260827 - Luphia) 落地要在 finally：失敗與暫停同樣改變了「還剩哪些」。
   * 只在成功時存會讓剩餘清單落後於事實。
   */
  it("每一份結算後都回報檢查點（在 finally 裡）", () => {
    const start = hook.indexOf("const runUnit = async (unit: IImportUnit");
    expect(start).toBeGreaterThan(-1);
    const end = hook.indexOf("const outcome = await runResumableJob", start);
    expect(end).toBeGreaterThan(start);
    const scope = hook.slice(start, end);
    expect(scope).toContain("} finally {");
    expect(scope).toContain("onCheckpoint?.(buildCheckpoint());");
  });

  /**
   * Info: (20260827 - Luphia) 剩餘以「有沒有結果」算，與驅動器同一個判準。
   * 用索引游標算會在併發下算錯（併發度 2，另一條可能跑在更前面的索引）。
   */
  it("剩餘以「有沒有結果」判斷，不是索引游標", () => {
    const start = hook.indexOf("const buildCheckpoint = ()");
    expect(start).toBeGreaterThan(-1);
    const scope = hook.slice(start, start + 900);
    expect(scope).toContain("results[index] === null");
    expect(scope).not.toContain("index >");
    expect(scope).not.toContain("slice(");
  });

  it("主匯入路徑把檢查點傳進去", () => {
    const start = hook.indexOf("const result = await runImportChapters(");
    expect(start).toBeGreaterThan(-1);
    const scope = hook.slice(start, start + 400);
    expect(scope).toContain("persistCheckpoint,");
  });

  /**
   * Info: (20260827 - Luphia) 檢查點要同時寫兩邊：內容（加密暫存）撐過中斷，
   * 書籤（伺服器計數）讓「已完成 N／剩餘 M」跨裝置看得到。少任何一邊，
   * 中斷之後就會有一半的事實不見。
   */
  it("檢查點同時寫內容與書籤", () => {
    const start = hook.indexOf("const persistCheckpoint = (");
    expect(start).toBeGreaterThan(-1);
    const end = hook.indexOf("if (useChunked) {", start);
    const scope = hook.slice(start, end);
    expect(scope).toContain("persistPendingImport(");
    expect(scope).toContain("saveImportJobBookmark(");
  });

  /**
   * Info: (20260827 - Luphia) 中斷不是暫停：`pauseReason` 必須是 null，
   * 否則書籤會寫成 PAUSED，掃描行程會把一個「沒有人在等額度」的任務
   * 翻成「可以繼續」，而畫面會說「點數已用完」——三句話都不是事實。
   */
  it("檢查點的 pauseReason 是 null（狀態才會是 RUNNING）", () => {
    const start = hook.indexOf("const persistCheckpoint = (");
    const end = hook.indexOf("if (useChunked) {", start);
    const scope = hook.slice(start, end);
    expect(scope).toContain("pauseReason: null,");
    expect(scope).not.toContain("JOB_PAUSE_REASON");
  });

  /**
   * Info: (20260901 - Luphia) 書籤 PUT 走 per-channel 佇列（review #6726 中-1）。
   *
   * 驅動器 `concurrency = 2`，檢查點在每一份的 `finally` 寫書籤（RUNNING），
   * 暫停收尾另外寫一次（PAUSED）——沒有佇列時是兩個沒有排序保證的 PUT。
   * 檢查點那筆後到的話，書籤停在 RUNNING：`scanResumableJobs` 只掃 PAUSED，
   * 這一筆**永遠翻不成 RESUMABLE**，「額度回來自動翻牌」對它失效，且租約
   * 未過期前使用者自己按「接著匯入」只會拿到 BUSY。
   *
   * 佇列讓呼叫順序＝落地順序：收尾在迴圈結束後才呼叫，必然排在所有
   * 檢查點之後。這裡守的是「書籤的送出真的接在佇列尾端」。
   */
  it("書籤 PUT 走 per-channel 佇列（收尾的 PAUSED 一定最後落地）", () => {
    const start = hook.indexOf("const saveImportJobBookmark = useCallback");
    expect(start).toBeGreaterThan(-1);
    const end = hook.indexOf("const claimImportJob = useCallback", start);
    const scope = hook.slice(start, end);
    expect(scope).toContain(
      "bookmarkQueueRef.current.get(chatChannel) ?? Promise.resolve()",
    );
    expect(scope).toContain("const task = previous.then(run);");
    expect(scope).toContain("bookmarkQueueRef.current.set(chatChannel, task);");
    // Info: (20260901 - Luphia) 真的送出的那次 request 必須在 run 裡（被佇列包住）
    expect(
      scope.indexOf('request("/api/v1/user/job/bookmark"'),
    ).toBeGreaterThan(scope.indexOf("const run = async ()"));
  });

  /**
   * Info: (20260827 - Luphia) 檢查點**不動畫面狀態**：預覽在匯入還在跑的時候
   * 跳出來，會讓人以為做完了。
   */
  it("檢查點不呼叫 setPendingImportFor", () => {
    const start = hook.indexOf("const persistCheckpoint = (");
    const end = hook.indexOf("if (useChunked) {", start);
    expect(hook.slice(start, end)).not.toContain("setPendingImportFor");
  });

  /**
   * Info: (20260827 - Luphia) `hasExisting` 要算得出來，所以 existingIds 必須
   * 在迴圈之前就備好。算不出來時的猜測方向是「沒有既有內容」，
   * 而那會讓套用時少一次覆蓋提醒。
   */
  it("existingIds 提到迴圈之前（檢查點也要算 hasExisting）", () => {
    const existing = hook.indexOf("const existingIds = new Set(");
    const loop = hook.indexOf("if (useChunked) {");
    expect(existing).toBeGreaterThan(-1);
    expect(existing).toBeLessThan(loop);
    // Info: (20260827 - Luphia) 只能有一份：兩份會在迴圈前後給出不同答案
    expect(hook.indexOf("const existingIds = new Set(", existing + 1)).toBe(-1);
  });
});

describe("中斷與點數用完是兩句話", () => {
  const preview = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "carbon_chatbot",
      "import_preview.tsx",
    ),
    "utf8",
  );

  it("有暫停原因才說「點數已用完」", () => {
    expect(preview).toContain("pendingImport.pauseReason");
    expect(preview).toContain("carbon_chatbot.import_paused_chapters");
    expect(preview).toContain("carbon_chatbot.import_interrupted_chapters");
  });

  it.each(["zh_tw", "zh_cn", "en", "ja", "ko"])("%s 有中斷的文案", (locale) => {
    const file = readFileSync(
      join(
        process.cwd(),
        "src",
        "i18n",
        "locales",
        locale,
        "carbon_chatbot.ts",
      ),
      "utf8",
    );
    expect(file).toContain("import_interrupted_chapters:");
    // Info: (20260827 - Luphia) 中斷的文案不可以提點數用完——那是另一件事
    const start = file.indexOf("import_interrupted_chapters:");
    const scope = file.slice(start, start + 400);
    expect(scope).not.toMatch(/點數已用完|点数已用完|run out of credits/);
  });
});

/**
 * Info: (20260827 - Luphia) 匯入中離開頁面要先問一聲（issue #6723）。
 *
 * 檢查點讓做完的份撐得過中斷，但正在跑的那一份還是會重跑（那次的點數收不回來），
 * 而原始檔案只在記憶體裡——回來還得重新上傳。做法與 `team/allocation_modal.tsx`
 * 同一套：只在跑的時候掛、跑完卸下。
 */
describe("匯入中離開頁面的提示", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );

  it("掛上 beforeunload，且兩種瀏覽器慣例都設", () => {
    expect(hook).toMatch(/addEventListener\("beforeunload"/);
    expect(hook).toMatch(/event\.preventDefault\(\)/);
    expect(hook).toMatch(/event\.returnValue/);
  });

  /**
   * Info: (20260827 - Luphia) 少了卸下，使用者在這一頁的任何離開都會被問一次
   * ——那種提示很快就會被無視，等於把保護自己弄壞。
   */
  it("跑完會卸下監聽，不常駐", () => {
    expect(hook).toMatch(/removeEventListener\("beforeunload"/);
    expect(hook).toContain("if (!importRunning) return undefined;");
  });

  /**
   * Info: (20260827 - Luphia) ref 與 state 必須同進同退。只更新一邊的症狀是
   * 「提示常駐」或「提示不出現」，而兩者都不會有任何錯誤訊息。
   */
  it("ref 與可渲染狀態成對更新", () => {
    const enter = (
      hook.match(/importInFlightRef\.current = file\.name;/g) ?? []
    ).length;
    const enterState = (hook.match(/setImportRunning\(true\);/g) ?? []).length;
    const leave = (hook.match(/importInFlightRef\.current = null;/g) ?? [])
      .length;
    const leaveState = (hook.match(/setImportRunning\(false\);/g) ?? []).length;
    expect(enterState).toBe(enter);
    expect(leaveState).toBe(leave);
  });
});
