import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { HrPiiTable } from "@/constants/hr_pii";

/**
 * Info: (20260819 - Julian) `HrPiiTable` 名單上的每一張表，其 `id` **不得帶 `@default`**。
 *
 * ## 為什麼
 *
 * PII 的 AAD 是 `${table}:${recordId}:${field}:${keyVersion}`
 * （`src/lib/hr_pii_crypto.ts`）。`recordId` 是 id，因此加密**必須發生在**
 * id 已經確定之後 —— 應用層先 `randomUUID()`、拿它去加密、再與密文一起寫入。
 *
 * 留著 `@default(uuid())` 的話，任何**不走 service** 的插入路徑
 * （seed、資料遷移、金鑰輪替、未來的端點）都可能先加密再讓資料庫另發一個 id，
 * 寫出一列 AAD 與 id 不符的密文。
 *
 * 那筆資料**寫得進去**。讀的時候驗章失敗並拋 `HrPiiDecryptError`，
 * 表現與「密文損毀」完全相同 —— 而它的明文只存在於那一列裡，**無法重建**。
 * `deploy_checklist_attendance_2026q3.md` §3 的標題就是
 * 「不要『順手』加上 `@default(uuid())`」。
 *
 * ## 為什麼要一支測試，而不是只寫在註解裡
 *
 * `AttendancePunch` 從第一天就沒有 default，而且 schema 裡有一行註解說明理由。
 * 三個月後 `LeaveRequest` 加進 `HrPiiTable` 時，**還是帶著 default**
 * —— 它的 `reasonCipher` 上方甚至寫著「本表的 id 必須由應用層 `randomUUID()`
 * 產生，不可依賴 `@default(uuid())`」（review B11）。
 *
 * 註解寫在對的地方、說了對的話，然後同一個檔案的十行之外做了相反的事。
 * 那不是粗心，是**慣例沒有執行者**：唯一擋得住它的是一支會紅的測試。
 *
 * 掃描時實測 `HrPiiTable` 六張表裡有**五張**帶著 default
 * （只有 `AttendancePunch` 是對的）—— 也就是說這個缺陷從來不是 `LeaveRequest`
 * 一張表的事，只是那一張剛好是第一個真的走 `encryptPii` 的。
 */

const SCHEMA_PATH = join(process.cwd(), "prisma", "schema.prisma");

/** Info: (20260819 - Julian) 取某個 model 的區塊。`model X {` 到最近的行首 `}` */
const modelBlockOf = (schema: string, model: string): string => {
  const header = new RegExp(`^model ${model} \\{$`, "m");
  const start = schema.search(header);
  if (start === -1) throw new Error(`schema 裡找不到 model ${model}`);
  const end = schema.indexOf("\n}", start);
  if (end === -1) throw new Error(`model ${model} 的區塊沒有結尾`);
  return schema.slice(start, end);
};

const idLineOf = (block: string): string => {
  const line = block
    .split("\n")
    .find((row) => /^\s+id\s+\S+\s+.*@id\b/.test(row));
  if (line === undefined)
    throw new Error(`區塊裡找不到 @id 那一行：\n${block.slice(0, 200)}`);
  return line.trim();
};

const schema = readFileSync(SCHEMA_PATH, "utf8");
const TABLES = Object.values(HrPiiTable);

describe("PII 表的 id 不得由資料庫代發", () => {
  /**
   * Info: (20260819 - Julian) 掃描根的自我檢查。
   *
   * 一支掃到零張表的測試永遠是綠的，而它綠的時候看起來與真的守住了一模一樣
   * （同 `leave_policy_no_code_branching.test.ts` 的第一條）。
   */
  it("HrPiiTable 有內容，且每一張都在 schema 裡找得到", () => {
    expect(TABLES.length).toBeGreaterThanOrEqual(6);
    for (const table of TABLES) {
      expect(() => modelBlockOf(schema, table)).not.toThrow();
    }
  });

  it.each(TABLES)("%s.id 沒有 @default", (table) => {
    const line = idLineOf(modelBlockOf(schema, table));
    expect(line).toContain("@id");
    // Info: (20260819 - Julian) 訊息帶上整行 —— 紅的時候要看得出它現在長什麼樣
    expect(`${table}: ${line}`).not.toMatch(/@default/);
  });

  /**
   * Info: (20260819 - Julian) 反面：**不在**名單上的表**應該**帶 default。
   *
   * 沒有這一條的話，一個「把全庫的 `@default(uuid())` 都拿掉」的過度反應
   * 會通過上面每一條，而那會讓每一支 `create` 都得自己產 id ——
   * 一個沒有必要的負擔，且漏掉一處就是執行期錯誤。
   *
   * 這條同時說明了那個 default **本身沒有錯**，錯的是把它用在 AAD 綁定的表上。
   */
  it.each(["LeaveDay", "LeaveGrant", "OvertimeRequest"])(
    "%s 不在 PII 名單上，仍然可以用 @default",
    (table) => {
      expect(TABLES).not.toContain(table);
      expect(idLineOf(modelBlockOf(schema, table))).toContain("@default");
    },
  );

  /**
   * Info: (20260819 - Julian) 掃描器自己要被驗一次。
   *
   * 上面那幾條若因為 `idLineOf` 抓錯行而永遠取到一行沒有 `@default` 的東西，
   * 它們會全綠而什麼也沒守到。這裡餵它兩段假的 schema，要求它兩種都答對。
   */
  it("掃描器抓得到 default，也認得出沒有 default", () => {
    const withDefault = `model Probe {\n  id String @id @default(uuid())\n  name String\n}\n`;
    const without = `model Probe {\n  id String @id\n  name String\n}\n`;
    expect(idLineOf(modelBlockOf(withDefault, "Probe"))).toContain("@default");
    expect(idLineOf(modelBlockOf(without, "Probe"))).not.toContain("@default");
  });
});
