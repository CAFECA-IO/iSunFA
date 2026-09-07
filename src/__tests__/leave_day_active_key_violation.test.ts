import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { isActiveKeyViolation } from "@/repositories/leave_request.repo";

/**
 * Info: (20260821 - Julian) `LeaveDay.activeKey` 的唯一鍵撞上時要回 409，不是 500
 * （review 第 11 輪 B3）。
 *
 * ## 修掉的缺陷
 *
 * `CF_LEAVE_DAY_ALREADY_ACTIVE` 先前**從未被丟過**：錯誤碼在字典裡、五個語系
 * 的文案備好了、兩支字典形狀測試也蓋著它 —— 唯獨沒有任何一行程式碼會丟它。
 * `approveStep` 的 `catch` 只接 `BalanceRaceError`，其餘原樣往上丟，
 * 於是 route 的 catch-all 把 Prisma 的 P2002 收斂成 `IS_DB_FAILED`（500）。
 *
 * **重現不需要併發**：同一人對同一天送出事假與病假（兩張待簽可以涵蓋同一天，
 * 見 `submit` 的檔頭），核准第一張、再核准第二張。
 *
 * ## 這一檔測的是「分類」，不是整個交易
 *
 * 真正有風險的是**認錯**：那個交易裡不只一個唯一鍵
 * （`LeaveLedgerEntry.idempotencyKey` 也是），把任何 P2002 都翻成
 * 「這一天已經有生效的假單」，會在冪等鍵撞上時對使用者說一件與事實無關的事，
 * 而真正的缺陷被藏起來。
 *
 * 「outcome → 錯誤碼」那一半由 `leave_request_service.test.ts` 蓋，
 * 這裡蓋的是「哪一種 P2002 才算」。
 */

/** Info: (20260821 - Julian) Prisma 在 PostgreSQL 上的 P2002 形狀（欄位名陣列） */
const p2002 = (target: unknown): unknown => ({
  code: "P2002",
  meta: target === undefined ? {} : { target },
});

describe("activeKey 唯一鍵衝突的分類", () => {
  it.each([
    ["欄位名陣列", ["active_key"]],
    ["多欄複合鍵裡含它", ["employee_id", "active_key"]],
    ["約束名字串", "leave_day_active_key_key"],
  ])("認得出來：%s", (_label, target) => {
    expect(isActiveKeyViolation(p2002(target))).toBe(true);
  });

  /**
   * Info: (20260821 - Julian) **反方向才是這一檔的重點。**
   *
   * 同一個交易裡的另一個唯一鍵。認成「那天已經有假單」的話，使用者會去找一張
   * 不存在的假單，而真正的問題（重放或分錄重複）沒有人看得見。
   */
  it("冪等鍵撞上時不算", () => {
    expect(isActiveKeyViolation(p2002(["idempotency_key"]))).toBe(false);
  });

  /**
   * Info: (20260821 - Julian) 認不出來時**不猜**。
   *
   * `meta.target` 缺漏時回 false，讓錯誤照原樣往上（→ 500）。
   * 兩個方向的代價不對稱：誤判成 409 會告訴使用者一個假的衝突並掩蓋 bug；
   * 誤判成 500 只是維持現況，而現況本來就是一個該被看見的 bug。
   */
  it.each([
    ["沒有 meta.target", p2002(undefined)],
    ["target 是 null", { code: "P2002", meta: { target: null } }],
    ["不是 P2002", { code: "P2003", meta: { target: ["active_key"] } }],
    ["根本不是 Prisma 錯誤", new Error("boom")],
    ["null", null],
    ["字串", "P2002"],
  ])("不認得就回 false：%s", (_label, error) => {
    expect(isActiveKeyViolation(error)).toBe(false);
  });

  /**
   * Info: (20260821 - Julian) 而 `approveStep` 的 `catch` 真的接上了它。
   *
   * 上面每一條都只證明「分類函式算得對」。少了這一條，把 `catch` 裡那兩行
   * 刪掉之後所有分類測試照樣綠 —— 而那正是這一輪要修的那種形狀
   * （備好了碼與文案，中間少一段接線）。
   */
  it("approveStep 的 catch 把它轉成 DAY_ALREADY_ACTIVE", () => {
    const repo = readFileSync(
      join(process.cwd(), "src", "repositories", "leave_request.repo.ts"),
      "utf8",
    );

    expect(repo).toMatch(
      /if \(isActiveKeyViolation\(error\)\) \{\s*\n\s*return LeaveApprovalOutcome\.DAY_ALREADY_ACTIVE;/,
    );
  });
});
