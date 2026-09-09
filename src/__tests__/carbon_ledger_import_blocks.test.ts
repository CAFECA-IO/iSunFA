import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import { parseTable38 } from "@/lib/carbon_table38.parser";
import { reconcileTable38 } from "@/lib/carbon_table38.reconciliation";
import { toLedgerEntries } from "@/lib/carbon_table38.ledger";
import {
  boundLedgerImportBlocks,
  boundLedgerImportReason,
  LEDGER_IMPORT_BLOCK_REASON_SEPARATOR,
  LEDGER_IMPORT_BLOCK_UNKNOWN_REASON,
} from "@/lib/carbon_ledger_import_blocks";
import {
  LEDGER_FACT_VALUE_MAX_LENGTH,
  LEDGER_IMPORT_BLOCK_REASON_MAX_LENGTH,
  LEDGER_IMPORT_BLOCKS_MAX,
} from "@/constants/carbon_chatbot";
import { CARBON_REPORT_OUTLINE } from "@/constants/carbon_report_outline";
import {
  CarbonInventoryStateSchema,
  CarbonLedgerFactSchema,
} from "@/validators";
import { queryAnomalies } from "@/lib/carbon_ledger_query";
import type { ILedgerImportBlock } from "@/types/carbon_chatbot.types";

/**
 * Info: (20260909 - Emily) 勾稽阻擋紀錄的儲存界(#6760)。
 *
 * 這一組守的不是「上界是 500」這個數字,而是一個**順序**:
 * 寫入端能產出的每一筆紀錄,經過唯一寫入者的收界之後,儲存端 schema 一定收、
 * 事實包 schema 一定收。上界的數字可以改,順序不能反 —— 反了就是
 * 「存得進去、載不回來、整份盤查狀態被丟棄」(PR #6725 review 阻-2 的形狀)。
 *
 * 「寫入端能產出的」不是猜的:直接餵真實版面給真實的解析器與勾稽器,
 * 把每個數字都改掉讓每一層都失敗,拿它回的 `blockedReason` 來測。
 */
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf-8");

/**
 * Info: (20260909 - Emily) 從 `carbon_table38.test.ts` 借四份真實版面(它們是那支測試的模組常數,沒有匿出)。
 * 借原文而不是複製一份:版面一改,這裡量的還是同一份東西。
 */
const TABLE_38_SOURCE = read("src/__tests__/carbon_table38.test.ts");
const fixture = (name: string): string => {
  const open = `const ${name} = \``;
  const start = TABLE_38_SOURCE.indexOf(open);
  expect(start).toBeGreaterThan(-1);
  const bodyStart = start + open.length;
  const end = TABLE_38_SOURCE.indexOf("`;", bodyStart);
  return TABLE_38_SOURCE.slice(bodyStart, end);
};
const LAYOUTS = [
  "TABLE_38",
  "TABLE_38_LAYOUT_B",
  "TABLE_38_LAYOUT_C",
  "TABLE_38_LAYOUT_D",
];

/** Info: (20260909 - Emily) 每個數字 +1,讓子代碼 / 廠址 / 全公司三層全部勾不起來 */
const breakEveryNumber = (table: string): string =>
  table.replace(
    /\| (\d+)\.(\d+) \|/g,
    (_match, whole: string, fraction: string) =>
      `| ${Number(whole) + 1}.${fraction} |`,
  );

const worstCaseReason = (layout: string): string => {
  const parsed = parseTable38(breakEveryNumber(fixture(layout)));
  const reconciled = reconcileTable38(parsed, { companyTotalTonne: "1.000" });
  const result = toLedgerEntries(parsed, reconciled, { tableNo: "表3.8" });
  expect(result.entries).toEqual([]);
  expect(result.blockedReason).not.toBeNull();
  return result.blockedReason ?? "";
};

const NOW = "2026-09-09T08:00:00.000Z";
const blockOf = (reason: string, paragraphId = "3.8"): ILedgerImportBlock => ({
  paragraphId,
  reason,
  blockedAt: NOW,
});

const baseState = {
  step: "ORG_PROFILE",
  activities: [],
  notes: [],
  updatedAt: NOW,
  version: 1,
};

describe("量測:寫入端的值域確實超過儲存端(這是截斷存在的理由)", () => {
  it("四廠址的真實版面全錯一次,blockedReason 超過事實 value 的上界", () => {
    const reason = worstCaseReason("TABLE_38");
    expect(reason.length).toBeGreaterThan(LEDGER_FACT_VALUE_MAX_LENGTH);
    /**
     * Info: (20260909 - Emily) 這一條是反例:**沒有收界**的紀錄,儲存端拒、事實包也拒。
     * 它證明的是順序 —— 若把 schema 的 `.max()` 放寬到讓這條過,截斷就沒有第二道了。
     */
    const unbounded = CarbonInventoryStateSchema.safeParse({
      ...baseState,
      ledgerImportBlocks: [blockOf(reason)],
    });
    expect(unbounded.success).toBe(false);
    const fact = queryAnomalies(undefined, [blockOf(reason)]);
    expect(fact.ok).toBe(true);
    if (fact.ok) {
      expect(CarbonLedgerFactSchema.safeParse(fact.facts[0]).success).toBe(
        false,
      );
    }
  });

  it("截斷用的分隔字元就是寫入端接段落用的那一個(改一邊必改另一邊)", () => {
    const ledgerSource = read("src/lib/carbon_table38.ledger.ts");
    expect(ledgerSource).toContain(
      `parts.join("${LEDGER_IMPORT_BLOCK_REASON_SEPARATOR}")`,
    );
    const reason = worstCaseReason("TABLE_38_LAYOUT_B");
    expect(reason.split(LEDGER_IMPORT_BLOCK_REASON_SEPARATOR).length).toBe(
      reconcileTable38(
        parseTable38(breakEveryNumber(fixture("TABLE_38_LAYOUT_B"))),
        { companyTotalTonne: "1.000" },
      ).checks.filter((check) => !check.isWithinTolerance).length + 1,
    );
  });
});

describe("不變式:寫入端能產出的紀錄,收界之後儲存端一定讀得回來", () => {
  LAYOUTS.forEach((layout) => {
    it(`${layout} 全錯的 reason → 收界 → schema 收、事實包 schema 收、往返等價`, () => {
      const bounded = boundLedgerImportBlocks([
        blockOf(worstCaseReason(layout)),
      ]);
      const state = { ...baseState, ledgerImportBlocks: bounded };
      const parsed = CarbonInventoryStateSchema.safeParse(
        JSON.parse(JSON.stringify(state)),
      );
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.ledgerImportBlocks).toEqual(bounded);
      }
      const facts = queryAnomalies(undefined, bounded);
      expect(facts.ok).toBe(true);
      if (facts.ok) {
        facts.facts.forEach((fact) =>
          expect(CarbonLedgerFactSchema.safeParse(fact).success).toBe(true),
        );
      }
    });
  });

  it("陣列上界容得下大綱的每一節各擋一次(paragraphId 是大綱 id,唯一)", () => {
    expect(LEDGER_IMPORT_BLOCKS_MAX).toBeGreaterThanOrEqual(
      CARBON_REPORT_OUTLINE.length,
    );
    const everySection = CARBON_REPORT_OUTLINE.map((section) =>
      blockOf(worstCaseReason("TABLE_38"), section.id),
    );
    const bounded = boundLedgerImportBlocks(everySection);
    expect(bounded).toHaveLength(CARBON_REPORT_OUTLINE.length);
    expect(bounded.map((block) => block.paragraphId)).toEqual(
      CARBON_REPORT_OUTLINE.map((section) => section.id),
    );
    expect(
      CarbonInventoryStateSchema.safeParse({
        ...baseState,
        ledgerImportBlocks: bounded,
      }).success,
    ).toBe(true);
  });

  it("reason 上界不大於事實 value 上界(reason 會一字不改變成 value)", () => {
    expect(LEDGER_IMPORT_BLOCK_REASON_MAX_LENGTH).toBeLessThanOrEqual(
      LEDGER_FACT_VALUE_MAX_LENGTH,
    );
  });
});

describe("boundLedgerImportReason:整段整段地捨,不留看起來像數字的殘片", () => {
  it("界內原樣回傳(冪等的前半)", () => {
    const short =
      "5 列無法解析;(1) 總公司 差額 4(原文 18.8494 vs 加總 22.8494)";
    expect(boundLedgerImportReason(short)).toBe(short);
  });

  it("界外只在 ; 處下刀,保留的每一段都是原文裡完整的一段,末尾說少了幾段", () => {
    const reason = worstCaseReason("TABLE_38");
    const parts = reason.split(LEDGER_IMPORT_BLOCK_REASON_SEPARATOR);
    const bounded = boundLedgerImportReason(reason);
    expect(bounded.length).toBeLessThanOrEqual(
      LEDGER_IMPORT_BLOCK_REASON_MAX_LENGTH,
    );
    const kept = bounded.split(LEDGER_IMPORT_BLOCK_REASON_SEPARATOR);
    const marker = kept[kept.length - 1];
    const body = kept.slice(0, -1);
    expect(marker).toMatch(/^另有 \d+ 項未列出$/);
    expect(body.length).toBeGreaterThan(1);
    body.forEach((part, index) => expect(part).toBe(parts[index]));
    expect(marker).toBe(`另有 ${parts.length - body.length} 項未列出`);
    // Info: (20260909 - Emily) 第一段「N 列無法解析」一定保住:它是使用者最先要知道的那件事
    expect(body[0]).toBe(parts[0]);
  });

  it("冪等:收過界的再收一次,一字不變", () => {
    const once = boundLedgerImportReason(worstCaseReason("TABLE_38_LAYOUT_C"));
    expect(boundLedgerImportReason(once)).toBe(once);
  });

  it("連第一段都放不下(subject 是客戶原文,可以很長):硬切加「…」,其餘計入「另有 N 項」", () => {
    const hugeSubject = "廠".repeat(600);
    const reason = [
      `${hugeSubject} 差額 1(原文 1 vs 加總 2)`,
      "第二段",
      "第三段",
    ].join(LEDGER_IMPORT_BLOCK_REASON_SEPARATOR);
    const bounded = boundLedgerImportReason(reason);
    expect(bounded.length).toBeLessThanOrEqual(
      LEDGER_IMPORT_BLOCK_REASON_MAX_LENGTH,
    );
    expect(bounded).toMatch(/…;另有 2 項未列出$/);
    expect(bounded.startsWith("廠廠廠")).toBe(true);
    // Info: (20260909 - Emily) 單獨一段也放不下:只剩硬切與「…」,沒有「另有 0 項」這種空話
    const alone = boundLedgerImportReason(hugeSubject);
    expect(alone.length).toBeLessThanOrEqual(
      LEDGER_IMPORT_BLOCK_REASON_MAX_LENGTH,
    );
    expect(alone.endsWith("…")).toBe(true);
    expect(alone).not.toContain("另有");
  });

  it("空字串不會變成一筆 schema 拒收的紀錄(min(1)),而是寫入端本來就用的那句替代字", () => {
    expect(boundLedgerImportReason("   ")).toBe(
      LEDGER_IMPORT_BLOCK_UNKNOWN_REASON,
    );
  });

  it("自訂上界也守同一套規則(常數改了測試不用改)", () => {
    const reason = ["aaaa", "bbbb", "cccc", "dddd"].join(";");
    const bounded = boundLedgerImportReason(reason, 18);
    expect(bounded.length).toBeLessThanOrEqual(18);
    expect(bounded).toBe("aaaa;另有 3 項未列出");
  });
});

describe("唯一寫入者確實在寫入前收界,而且 ref 拿的是同一份", () => {
  const hook = read("src/hooks/use_carbon_chat.ts");

  it("recordLedgerImportBlocks 內部呼叫 boundLedgerImportBlocks,寫進 state 與回傳的都是收過界的那份", () => {
    const start = hook.indexOf("const recordLedgerImportBlocks = useCallback(");
    expect(start).toBeGreaterThan(-1);
    const body = hook.slice(
      start,
      hook.indexOf("[user?.address, activeSessionId],", start),
    );
    expect(body).toContain("const bounded = boundLedgerImportBlocks(blocks);");
    expect(body).toContain("ledgerImportBlocks: bounded,");
    expect(body).toContain("return bounded;");
    expect(body).not.toContain("ledgerImportBlocks: blocks,");
  });

  it("呼叫端把回傳值寫進 ledgerImportBlocksRef,而不是寫原始的 blocks", () => {
    expect(hook).toContain(
      "const recordedBlocks = recordLedgerImportBlocks(blocks);",
    );
    expect(hook).toContain("ledgerImportBlocksRef.current = recordedBlocks;");
    expect(hook).not.toContain("ledgerImportBlocksRef.current = blocks;");
  });

  it("ledgerImportBlocks 只有這一個寫入者(其餘都是清空)", () => {
    const writes = hook.match(/ledgerImportBlocks:\s*[^,\n]+/g) ?? [];
    const nonClearing = writes.filter(
      (write) => !/ledgerImportBlocks:\s*undefined/.test(write),
    );
    expect(nonClearing).toEqual(["ledgerImportBlocks: bounded"]);
  });
});
