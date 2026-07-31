import {
  MatrixActionType,
  CustomChartConfigKey,
} from "@/constants/custom_chart";
import { IMatrixAction } from "@/interfaces/custom_chart";
import {
  parseMatrixItems,
  parseMatrixData,
  applyMatrixAction,
  applyMatrixActions,
} from "@/lib/utils/custom_matrix_editor";
import { describe, it, expect } from "@jest/globals";

/**
 * Info: (20260725 - Luphia)
 * custom_matrix_editor 純函式單元測試：涵蓋解析、各動作套用、CSV 跳脫 round-trip，
 * 以及 stacked-actions 索引穩定性（先刪後編不打錯行）與輸入不可變性。
 */

// Info: (20260725 - Luphia) 標準測試用 DSL；行號（split("\n")）：0 title / 1 xaxis / 2 yaxis / 3 A / 4 B / 5 C
const RAW = [
  "title: 競爭力矩陣",
  "xaxis: 低 ↔ 高",
  "yaxis: 弱 ↔ 強",
  "A, 10, 20, G1",
  "B, -5, 15, G1, #ff0000",
  "C, 30, 40",
].join("\n");

const uid = (n: number): string => `test-action-${n}`;

describe("parseMatrixItems", () => {
  it("僅解析資料列並附正確 lineIndex，略過設定列/註解/空行", () => {
    const raw = ["%% comment", "", RAW].join("\n");
    const items = parseMatrixItems(raw);
    expect(items.map((i) => i.label)).toEqual(["A", "B", "C"]);
    // Info: (20260725 - Luphia) 前置了 2 行（註解 + 空行），資料列行號各 +2
    expect(items.map((i) => i.lineIndex)).toEqual([5, 6, 7]);
    expect(items[0]).toMatchObject({ label: "A", x: 10, y: 20, group: "G1" });
    expect(items[2].group).toBeUndefined();
  });

  it("空字串或非字串輸入回傳空陣列（永不 throw）", () => {
    expect(parseMatrixItems("")).toEqual([]);
    // @ts-expect-error 測試非字串輸入的防呆
    expect(parseMatrixItems(null)).toEqual([]);
  });
});

describe("parseMatrixData", () => {
  it("回傳去重群組清單與群組顏色對照（首個非空顏色為準）", () => {
    const data = parseMatrixData(RAW);
    expect(data.groups).toEqual(["G1"]);
    expect(data.groupColors).toEqual({ G1: "#ff0000" });
    expect(data.items).toHaveLength(3);
  });
});

describe("applyMatrixAction - ADD_ITEM", () => {
  it("附加到尾端且不影響既有資料列行號", () => {
    const action: IMatrixAction = {
      id: uid(1),
      type: MatrixActionType.ADD_ITEM,
      description: "add D",
      payload: { label: "D", x: 5, y: 6, group: "G2" },
    };
    const out = applyMatrixAction(RAW, action);
    const outLines = out.split("\n");
    expect(outLines).toHaveLength(7);
    expect(outLines[6]).toBe("D, 5, 6, G2");
    // Info: (20260725 - Luphia) 既有行未位移
    expect(outLines.slice(0, 6)).toEqual(RAW.split("\n"));
  });

  it("CSV 跳脫：含逗號/引號的標籤以雙引號包夾並可 round-trip", () => {
    const action: IMatrixAction = {
      id: uid(2),
      type: MatrixActionType.ADD_ITEM,
      description: "add tricky",
      payload: { label: 'X, "risky"', x: 1, y: 2, group: "" },
    };
    const out = applyMatrixAction(RAW, action);
    const appended = out.split("\n")[6];
    expect(appended).toBe('"X, ""risky""", 1, 2');
    // Info: (20260725 - Luphia) 重新解析應還原原始標籤
    const reparsed = parseMatrixItems(out);
    expect(reparsed[reparsed.length - 1].label).toBe('X, "risky"');
  });
});

describe("applyMatrixAction - EDIT_ITEM", () => {
  it("群組不變時保留原顏色；改群組時捨棄顏色", () => {
    // Info: (20260725 - Luphia) B（行 4）原屬 G1 且有 #ff0000
    const keepColor = applyMatrixAction(RAW, {
      id: uid(3),
      type: MatrixActionType.EDIT_ITEM,
      description: "edit B keep group",
      payload: { lineIndex: 4, label: "B2", x: 1, y: 2, group: "G1" },
    });
    expect(keepColor.split("\n")[4]).toBe("B2, 1, 2, G1, #ff0000");

    const changeGroup = applyMatrixAction(RAW, {
      id: uid(4),
      type: MatrixActionType.EDIT_ITEM,
      description: "edit B change group",
      payload: { lineIndex: 4, label: "B2", x: 1, y: 2, group: "G9" },
    });
    expect(changeGroup.split("\n")[4]).toBe("B2, 1, 2, G9");
  });

  it("目標行號超出範圍或非資料列時原樣返回（Fail Safe）", () => {
    const out = applyMatrixAction(RAW, {
      id: uid(5),
      type: MatrixActionType.EDIT_ITEM,
      description: "edit config line",
      payload: { lineIndex: 0, label: "hack", x: 0, y: 0, group: "" },
    });
    expect(out).toBe(RAW);
  });
});

describe("applyMatrixAction - EDIT_AXIS (buildAxisValue)", () => {
  it("兩端皆有 → min ↔ max；僅一端 / 皆空的行為", () => {
    const both = applyMatrixAction(RAW, {
      id: uid(6),
      type: MatrixActionType.EDIT_AXIS,
      description: "axis both",
      payload: { xMin: "L", xMax: "H", yMin: "D", yMax: "U" },
    });
    const lines = both.split("\n");
    expect(lines).toContain(`${CustomChartConfigKey.X_AXIS}: L ↔ H`);
    expect(lines).toContain(`${CustomChartConfigKey.Y_AXIS}: D ↔ U`);

    const onlyMax = applyMatrixAction(RAW, {
      id: uid(7),
      type: MatrixActionType.EDIT_AXIS,
      description: "axis only max",
      payload: { xMax: "H" },
    });
    expect(onlyMax.split("\n")).toContain(`${CustomChartConfigKey.X_AXIS}: H`);

    const cleared = applyMatrixAction(RAW, {
      id: uid(8),
      type: MatrixActionType.EDIT_AXIS,
      description: "axis clear",
      payload: {},
    });
    // Info: (20260725 - Luphia) 皆空 → 移除 xaxis/yaxis 設定列
    expect(
      cleared
        .split("\n")
        .some((l) => l.startsWith(`${CustomChartConfigKey.X_AXIS}:`)),
    ).toBe(false);
  });
});

describe("applyMatrixAction - CHANGE_QUADRANT_COLOR", () => {
  it("以單一設定列存 Q1..Q4 底色，空值濾除", () => {
    const out = applyMatrixAction(RAW, {
      id: uid(9),
      type: MatrixActionType.CHANGE_QUADRANT_COLOR,
      description: "quadrant",
      payload: { colors: ["#111111", "", "#333333", " "] },
    });
    expect(out.split("\n")).toContain(
      `${CustomChartConfigKey.QUADRANT_COLORS}: #111111, #333333`,
    );
  });
});

describe("applyMatrixAction - EDIT_GROUP", () => {
  it("套用成員與統一顏色；原屬該群組但未列入者移出群組", () => {
    // Info: (20260725 - Luphia) 將 C（行 5）納入 G1、統一顏色；B（行 4）原屬 G1 但不列入 → 移出
    const out = applyMatrixAction(RAW, {
      id: uid(10),
      type: MatrixActionType.EDIT_GROUP,
      description: "edit group G1",
      payload: {
        group: "G1",
        memberLineIndexes: [3, 5],
        color: "#00ff00",
      },
    });
    const lines = out.split("\n");
    expect(lines[3]).toBe("A, 10, 20, G1, #00ff00");
    expect(lines[5]).toBe("C, 30, 40, G1, #00ff00");
    // Info: (20260725 - Luphia) 移出群組，顏色一併清除
    expect(lines[4]).toBe("B, -5, 15");
  });
});

describe("applyMatrixAction - DELETE_ITEM", () => {
  it("以 lineIndex 刪除單一資料列", () => {
    const out = applyMatrixAction(RAW, {
      id: uid(11),
      type: MatrixActionType.DELETE_ITEM,
      description: "delete A",
      payload: { lineIndex: 3 },
    });
    expect(out.split("\n").map((l) => l.split(",")[0])).toEqual([
      "title: 競爭力矩陣",
      "xaxis: 低 ↔ 高",
      "yaxis: 弱 ↔ 強",
      "B",
      "C",
    ]);
  });

  it("以 group 刪除整個分組所有資料列", () => {
    const out = applyMatrixAction(RAW, {
      id: uid(12),
      type: MatrixActionType.DELETE_ITEM,
      description: "delete group G1",
      payload: { group: "G1" },
    });
    const labels = parseMatrixItems(out).map((i) => i.label);
    expect(labels).toEqual(["C"]);
  });
});

describe("applyMatrixActions - stacked 索引穩定性（核心修正）", () => {
  it("先刪(行3)後編(行5)：兩者皆以原始行號命中，不因刪除位移而打錯行", () => {
    const actions: IMatrixAction[] = [
      {
        id: uid(13),
        type: MatrixActionType.DELETE_ITEM,
        description: "delete A(3)",
        payload: { lineIndex: 3 },
      },
      {
        id: uid(14),
        type: MatrixActionType.EDIT_ITEM,
        description: "edit C(5)",
        payload: { lineIndex: 5, label: "C2", x: 99, y: 88, group: "" },
      },
    ];
    const out = applyMatrixActions(RAW, actions);
    const labels = parseMatrixItems(out).map((i) => i.label);
    // Info: (20260725 - Luphia) A 被刪、C 被正確改為 C2；B 不受影響
    expect(labels).toEqual(["B", "C2"]);
    expect(out).toContain("C2, 99, 88");
    expect(out).not.toContain("\nA, 10, 20");
  });

  it("先編(行5)後刪(行3)：順序相反結果一致", () => {
    const actions: IMatrixAction[] = [
      {
        id: uid(15),
        type: MatrixActionType.EDIT_ITEM,
        description: "edit C(5)",
        payload: { lineIndex: 5, label: "C2", x: 99, y: 88, group: "" },
      },
      {
        id: uid(16),
        type: MatrixActionType.DELETE_ITEM,
        description: "delete A(3)",
        payload: { lineIndex: 3 },
      },
    ];
    const out = applyMatrixActions(RAW, actions);
    expect(parseMatrixItems(out).map((i) => i.label)).toEqual(["B", "C2"]);
  });

  it("設定列動作延後套用：與資料列刪除同批仍正確", () => {
    const actions: IMatrixAction[] = [
      {
        id: uid(17),
        type: MatrixActionType.EDIT_AXIS,
        description: "axis",
        payload: { xMin: "L", xMax: "H" },
      },
      {
        id: uid(18),
        type: MatrixActionType.DELETE_ITEM,
        description: "delete A(3)",
        payload: { lineIndex: 3 },
      },
    ];
    const out = applyMatrixActions(RAW, actions);
    expect(out.split("\n")).toContain(`${CustomChartConfigKey.X_AXIS}: L ↔ H`);
    expect(parseMatrixItems(out).map((i) => i.label)).toEqual(["B", "C"]);
  });
});

describe("不可變性與 round-trip", () => {
  it("套用動作不變更輸入字串", () => {
    const before = RAW;
    applyMatrixActions(RAW, [
      {
        id: uid(19),
        type: MatrixActionType.DELETE_ITEM,
        description: "delete",
        payload: { lineIndex: 3 },
      },
    ]);
    expect(RAW).toBe(before);
  });

  it("空動作清單原樣返回", () => {
    expect(applyMatrixActions(RAW, [])).toBe(RAW);
  });

  it("parse→edit→parse round-trip 維持資料一致", () => {
    const items = parseMatrixItems(RAW);
    const target = items.find((i) => i.label === "B")!;
    const out = applyMatrixAction(RAW, {
      id: uid(20),
      type: MatrixActionType.EDIT_ITEM,
      description: "edit B",
      payload: {
        lineIndex: target.lineIndex,
        label: "B",
        x: 7,
        y: 8,
        group: "G1",
      },
    });
    const reparsed = parseMatrixItems(out).find((i) => i.label === "B")!;
    expect(reparsed).toMatchObject({ x: 7, y: 8, group: "G1" });
  });
});

/**
 * Info: (20260731 - Julian)
 * 使用者指定情境補充：矩陣資料點無序、無 newLineIndex 跨列移動，故「移動」情境對應為
 * ADD 附加尾端 / EDIT 就地（不重排）；另補「同批多動作疊加」「目標已刪除」「超界/非法 lineIndex」。
 */
describe("applyMatrixActions - 同批多動作疊加", () => {
  it("多個 ADD + EDIT + DELETE 混合：驗證最終順序與各列內容", () => {
    const actions: IMatrixAction[] = [
      {
        id: uid(30),
        type: MatrixActionType.ADD_ITEM,
        description: "add D",
        payload: { label: "D", x: 5, y: 6, group: "G2" },
      },
      {
        id: uid(31),
        type: MatrixActionType.EDIT_ITEM,
        description: "edit A(3) in place",
        payload: { lineIndex: 3, label: "A2", x: 11, y: 22, group: "G1" },
      },
      {
        id: uid(32),
        type: MatrixActionType.DELETE_ITEM,
        description: "delete B(4)",
        payload: { lineIndex: 4 },
      },
      {
        id: uid(33),
        type: MatrixActionType.ADD_ITEM,
        description: "add E",
        payload: { label: "E", x: 7, y: 8, group: "" },
      },
    ];
    const out = applyMatrixActions(RAW, actions);
    // Info: (20260731 - Julian) 非刪除原行（含就地編輯 A→A2）依原序，附加行 D、E 依動作順序接尾端
    expect(out).toBe(
      [
        "title: 競爭力矩陣",
        "xaxis: 低 ↔ 高",
        "yaxis: 弱 ↔ 強",
        "A2, 11, 22, G1",
        "C, 30, 40",
        "D, 5, 6, G2",
        "E, 7, 8",
      ].join("\n"),
    );
    expect(out).not.toContain("B, -5, 15");
  });
});

describe("applyMatrixActions - 目標已被刪除（Fail Safe，不產生幽靈列）", () => {
  it("同一 lineIndex 先 DELETE 再 EDIT：EDIT 被略過", () => {
    const actions: IMatrixAction[] = [
      {
        id: uid(34),
        type: MatrixActionType.DELETE_ITEM,
        description: "delete B(4)",
        payload: { lineIndex: 4 },
      },
      {
        id: uid(35),
        type: MatrixActionType.EDIT_ITEM,
        description: "edit deleted B(4)",
        payload: { lineIndex: 4, label: "GHOST", x: 1, y: 1, group: "" },
      },
    ];
    const out = applyMatrixActions(RAW, actions);
    expect(parseMatrixItems(out).map((i) => i.label)).toEqual(["A", "C"]);
    expect(out).not.toContain("GHOST");
  });
});

describe("applyMatrixActions - 超界 / 非法 lineIndex", () => {
  it("超界、負數、指向設定列的 lineIndex 一律略過，不 throw、不錯位", () => {
    const actions: IMatrixAction[] = [
      {
        id: uid(36),
        type: MatrixActionType.EDIT_ITEM,
        description: "edit out of bounds",
        payload: { lineIndex: 999, label: "OOB", x: 1, y: 1, group: "" },
      },
      {
        id: uid(37),
        type: MatrixActionType.DELETE_ITEM,
        description: "delete negative",
        payload: { lineIndex: -1 },
      },
      {
        id: uid(38),
        type: MatrixActionType.DELETE_ITEM,
        description: "delete config line",
        payload: { lineIndex: 0 },
      },
      {
        id: uid(39),
        type: MatrixActionType.EDIT_ITEM,
        description: "edit config line",
        payload: { lineIndex: 1, label: "CFG", x: 0, y: 0, group: "" },
      },
    ];
    const run = () => applyMatrixActions(RAW, actions);
    expect(run).not.toThrow();
    // Info: (20260731 - Julian) 全部略過 → 輸出與原始完全相同
    expect(run()).toBe(RAW);
  });
});
