import { describe, it, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

/**
 * Info: (20260831 - Julian) 讀 `prisma/schema.prisma` 原文，釘住薪資兩張表的關鍵宣告。
 *
 * ## 為什麼是掃描型測試
 *
 * `code_review_checklist §1.12` 把「掃描原始碼的測試」列為要避免的形式，
 * 但同一條規則寫著唯一的例外就是這件事：**本專案沒有 `prisma/migrations/`**，
 * schema 以 `prisma db push` 套用，因此欄位預設值沒有任何版本化的紀錄。
 * 有人把 `@default(0)` 拿掉、或把 `BigInt` 改回 `Int`，
 * 在 code review 之外沒有第二個地方會叫。
 *
 * 這裡只釘「改了就是行為改變」的宣告，不釘欄位順序或註解。
 */

const SCHEMA = fs.readFileSync(
  path.join(process.cwd(), "prisma", "schema.prisma"),
  "utf-8",
);

/**
 * Info: (20260831 - Julian) 取出單一 model 的區塊並**去掉註解**。
 *
 * 去註解是必要的，不是潔癖：這兩個 model 的註解裡會出現被否定的宣告
 * （例如 activeNumber 的說明就寫著「沒有這一欄的話 `@@unique([accountBookId, number])` 會…」），
 * 而 `not.toContain` 會把那段散文當成宣告。
 */
const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const modelBlock = (name: string): string => {
  const start = SCHEMA.indexOf(`model ${name} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = SCHEMA.indexOf("\n}", start);
  expect(end).toBeGreaterThan(start);
  return stripComments(SCHEMA.slice(start, end));
};

describe("SalaryCalculatorEmployee", () => {
  const block = modelBlock("SalaryCalculatorEmployee");

  it("金額是 BigInt 不是 Int：財務金額禁用原生整數型別（precision guideline §1）", () => {
    expect(block).toContain('baseSalary    BigInt @map("base_salary")');
    expect(block).toContain("mealAllowance BigInt");
  });

  it("伙食費預設 0：沒有這個預設，未填伙食費的新增會直接失敗", () => {
    expect(block).toMatch(/mealAllowance BigInt\s+@default\(0\)/);
  });

  it("本薪沒有預設值：薪資不該有一個「反正給個 0」的靜默結果", () => {
    expect(block).not.toMatch(/baseSalary\s+BigInt\s+@default/);
  });

  it("有 deletedAt：這張表刻意用 soft delete，薪資紀錄不能因為刪員工而變孤兒", () => {
    expect(block).toContain('deletedAt DateTime? @map("deleted_at")');
  });

  it("存活員工的唯一性掛在 activeNumber 上，不是 number", () => {
    expect(block).toContain("@@unique([accountBookId, activeNumber])");
    expect(block).not.toContain("@@unique([accountBookId, number])");
  });

  it("activeNumber 可空：Postgres 的唯一索引不約束 NULL，被刪的列才不會互相打架", () => {
    expect(block).toContain('activeNumber String? @map("active_number")');
  });

  it("員工編號必填、Email 可空 —— 身分是編號不是信箱", () => {
    expect(block).toContain('number String @map("employee_number")');
    expect(block).toContain('email String? @map("email")');
  });

  it("掛在帳本之下，且有帳本索引", () => {
    expect(block).toContain(
      'accountBookId String      @map("account_book_id")',
    );
    expect(block).toContain("@@index([accountBookId])");
  });

  it("與 HR 員工檔的接點是可空的，且正式員工檔被刪時只斷開不連坐", () => {
    expect(block).toMatch(
      /employeeId String\?\s+@unique @map\("employee_id"\)/,
    );
    expect(block).toContain("onDelete: SetNull");
  });
});

describe("SalaryRecord", () => {
  const block = modelBlock("SalaryRecord");

  it("(帳本, 員工, 年, 月) 唯一：這是「重存即覆寫」唯一的落地點", () => {
    expect(block).toContain(
      "@@unique([accountBookId, employeeId, year, month])",
    );
  });

  it("抽出來對帳的三個金額都是 BigInt", () => {
    expect(block).toContain('totalPayment       BigInt @map("total_payment")');
    expect(block).toContain(
      'totalSalaryTaxable BigInt @map("total_salary_taxable")',
    );
    expect(block).toContain(
      'totalEmployerCost  BigInt @map("total_employer_cost")',
    );
  });

  it("兩個快照是 Json，且沒有預設值：沒有快照的薪資紀錄沒有意義", () => {
    expect(block).toContain('inputSnapshot  Json @map("input_snapshot")');
    expect(block).toContain('resultSnapshot Json @map("result_snapshot")');
    expect(block).not.toMatch(/Snapshot\s+Json\s+@default/);
  });

  it("記得下這筆紀錄是誰存的、用哪一版引擎算的", () => {
    expect(block).toContain(
      'createdByUserId String @map("created_by_user_id")',
    );
    expect(block).toContain(
      'calculatorVersion String @map("calculator_version")',
    );
  });

  it("不做 soft delete：刪掉就是刪掉，改動軌跡走 AuditLog", () => {
    expect(block).not.toContain("deletedAt");
  });

  /**
   * Info: (20260901 - Julian) 這一條守的是**員工那張表的軟刪除設計**，不是這張表自己的。
   *
   * `SalaryCalculatorEmployee` 用 `deletedAt` 軟刪，理由寫在它那一段的
   * 「薪資紀錄不能因為刪員工而變孤兒」。但軟刪只是**應用層**的約定 ——
   * 只要這條關聯掛上 `onDelete: Cascade`，任何一次繞過應用層的硬刪
   * （手動 SQL、資料修補腳本、日後有人加一支真刪的 API）都會把那個人
   * 名下所有薪資紀錄一起帶走，而薪資單是對外憑據。
   *
   * 預設就是 `Restrict`，所以這裡問的是「有沒有人手動加上去」。
   * 實測：在 `employee` 那一行補上 `onDelete: Cascade` → 這支測試原本全綠，
   * 補了這一條之後才會紅。這是這支掃描測試唯一問得到卻沒問的那一格。
   */
  it("員工關聯不得 Cascade：硬刪員工列不能連坐刪掉薪資紀錄", () => {
    expect(block).not.toContain("onDelete: Cascade");
  });

  it("列表的主要查詢條件有索引", () => {
    expect(block).toContain("@@index([accountBookId, year, month])");
  });
});
