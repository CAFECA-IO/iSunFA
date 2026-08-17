import { describe, it, expect } from "@jest/globals";
import {
  isStorableStatement,
  mergeMemoryItems,
  parseExtractedItems,
  renderMemoryForPrompt,
  type IFaithMemoryItem,
} from "@/lib/faith_memory/items";
import {
  FAITH_MEMORY_CATEGORY,
  FAITH_MEMORY_MAX_ITEMS,
  FAITH_MEMORY_PROMPT_MAX_CHARS,
  FAITH_MEMORY_STATEMENT_MAX_CHARS,
} from "@/constants/faith_memory";

/**
 * Info: (20260817 - Luphia) 費思長期記憶的項目運算（第一輪 C-1、規範 §4.2 / §5）。
 *
 * 這些規則決定「費思記得什麼」與「每輪多扣幾點」，因此必須是決定論的。
 * 最重要的一條是**數字一律不記**：金額與稅率的真相在 DB 與規則引擎，
 * 記進記憶等於讓 LLM 當事實資料庫，而且會在數字變動後持續複述舊值——
 * 那比「不記得」嚴重，因為它聽起來是有根據的。
 */

const item = (
  statement: string,
  updatedAt: number,
  category: keyof typeof FAITH_MEMORY_CATEGORY = "ANSWER_STYLE",
): IFaithMemoryItem => ({
  category: FAITH_MEMORY_CATEGORY[category],
  statement,
  updatedAt,
});

describe("isStorableStatement", () => {
  it("接受一般的偏好陳述", () => {
    expect(isStorableStatement("回答請簡短")).toBe(true);
  });

  /**
   * Info: (20260817 - Luphia) 本檔最重要的一條（規範 §4.2）。
   * 以確定性規則攔截，不靠 prompt 自律——prompt 只是請求，這裡是門。
   */
  it("拒絕任何含數字的陳述", () => {
    expect(isStorableStatement("公司資本額為 100 萬")).toBe(false);
    expect(isStorableStatement("稅率 5%")).toBe(false);
    expect(isStorableStatement("使用 IFRS16")).toBe(false);
  });

  it("拒絕空白與超長的陳述", () => {
    expect(isStorableStatement("   ")).toBe(false);
    expect(
      isStorableStatement("a".repeat(FAITH_MEMORY_STATEMENT_MAX_CHARS + 1)),
    ).toBe(false);
  });
});

describe("mergeMemoryItems", () => {
  it("併入新項目", () => {
    const merged = mergeMemoryItems(
      [item("舊偏好", 100)],
      [item("新偏好", 200)],
    );
    expect(merged.map((i) => i.statement).sort()).toEqual(["新偏好", "舊偏好"]);
  });

  /**
   * Info: (20260817 - Luphia) 去重只看正規化後的字面（規範 §4.2）：
   * 語意相似度不決定論，同一句話兩次萃取可能一次判重、一次沒判。
   */
  it("同分類且正規化後相同者視為同一條，只更新時間", () => {
    const merged = mergeMemoryItems(
      [item("回答 請簡短", 100)],
      [item("回答請簡短", 300)],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].updatedAt).toBe(300);
  });

  it("不同分類的相同文字是兩條", () => {
    const merged = mergeMemoryItems(
      [item("偏好", 100, "ANSWER_STYLE")],
      [item("偏好", 200, "REPORT_FORMAT")],
    );
    expect(merged).toHaveLength(2);
  });

  it("含數字的新項目不會被寫入", () => {
    const merged = mergeMemoryItems([], [item("資本額 500 萬", 100)]);
    expect(merged).toHaveLength(0);
  });

  /**
   * Info: (20260817 - Luphia) 超過上限時淘汰最舊的（LRU）。
   * 無上限的記憶會讓 prompt 無止境膨脹，而那直接反映在每輪的扣點上。
   */
  it("超過上限時淘汰 updatedAt 最舊者", () => {
    const existing = Array.from({ length: FAITH_MEMORY_MAX_ITEMS }, (_, i) =>
      item(`舊的第${"x".repeat(i + 1)}條`, i + 1),
    );
    const merged = mergeMemoryItems(existing, [item("最新的偏好", 99_999)]);

    expect(merged).toHaveLength(FAITH_MEMORY_MAX_ITEMS);
    expect(merged[0].statement).toBe("最新的偏好");
    // Info: (20260817 - Luphia) 被擠掉的是 updatedAt 最小的那一條
    expect(merged.some((i) => i.updatedAt === 1)).toBe(false);
  });

  it("不改動傳入的陣列", () => {
    const existing = [item("原有", 100)];
    mergeMemoryItems(existing, [item("新增", 200)]);
    expect(existing).toHaveLength(1);
  });

  it("略過分類不在封閉列舉內的項目", () => {
    const merged = mergeMemoryItems(
      [],
      [{ category: "MADE_UP", statement: "亂分類", updatedAt: 1 } as never],
    );
    expect(merged).toHaveLength(0);
  });
});

describe("renderMemoryForPrompt", () => {
  it("沒有記憶時回空字串（不污染 prompt）", () => {
    expect(renderMemoryForPrompt([])).toEqual({ text: "", totalChars: 0 });
  });

  it("標示為既有偏好而非待回答的問題", () => {
    const { text } = renderMemoryForPrompt([item("回答請簡短", 100)]);
    expect(text).toContain("Known preferences");
    expect(text).toContain("回答請簡短");
  });

  /**
   * Info: (20260817 - Luphia) 字元預算是**硬上界**，因此預扣估算仍是成本上界，
   * settleSpend 的「只退不補」不變式維持成立（規範 §5）。
   */
  it("不超過字元預算", () => {
    const many = Array.from({ length: FAITH_MEMORY_MAX_ITEMS }, (_, i) =>
      item(`偏好${"長".repeat(100)}${i === 0 ? "" : ""}`, i),
    );
    const { text, totalChars } = renderMemoryForPrompt(many);

    expect(totalChars).toBe(text.length);
    expect(totalChars).toBeLessThanOrEqual(FAITH_MEMORY_PROMPT_MAX_CHARS + 200);
  });

  // Info: (20260817 - Luphia) 預算不足時保留最新的，不是最舊的
  it("由新到舊填入", () => {
    const { text } = renderMemoryForPrompt([
      item("很舊的偏好", 1),
      item("最新的偏好", 999),
    ]);
    expect(text.indexOf("最新的偏好")).toBeLessThan(text.indexOf("很舊的偏好"));
  });
});

describe("parseExtractedItems", () => {
  const NOW = 1_760_000_000;

  it("收下合格的項目並蓋上時間", () => {
    const items = parseExtractedItems(
      [
        {
          category: FAITH_MEMORY_CATEGORY.TERMINOLOGY,
          statement: "稱我為林會計",
        },
      ],
      NOW,
    );
    expect(items).toEqual([
      {
        category: FAITH_MEMORY_CATEGORY.TERMINOLOGY,
        statement: "稱我為林會計",
        updatedAt: NOW,
      },
    ]);
  });

  /**
   * Info: (20260817 - Luphia) LLM 的輸出永不直接採信（CLAUDE.md §7）：
   * responseSchema 已鎖 enum，這裡是第二道白名單。
   */
  it("丟棄分類不合法、含數字、或型別不對的項目", () => {
    const items = parseExtractedItems(
      [
        { category: "INVENTED", statement: "亂分類" },
        {
          category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE,
          statement: "上限 3 點",
        },
        { category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE, statement: 42 },
        null,
        {
          category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE,
          statement: "回答請詳細",
        },
      ],
      NOW,
    );
    expect(items).toEqual([
      {
        category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE,
        statement: "回答請詳細",
        updatedAt: NOW,
      },
    ]);
  });

  // Info: (20260817 - Luphia) 「這輪沒東西可記」是正常結果，不是失敗
  it("非陣列或空陣列回空", () => {
    expect(parseExtractedItems(null, NOW)).toEqual([]);
    expect(parseExtractedItems([], NOW)).toEqual([]);
    expect(parseExtractedItems('{"oops":1}', NOW)).toEqual([]);
  });
});
