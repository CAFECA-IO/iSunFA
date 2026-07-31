import {
  applyHistogramAction,
  applyHistogramActions,
  parseHistogramBins,
} from "@/lib/utils/custom_histogram_editor";
import { IHistogramAction } from "@/interfaces/custom_chart";
import {
  HistogramActionType,
  HistogramTrendType,
} from "@/constants/custom_chart";
import { describe, it, expect } from "@jest/globals";

/**
 * Info: (20260731 - Julian)
 * 直方圖批次引擎 applyHistogramActions 測試（tombstone + 以原始行號錨定的 insertBefore 桶）。
 * 直方圖分箱有順序，新增／編輯皆為「定位插入／移動」；重點驗證整批動作以「原始 raw」行號為準，
 * 套用期間不位移原始行：先刪後編不打錯行、跨列移動至首/尾、多動作疊加、目標已刪除 Fail Safe、超界不錯位。
 */

// Info: (20260731 - Julian) 測試底稿：0=title、1=xaxis（設定列）；2=A 3=B 4=C 5=D（資料列 lineIndex）
const RAW = [
  "title: Scores",
  "xaxis: bucket",
  "A, 3",
  "B, 5",
  "C, 2",
  "D, 8",
].join("\n");

const uid = (n: number): string => `hist-action-${n}`;

// Info: (20260731 - Julian) 動作建構輔助
const del = (lineIndex: number): IHistogramAction => ({
  id: uid(lineIndex),
  description: "delete",
  type: HistogramActionType.DELETE_ITEM,
  payload: { lineIndex },
});
const edit = (
  lineIndex: number,
  label: string,
  count: number,
  newLineIndex: number,
): IHistogramAction => ({
  id: `edit-${lineIndex}`,
  description: "edit",
  type: HistogramActionType.EDIT_ITEM,
  payload: { lineIndex, label, count, newLineIndex },
});
const add = (
  label: string,
  count: number,
  lineIndex: number,
): IHistogramAction => ({
  id: `add-${label}`,
  description: "add",
  type: HistogramActionType.ADD_ITEM,
  payload: { label, count, lineIndex },
});

describe("applyHistogramActions - 先刪後編（stacked-actions 行號穩定）", () => {
  it("DELETE(2=A) + EDIT(4=C) 同批：EDIT 仍打到原始第 4 行（C），而非位移後的第 3 行（B）", () => {
    // Info: (20260731 - Julian) C 值改為 99、位置不變（newLineIndex 維持原行 4）
    const out = applyHistogramActions(RAW, [del(2), edit(4, "C", 99, 4)]);

    expect(out).toBe(
      ["title: Scores", "xaxis: bucket", "B, 5", "C, 99", "D, 8"].join("\n"),
    );
    // Info: (20260731 - Julian) C 被正確改到（值 99），B（位移後的第 3 行）未被誤改
    expect(out).toContain("C, 99");
    expect(out).toContain("B, 5");
    expect(out).not.toContain("A, 3");
  });
});

describe("applyHistogramActions - 跨列移動至首 / 尾（newLineIndex）", () => {
  it("EDIT 帶 newLineIndex 將 D 移到第一筆之前（首）", () => {
    // Info: (20260731 - Julian) 編輯模式：移到最前 → newLineIndex = 首筆固定車廂 lineIndex（A=2）
    const out = applyHistogramActions(RAW, [edit(5, "D", 8, 2)]);
    expect(out).toBe(
      ["title: Scores", "xaxis: bucket", "D, 8", "A, 3", "B, 5", "C, 2"].join(
        "\n",
      ),
    );
  });

  it("EDIT 帶 newLineIndex 將 A 移到最後一筆之後（尾）", () => {
    // Info: (20260731 - Julian) 移到最後 → newLineIndex = 末筆固定車廂 lineIndex + 1（D=5 → 6）
    const out = applyHistogramActions(RAW, [edit(2, "A", 3, 6)]);
    expect(out).toBe(
      ["title: Scores", "xaxis: bucket", "B, 5", "C, 2", "D, 8", "A, 3"].join(
        "\n",
      ),
    );
  });
});

describe("applyHistogramActions - 同批多動作疊加", () => {
  it("多個 ADD + EDIT + DELETE 混合：驗證最終順序與各列內容", () => {
    const out = applyHistogramActions(RAW, [
      add("NEW", 1, 3), // Info: 插到原始第 3 行（B）之前
      edit(2, "A", 30, 2), // Info: A 就地改值（newLineIndex 維持 2）
      del(5), // Info: 刪除 D（原始第 5 行）
      add("END", 9, 6), // Info: lineIndex=6 → 附加於尾端
    ]);
    expect(out).toBe(
      [
        "title: Scores",
        "xaxis: bucket",
        "A, 30",
        "NEW, 1",
        "B, 5",
        "C, 2",
        "END, 9",
      ].join("\n"),
    );
    expect(out).not.toContain("D, 8");
  });
});

describe("applyHistogramActions - 目標已被刪除（Fail Safe，不產生幽靈列）", () => {
  it("同一 lineIndex 先 DELETE 再 EDIT：EDIT 被略過", () => {
    const out = applyHistogramActions(RAW, [del(3), edit(3, "B", 99, 3)]);
    expect(out).toBe(
      ["title: Scores", "xaxis: bucket", "A, 3", "C, 2", "D, 8"].join("\n"),
    );
    expect(out).not.toContain("99");
    expect(out).not.toContain("B, 5");
  });
});

describe("applyHistogramActions - 超界 / 非法 lineIndex", () => {
  it("超界、負數、指向設定列的 EDIT/DELETE 一律略過，不 throw、不錯位", () => {
    const actions: IHistogramAction[] = [
      edit(999, "OOB", 1, 999), // Info: 超界
      del(-1), // Info: 負數
      del(0), // Info: 第 0 行為設定列（title）
      edit(1, "CFG", 1, 1), // Info: 第 1 行為設定列（xaxis）
    ];
    const run = () => applyHistogramActions(RAW, actions);
    expect(run).not.toThrow();
    expect(run()).toBe(RAW);
  });

  /* Info: (20260731 - Julian)
   ** 防禦性編程：applyHistogramActions 為對外匯出的公開函式，於邊界驗證輸入。
   ** 目前 newLineIndex 一律由 UI 的 posToLineIndex 推導（必為整數），此路徑不可達；
   ** 固化此不變式是為了防止「先 tombstone 後 pushInsert」的不對稱在日後被改回去——
   ** 一旦 newLineIndex 非整數，來源列會被刪掉卻不插回，該列靜默消失且不拋錯。 */
  it.each([
    ["NaN", Number.NaN],
    ["小數", 2.5],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])(
    "EDIT 的 newLineIndex 為 %s 時整個動作略過，來源列不得消失",
    (_label, badIndex) => {
      const out = applyHistogramActions(RAW, [edit(4, "C", 99, badIndex)]);
      // Info: (20260731 - Julian) 關鍵：C 必須原樣保留，不可被刪掉也不可變成 99
      expect(out).toBe(RAW);
      expect(out).toContain("C, 2");
      expect(out).not.toContain("C, 99");
    },
  );

  it("ADD 的 lineIndex 為非整數時略過，不產生幽靈列", () => {
    expect(applyHistogramActions(RAW, [add("GHOST", 1, Number.NaN)])).toBe(RAW);
    expect(applyHistogramActions(RAW, [add("GHOST", 1, 2.5)])).toBe(RAW);
  });

  it("ADD 的 lineIndex 超界時夾限為附加於尾端（不錯位、不 throw）", () => {
    const out = applyHistogramActions(RAW, [add("Z", 1, 999)]);
    expect(out).toBe(
      [
        "title: Scores",
        "xaxis: bucket",
        "A, 3",
        "B, 5",
        "C, 2",
        "D, 8",
        "Z, 1",
      ].join("\n"),
    );
  });
});

describe("applyHistogramActions - 設定列動作（軸標題 / 趨勢線）延後套用", () => {
  it("EDIT_AXIS 與資料列刪除同批：軸設定正確、資料列刪除正確", () => {
    const out = applyHistogramActions(RAW, [
      del(3), // Info: 刪 B
      {
        id: uid(40),
        description: "axis",
        type: HistogramActionType.EDIT_AXIS,
        payload: { xAxis: "score", yAxis: "count" },
      },
    ]);
    const lines = out.split("\n");
    expect(lines).toContain("xaxis: score");
    expect(lines).toContain("yaxis: count");
    expect(parseHistogramBins(out).map((b) => b.label)).toEqual([
      "A",
      "C",
      "D",
    ]);
  });

  it("SWITCH_TREND_LINE 開啟寫入 trend + trendcolor；關閉移除兩者", () => {
    const on = applyHistogramActions(RAW, [
      {
        id: uid(41),
        description: "trend on",
        type: HistogramActionType.SWITCH_TREND_LINE,
        payload: { trend: HistogramTrendType.NORMAL, trendColor: "#E11D48" },
      },
    ]);
    expect(on.split("\n")).toContain("trend: normal");
    expect(on.split("\n")).toContain("trendcolor: #E11D48");

    const off = applyHistogramActions(on, [
      {
        id: uid(42),
        description: "trend off",
        type: HistogramActionType.SWITCH_TREND_LINE,
        payload: {},
      },
    ]);
    expect(off.split("\n").some((l) => l.startsWith("trend:"))).toBe(false);
    expect(off.split("\n").some((l) => l.startsWith("trendcolor:"))).toBe(
      false,
    );
  });
});

describe("applyHistogramActions - 不可變性與單發委派", () => {
  it("套用動作不變更輸入字串；空動作清單原樣返回", () => {
    const before = RAW;
    applyHistogramActions(RAW, [del(3)]);
    expect(RAW).toBe(before);
    expect(applyHistogramActions(RAW, [])).toBe(RAW);
  });

  it("applyHistogramAction 單發 = 批次套用單一動作", () => {
    const action = edit(2, "A", 30, 2);
    expect(applyHistogramAction(RAW, action)).toBe(
      applyHistogramActions(RAW, [action]),
    );
  });
});
