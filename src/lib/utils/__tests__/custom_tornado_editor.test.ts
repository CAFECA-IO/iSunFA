import {
  parseTornadoBars,
  parseTornadoData,
  applyTornadoAction,
  applyTornadoActions,
} from "@/lib/utils/custom_tornado_editor";
import { ITornadoAction } from "@/interfaces/custom_chart";
import {
  TornadoActionType,
  TornadoMode,
  CustomChartConfigKey,
} from "@/constants/custom_chart";
import { describe, it, expect } from "@jest/globals";

/**
 * Info: (20260731 - Julian)
 * 龍捲風圖批次引擎 custom_tornado_editor 測試（tombstone 穩定索引策略）。
 * 涵蓋解析（略過設定列/標頭列）、各動作套用、EDIT_SETTINGS/EDIT_GROUP 設定列與標頭處理、
 * stacked-actions 行號穩定（先刪後編不打錯行）、Fail Safe（已刪/標頭/設定列/超界）與不可變性。
 *
 * 註：龍捲風資料列無位移語意，ADD_ITEM 附加於尾端、EDIT_ITEM 就地覆寫；
 * 數列名稱以「標頭列」表示、顏色/單位/基準值/型別以「設定列」表示，兩者延後於資料列動作之後套用。
 */

// Info: (20260731 - Julian) 測試底稿；行號（split("\n")）：0 title / 1 unit（設定列）/ 2 標頭 / 3 A / 4 B / 5 C
const RAW = [
  "title: 敏感度",
  "unit: 萬元",
  "項目, 樂觀, 悲觀",
  "A, 10, 20",
  "B, 30, 40",
  "C, 50, 60",
].join("\n");

const uid = (n: number): string => `tornado-action-${n}`;

// Info: (20260731 - Julian) 動作建構輔助
const del = (lineIndex: number): ITornadoAction => ({
  id: `del-${lineIndex}`,
  description: "delete",
  type: TornadoActionType.DELETE_ITEM,
  payload: { lineIndex },
});
const edit = (
  lineIndex: number,
  category: string,
  left: number,
  right: number,
): ITornadoAction => ({
  id: `edit-${lineIndex}`,
  description: "edit",
  type: TornadoActionType.EDIT_ITEM,
  payload: { lineIndex, category, left, right },
});
const add = (
  category: string,
  left: number,
  right: number,
): ITornadoAction => ({
  id: `add-${category}`,
  description: "add",
  type: TornadoActionType.ADD_ITEM,
  payload: { category, left, right },
});

describe("parseTornadoBars / parseTornadoData", () => {
  it("略過設定列與標頭列，資料列附正確 lineIndex", () => {
    const bars = parseTornadoBars(RAW);
    expect(bars.map((b) => b.category)).toEqual(["A", "B", "C"]);
    expect(bars.map((b) => b.lineIndex)).toEqual([3, 4, 5]);
    expect(bars[0]).toMatchObject({
      category: "A",
      left: 10,
      right: 20,
      lineIndex: 3,
    });
  });

  it("解析標頭數列名稱、單位與 hasHeader", () => {
    const data = parseTornadoData(RAW);
    expect(data.hasHeader).toBe(true);
    expect(data.leftSeries).toBe("樂觀");
    expect(data.rightSeries).toBe("悲觀");
    expect(data.unit).toBe("萬元");
    expect(data.bars).toHaveLength(3);
  });

  it("空字串或非字串輸入回傳空陣列（永不 throw）", () => {
    expect(parseTornadoBars("")).toEqual([]);
    // @ts-expect-error 測試非字串輸入的防呆
    expect(parseTornadoBars(null)).toEqual([]);
  });
});

describe("applyTornadoActions - ADD / EDIT / DELETE 基本", () => {
  it("ADD 附加於尾端，不影響既有資料列行號", () => {
    const out = applyTornadoActions(RAW, [add("D", 70, 80)]);
    expect(out.split("\n")).toEqual([...RAW.split("\n"), "D, 70, 80"]);
  });

  it("EDIT 就地覆寫指定資料列", () => {
    const out = applyTornadoActions(RAW, [edit(4, "B2", 33, 44)]);
    expect(out.split("\n")[4]).toBe("B2, 33, 44");
    // Info: (20260731 - Julian) 其餘列不變
    expect(out.split("\n")[3]).toBe("A, 10, 20");
    expect(out.split("\n")[5]).toBe("C, 50, 60");
  });

  it("DELETE 以 lineIndex 刪除資料列", () => {
    const out = applyTornadoActions(RAW, [del(3)]);
    expect(parseTornadoBars(out).map((b) => b.category)).toEqual(["B", "C"]);
  });

  it("CSV 跳脫：含逗號的類別以雙引號包夾並可 round-trip", () => {
    const out = applyTornadoActions(RAW, [add('X, "risk"', 1, 2)]);
    const appended = out.split("\n").at(-1);
    expect(appended).toBe('"X, ""risk""", 1, 2');
    expect(parseTornadoBars(out).at(-1)?.category).toBe('X, "risk"');
  });
});

describe("applyTornadoActions - EDIT_SETTINGS（設定列）", () => {
  it("設定 mode / baseline；unit 空字串移除該設定列", () => {
    const out = applyTornadoActions(RAW, [
      {
        id: uid(1),
        description: "settings",
        type: TornadoActionType.EDIT_SETTINGS,
        payload: { mode: TornadoMode.SENSITIVITY, unit: "", baseline: 100 },
      },
    ]);
    const lines = out.split("\n");
    expect(lines).toContain(
      `${CustomChartConfigKey.MODE}: ${TornadoMode.SENSITIVITY}`,
    );
    expect(lines).toContain(`${CustomChartConfigKey.BASELINE}: 100`);
    expect(
      lines.some((l) => l.startsWith(`${CustomChartConfigKey.UNIT}:`)),
    ).toBe(false);
    // Info: (20260731 - Julian) 資料列不受設定列動作影響
    expect(parseTornadoBars(out).map((b) => b.category)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });
});

describe("applyTornadoActions - EDIT_GROUP（標頭 + 顏色）", () => {
  it("有標頭時改寫數列名稱（保留類別欄）並寫入左右顏色設定列", () => {
    const out = applyTornadoActions(RAW, [
      {
        id: uid(2),
        description: "group",
        type: TornadoActionType.EDIT_GROUP,
        payload: {
          leftSeries: "最佳",
          rightSeries: "最差",
          leftColor: "#ff0000",
          rightColor: "#0000ff",
        },
      },
    ]);
    const lines = out.split("\n");
    expect(lines).toContain("項目, 最佳, 最差");
    expect(lines).toContain(`${CustomChartConfigKey.LEFT_COLOR}: #ff0000`);
    expect(lines).toContain(`${CustomChartConfigKey.RIGHT_COLOR}: #0000ff`);
  });

  it("無標頭時於首筆資料列前插入標頭列（預設類別欄）", () => {
    const noHeader = ["title: T", "A, 10, 20", "B, 30, 40"].join("\n");
    const out = applyTornadoActions(noHeader, [
      {
        id: uid(3),
        description: "group",
        type: TornadoActionType.EDIT_GROUP,
        payload: { leftSeries: "L", rightSeries: "R" },
      },
    ]);
    expect(out.split("\n")).toEqual([
      "title: T",
      "項目, L, R",
      "A, 10, 20",
      "B, 30, 40",
    ]);
  });
});

describe("applyTornadoActions - 先刪後編（stacked 行號穩定）", () => {
  it("DELETE(3=A) + EDIT(5=C)：EDIT 仍打到原始第 5 行（C），而非位移後的第 4 行（B）", () => {
    const out = applyTornadoActions(RAW, [del(3), edit(5, "C2", 99, 88)]);
    expect(out).toBe(
      [
        "title: 敏感度",
        "unit: 萬元",
        "項目, 樂觀, 悲觀",
        "B, 30, 40",
        "C2, 99, 88",
      ].join("\n"),
    );
    expect(out).toContain("C2, 99, 88");
    expect(out).not.toContain("\nA, 10, 20");
  });

  it("先編(5)後刪(3)：順序相反結果一致", () => {
    const out = applyTornadoActions(RAW, [edit(5, "C2", 99, 88), del(3)]);
    expect(parseTornadoBars(out).map((b) => b.category)).toEqual(["B", "C2"]);
  });

  it("設定列動作與資料列刪除同批：設定正確、刪除正確", () => {
    const out = applyTornadoActions(RAW, [
      del(3),
      {
        id: uid(4),
        description: "settings",
        type: TornadoActionType.EDIT_SETTINGS,
        payload: { baseline: 5 },
      },
    ]);
    expect(out.split("\n")).toContain(`${CustomChartConfigKey.BASELINE}: 5`);
    expect(parseTornadoBars(out).map((b) => b.category)).toEqual(["B", "C"]);
  });
});

describe("applyTornadoActions - Fail Safe", () => {
  it("同一 lineIndex 先 DELETE 再 EDIT：EDIT 被略過，不產生幽靈列", () => {
    const out = applyTornadoActions(RAW, [del(4), edit(4, "GHOST", 1, 1)]);
    expect(parseTornadoBars(out).map((b) => b.category)).toEqual(["A", "C"]);
    expect(out).not.toContain("GHOST");
  });

  it("EDIT/DELETE 指向標頭列或設定列一律略過（原樣返回）", () => {
    expect(applyTornadoActions(RAW, [edit(2, "H", 1, 1)])).toBe(RAW); // Info: (20260731 - Julian) 第 2 行為標頭列
    expect(applyTornadoActions(RAW, [edit(0, "T", 1, 1)])).toBe(RAW); // Info: (20260731 - Julian) 第 0 行為設定列
    expect(applyTornadoActions(RAW, [del(2)])).toBe(RAW); // Info: (20260731 - Julian) 標頭列不可當資料列刪除
  });

  it("超界 / 負數 lineIndex 一律略過，不 throw、不錯位", () => {
    const run = () =>
      applyTornadoActions(RAW, [edit(999, "OOB", 1, 1), del(-1), del(0)]);
    expect(run).not.toThrow();
    expect(run()).toBe(RAW);
  });
});

describe("applyTornadoActions - 不可變性與單發委派", () => {
  it("套用動作不變更輸入字串；空動作清單原樣返回", () => {
    const before = RAW;
    applyTornadoActions(RAW, [del(3)]);
    expect(RAW).toBe(before);
    expect(applyTornadoActions(RAW, [])).toBe(RAW);
  });

  it("applyTornadoAction 單發 = 批次套用單一動作", () => {
    const action = edit(4, "B2", 33, 44);
    expect(applyTornadoAction(RAW, action)).toBe(
      applyTornadoActions(RAW, [action]),
    );
  });
});
