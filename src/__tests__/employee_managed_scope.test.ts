import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

/**
 * Info: (20260820 - Julian) 管轄範圍的判準（M11 / review 第 6 輪）。
 *
 * ## 這一支先前一條測試都沒有
 *
 * `grep managesEmployee src/__tests__` 全部命中的是**替身與 spy** ——
 * 每一個服務層測試都把它 mock 掉，於是真正的那一支（部門子樹走訪 ＋
 * 「不含自己」）從來沒有被跑過。而它是四個授權閘共同的輸入：
 * 假單可見範圍、加班決行、銷假徵詢、改班。
 *
 * ## 「不含自己」是兩個服務**默默依賴**的行為
 *
 * `leave.service` 的銷假徵詢與 `attendance_schedule.service` 的改班
 * 都沒有自己的自我檢查 —— 它們靠這一支回 false 才擋得住
 * 「主管對自己發起銷假徵詽」與「主管改自己的班」。
 * `error_dictionary.ts:1861` 甚至把後者寫成了一個對外承諾。
 * 一條被兩個服務依賴、還被寫進錯誤字典的行為，不能沒有測試。
 *
 * ## 為什麼替身停在 prisma 那一層
 *
 * 被測的就是「部門子樹怎麼走」與「哪些情形回 false」。假 repository 會把
 * 那段邏輯整個換掉，於是問題從測試裡消失（checklist §1.7）。
 */

/**
 * Info: (20260820 - Julian) 兩個替身列都帶索引簽章。
 *
 * 下面的 `matches()` 是照 `where` 的鍵去查列，因此它收的是
 * `Record<string, unknown>` —— 而**沒有索引簽章的 interface 不可指派給它**
 * （TS2345）。加索引簽章而不是在呼叫點 `as` 轉型：轉型會把「這個鍵真的存在嗎」
 * 這個問題關掉，而替身寫錯鍵名的症狀是「查不到 → 回 false」，
 * 與被測邏輯真的擋下來長得一模一樣。
 *
 * 具名欄位仍然逐一列出（索引簽章只是額外允許以字串取用），
 * 因此打錯 `parentId` 這種事還是編譯期就會紅。
 */
interface IDepartmentRow {
  [key: string]: string | null;
  id: string;
  parentId: string | null;
  managerId: string | null;
  accountBookId: string;
}

interface IEmployeeRow {
  [key: string]: string | null;
  id: string;
  departmentId: string | null;
  accountBookId: string;
}

const BOOK = "book-1";

/**
 * Info: (20260820 - Julian) 工程處（根）→ 兩個工務段，各一位主管。
 * 兩段刻意是兄弟而不是上下級 —— 跨部門放行的缺口只有在兄弟關係上看得見。
 */
const departments: IDepartmentRow[] = [
  {
    id: "DEP-000",
    parentId: null,
    managerId: "emp-chief",
    accountBookId: BOOK,
  },
  {
    id: "DEP-001",
    parentId: "DEP-000",
    managerId: "emp-mgr1",
    accountBookId: BOOK,
  },
  {
    id: "DEP-005",
    parentId: "DEP-000",
    managerId: "emp-mgr5",
    accountBookId: BOOK,
  },
];

const employees: IEmployeeRow[] = [
  { id: "emp-chief", departmentId: "DEP-000", accountBookId: BOOK },
  { id: "emp-mgr1", departmentId: "DEP-001", accountBookId: BOOK },
  { id: "emp-mgr5", departmentId: "DEP-005", accountBookId: BOOK },
  { id: "emp-a", departmentId: "DEP-001", accountBookId: BOOK },
  { id: "emp-b", departmentId: "DEP-005", accountBookId: BOOK },
  // Info: (20260820 - Julian) 部門被刪之後的殘留（`Employee.departmentId` 是 SetNull）
  { id: "emp-orphan", departmentId: null, accountBookId: BOOK },
  { id: "emp-other-book", departmentId: "DEP-001", accountBookId: "book-2" },
];

/**
 * Info: (20260820 - Julian) 只支援被測程式**真的用到的**運算子：等值、
 * `{ in: [...] }`、`{ not: x }`。
 *
 * 刻意不做成通用的 Prisma where 解譯器 —— 一個「幾乎完整」的替身會讓人
 * 以為沒被測到的條件也被測到了，而這裡少任何一種，被測程式會當場算錯，
 * 不會安靜地跳過（同 T6 那支替身的既有處置）。
 */
const matchesValue = (actual: unknown, expected: unknown): boolean => {
  if (expected !== null && typeof expected === "object") {
    const clause = expected as { in?: unknown[]; not?: unknown };
    if (Array.isArray(clause.in)) return clause.in.includes(actual);
    if ("not" in clause) return actual !== clause.not;
    throw new Error(`替身不支援這個條件：${JSON.stringify(expected)}`);
  }
  return actual === expected;
};

const matches = (
  row: Record<string, unknown>,
  where: Record<string, unknown>,
): boolean =>
  Object.entries(where).every(([key, value]) => matchesValue(row[key], value));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      findFirst: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          departments.find((row) => matches(row, where)) ?? null,
      ),
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        departments.filter((row) => matches(row, where)),
      ),
    },
    employee: {
      findFirst: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          employees.find((row) => matches(row, where)) ?? null,
      ),
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        employees.filter((row) => matches(row, where)),
      ),
    },
  },
}));

import { employeeRepo } from "@/repositories/employee.repo";

const manages = (managerEmployeeId: string, targetEmployeeId: string) =>
  employeeRepo.managesEmployee({
    accountBookId: BOOK,
    managerEmployeeId,
    targetEmployeeId,
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("managesEmployee —— 管轄範圍是部門子樹", () => {
  it("直屬部門裡的人：管得到", async () => {
    expect(await manages("emp-mgr1", "emp-a")).toBe(true);
  });

  /**
   * Info: (20260820 - Julian) 子樹而不是直屬部門：工程處長掛在根，
   * 他的下屬分散在各工務段。只比對直屬部門會讓他管不到任何人。
   */
  it("子部門裡的人：上層主管也管得到", async () => {
    expect(await manages("emp-chief", "emp-a")).toBe(true);
    expect(await manages("emp-chief", "emp-b")).toBe(true);
  });

  /**
   * Info: (20260820 - Julian) **兄弟部門擋得住** —— 這是
   * 「授權走 `managesEmployee` 而不是 `isDepartmentManager`」的全部理由：
   * 後者只答「你是不是某個部門的主管」，第一工務段的主管會因此
   * 簽得動第五工務段的人（接線守則 §3.5.3）。
   */
  it("兄弟部門裡的人：管不到", async () => {
    expect(await manages("emp-mgr1", "emp-b")).toBe(false);
    expect(await manages("emp-mgr5", "emp-a")).toBe(false);
  });

  it("不是任何部門主管的人：管不到任何人", async () => {
    expect(await manages("emp-a", "emp-b")).toBe(false);
  });

  /**
   * Info: (20260820 - Julian) **含自己**（review 第 6 輪 M11）。
   *
   * 這一條原本斷言 false，因為 `managesEmployee` 裡有一行
   * `manager === target → false`。那一行是職責分離（ADR 023 §5），
   * 是政策不是事實，而 `coding_guidelines §1.1` 把政策列為 Repository 的反例。
   *
   * 政策已經搬到四個呼叫端各自的第一行（`leave.service` 的銷假徵詢、
   * `attendance_schedule.service` 的改班、`assertMayDecide`、
   * 兩支 `assertMayView*` 的自己一律放行）。這一支現在只回答組織圖：
   * 主管的部門當然在他自己的子樹裡。
   *
   * ⚠️ 改回 false 之前先確認那四支還在 —— 這條斷言是它們的對立面，
   * 兩邊同時鬆掉才會出事。
   */
  it("管自己：回 true（這是組織圖的事實，政策在呼叫端）", async () => {
    expect(await manages("emp-mgr1", "emp-mgr1")).toBe(true);
    expect(await manages("emp-chief", "emp-chief")).toBe(true);
  });

  /**
   * Info: (20260820 - Julian) 沒有部門的員工不屬於任何人的範圍。
   *
   * 回 false 而不是 true：`Employee.departmentId` 是 `onDelete: SetNull`，
   * 刪一個部門會讓底下的人全部變成 null —— 放行的話，
   * 刪部門這個動作會讓所有主管突然管得到那些人。
   */
  it("沒有部門的員工：任何主管都管不到", async () => {
    expect(await manages("emp-chief", "emp-orphan")).toBe(false);
    expect(await manages("emp-mgr1", "emp-orphan")).toBe(false);
  });

  // Info: (20260820 - Julian) 跨帳本：同一個部門 id 也不能穿過帳本邊界
  it("別的帳本的員工：管不到", async () => {
    expect(await manages("emp-mgr1", "emp-other-book")).toBe(false);
  });
});

describe("listManagedEmployeeIds —— 複數版與單數版必須一致", () => {
  const listOf = (managerEmployeeId: string) =>
    employeeRepo.listManagedEmployeeIds({
      accountBookId: BOOK,
      managerEmployeeId,
    });

  /**
   * Info: (20260820 - Julian) **含自己**（review 第 6 輪 M11）。
   *
   * 這兩條原本斷言「不含自己」，因為查詢帶著
   * `id: { not: managerEmployeeId }` —— 一條職責分離的政策寫在 Repository
   * 的 where 裡。政策搬到 `OvertimeRequestService.listPending`，
   * 待簽清單看起來完全一樣，而 `overtime_request_service.test.ts`
   * 的「待簽清單排除自己」那一組釘住的就是搬過去的那一步。
   */
  it("段主管拿得到自己段裡的人（含自己）", async () => {
    expect((await listOf("emp-mgr1")).sort()).toEqual(
      ["emp-a", "emp-mgr1"].sort(),
    );
  });

  it("處長拿得到整棵子樹（含自己）", async () => {
    expect((await listOf("emp-chief")).sort()).toEqual(
      ["emp-a", "emp-b", "emp-chief", "emp-mgr1", "emp-mgr5"].sort(),
    );
  });

  /**
   * Info: (20260820 - Julian) 兩支必須給同一個答案。
   *
   * 它們是兩份程式碼（一次一個 vs 先有範圍再取清單），而
   * `employee.repo` 的註解自己寫著「兩支要一起改」。分岔的症狀是
   * 「待簽清單上看得到那張單，按下去說你不是簽核者」——
   * 只測其中一支的話，那個矛盾不會有任何測試變紅。
   */
  it.each([["emp-chief"], ["emp-mgr1"], ["emp-mgr5"], ["emp-a"]])(
    "%s：清單裡的人恰好是單數版回 true 的那些",
    async (manager) => {
      const listed = new Set(await listOf(manager));
      const bySingular = new Set<string>();
      for (const employee of employees) {
        if (employee.accountBookId !== BOOK) continue;
        if (await manages(manager, employee.id)) bySingular.add(employee.id);
      }
      expect([...listed].sort()).toEqual([...bySingular].sort());
    },
  );
});
