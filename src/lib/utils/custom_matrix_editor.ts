import {
  CustomChartType,
  CustomChartConfigKey,
  MatrixActionType,
  CUSTOM_CHART_COMMENT_PREFIX,
  CUSTOM_CHART_AXIS_SEPARATORS,
} from "@/constants/custom_chart";
import {
  IMatrixItem,
  IMatrixParseResult,
  IMatrixAction,
} from "@/interfaces/custom_chart";
import { parseCsvLine } from "@/lib/utils/csv";
import { parseCustomChart } from "@/lib/utils/custom_chart_parser";

/**
 * Info: (20260721 - Julian)
 * 矩陣圖（custom-matrix）結構化編輯引擎。
 * 設計對應 mermaid_helpers 的 Sankey 系列：以 lineIndex 定位資料列、
 * 附加式新增以避免影響既有行號，純字串操作、決定論、不呼叫 LLM、不做數值計算。
 */

/**
 * Info: (20260721 - Julian)
 * 矩陣圖的設定列 key（對應 custom_chart_parser 的 CONFIG_KEYS_BY_TYPE[MATRIX]）；
 * 以列舉值組成，避免魔法字串。用來在編輯時區分「設定列」與「資料列」。
 */
const MATRIX_CONFIG_KEYS: ReadonlySet<string> = new Set<string>([
  CustomChartConfigKey.TITLE,
  CustomChartConfigKey.X_AXIS,
  CustomChartConfigKey.Y_AXIS,
  CustomChartConfigKey.X_SCALE,
  CustomChartConfigKey.Y_SCALE,
  CustomChartConfigKey.QUADRANT_COLORS,
]);

// Info: (20260721 - Julian) 雙極軸序列化採用的分隔符（左為 min 端、右為 max 端）
const AXIS_SEPARATOR = CUSTOM_CHART_AXIS_SEPARATORS[0];

/**
 * Info: (20260721 - Julian)
 * 將單一欄位序列化為 CSV（RFC 4180）：若含逗號、雙引號、換行或前後空白，
 * 則以雙引號包夾並將內部引號跳脫為 ""；與 parseCsvLine 對稱，可安全來回。
 */
const formatCsvField = (field: string): string => {
  const needsQuote = /[",\r\n]/.test(field) || field !== field.trim();
  return needsQuote ? `"${field.replace(/"/g, '""')}"` : field;
};

/**
 * Info: (20260721 - Julian)
 * 組合一行矩陣資料列（label, x, y[, group[, color]]）。座標原樣輸出（不做任何運算）。
 * 顏色為群組層級屬性，僅在有群組時才輸出（無群組的點不帶顏色）。
 */
const buildMatrixDataLine = (
  label: string,
  x: number,
  y: number,
  group?: string,
  color?: string,
): string => {
  let line = `${formatCsvField(label)}, ${x}, ${y}`;
  if (group && group.trim() !== "") {
    line += `, ${formatCsvField(group)}`;
    if (color && color.trim() !== "") {
      line += `, ${formatCsvField(color)}`;
    }
  }
  return line;
};

/**
 * Info: (20260721 - Julian)
 * 判斷指定原始行是否為矩陣圖「設定列」（key: value，且 key 屬白名單、冒號在逗號之前）。
 * 判定規則與 custom_chart_parser.preprocess 一致。
 */
const isMatrixConfigLine = (rawLine: string): boolean => {
  const line = rawLine.trim();
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return false;
  const commaIdx = line.indexOf(",");
  if (commaIdx !== -1 && colonIdx > commaIdx) return false;
  const key = line.slice(0, colonIdx).trim().toLowerCase();
  return MATRIX_CONFIG_KEYS.has(key);
};

/**
 * Info: (20260721 - Julian)
 * 判斷指定原始行是否為可編輯的矩陣「資料列」；
 * 是則回傳解析後欄位（至少 label, x, y 且 x/y 為有效數字），否則回傳 null。
 */
const getMatrixLineFields = (rawLine: string): string[] | null => {
  const line = rawLine.trim();
  if (
    !line ||
    line.startsWith(CUSTOM_CHART_COMMENT_PREFIX) ||
    isMatrixConfigLine(line)
  ) {
    return null;
  }
  const fields = parseCsvLine(line);
  if (fields.length < 3 || fields[0] === "") return null;
  if (
    !Number.isFinite(Number(fields[1])) ||
    !Number.isFinite(Number(fields[2]))
  ) {
    return null;
  }
  return fields;
};

/**
 * Info: (20260721 - Julian)
 * 尋找第一筆「資料列」的行號（用於在無現有軸設定時插入新的軸設定列之前）。
 */
const findFirstDataLineIndex = (lines: string[]): number =>
  lines.findIndex((line) => getMatrixLineFields(line) !== null);

/**
 * Info: (20260721 - Julian)
 * 解析矩陣圖所有資料點（附原始行號），供編輯／刪除工具以 lineIndex 精準定位。
 * 容錯：略過空行、註解、設定列與格式錯誤列（永不 throw）。
 */
export const parseMatrixItems = (raw: string): IMatrixItem[] => {
  if (!raw || typeof raw !== "string") return [];

  const items: IMatrixItem[] = [];
  raw.split("\n").forEach((line, lineIndex) => {
    const fields = getMatrixLineFields(line);
    if (!fields) return;
    const group = fields[3]?.trim() || undefined;
    items.push({
      label: fields[0],
      x: Number(fields[1]),
      y: Number(fields[2]),
      ...(group ? { group } : {}),
      lineIndex,
    });
  });
  return items;
};

/**
 * Info: (20260721 - Julian)
 * 依首次出現順序蒐集不重複的群組（略過未分組項目）。
 * 順序與 MatrixChart 建立 groupColors 的順序一致，避免圖例配色錯位。
 */
const collectGroups = (items: IMatrixItem[]): string[] => {
  const seen = new Set<string>();
  const groups: string[] = [];
  items.forEach(({ group }) => {
    if (group && !seen.has(group)) {
      seen.add(group);
      groups.push(group);
    }
  });
  return groups;
};

/**
 * Info: (20260721 - Julian)
 * 解析矩陣圖工具列所需資料：帶行號的資料點 + 群組清單 + 兩軸雙極端點文字。
 * 軸文字沿用 parseCustomChart 的結果（相容 VS16、多種分隔符），避免解析邏輯分歧；
 * 若整體解析失敗（如缺資料列），軸退回空物件、items/groups 仍以容錯方式解析。
 */
export const parseMatrixData = (raw: string): IMatrixParseResult => {
  const items = parseMatrixItems(raw);
  const groups = collectGroups(items);
  const result = parseCustomChart(CustomChartType.MATRIX, raw);
  if (result.ok && result.ast.type === CustomChartType.MATRIX) {
    const { title, xAxis, yAxis, groupColors, quadrantColors } = result.ast;
    return {
      items,
      groups,
      groupColors: groupColors ?? {},
      quadrantColors: quadrantColors ?? [],
      xAxis,
      yAxis,
      ...(title ? { title } : {}),
    };
  }
  return {
    items,
    groups,
    groupColors: {},
    quadrantColors: [],
    xAxis: {},
    yAxis: {},
  };
};

/**
 * Info: (20260721 - Julian)
 * 由 min/max 端點文字組合雙極軸設定值：
 * 兩端皆有 → 「min ↔ max」；僅 max → 「max」；僅 min → 「min ↔」；皆空 → 空字串（代表移除）。
 */
const buildAxisValue = (min: string, max: string): string => {
  const mn = min.trim();
  const mx = max.trim();
  if (mn && mx) return `${mn} ${AXIS_SEPARATOR} ${mx}`;
  if (mx) return mx;
  if (mn) return `${mn} ${AXIS_SEPARATOR}`;
  return "";
};

/**
 * Info: (20260721 - Julian)
 * 更新（或插入／移除）指定的設定列（key: value）。value 為空字串時移除該設定列。
 * 直接就地修改傳入的 lines 陣列。供軸線、象限底色等所有設定列共用。
 */
const setConfigLine = (
  lines: string[],
  key: CustomChartConfigKey,
  value: string,
): void => {
  const idx = lines.findIndex((line) => {
    const clean = line.trim();
    const colonIdx = clean.indexOf(":");
    return (
      colonIdx !== -1 && clean.slice(0, colonIdx).trim().toLowerCase() === key
    );
  });

  if (value === "") {
    if (idx !== -1) lines.splice(idx, 1);
    return;
  }

  const newLine = `${key}: ${value}`;
  if (idx !== -1) {
    lines[idx] = newLine;
    return;
  }
  // Info: (20260721 - Julian) 無現有設定列 → 插入到第一筆資料列之前（維持設定在上、資料在下的慣例）
  const dataIdx = findFirstDataLineIndex(lines);
  if (dataIdx === -1) {
    lines.push(newLine);
  } else {
    lines.splice(dataIdx, 0, newLine);
  }
};

/**
 * Info: (20260725 - Luphia)
 * 將「一批」結構化動作決定論地套用到矩陣圖 DSL 字串，回傳新字串（不變更輸入）。
 *
 * 穩定索引策略（解決 stacked-actions 的 lineIndex 位移問題）：
 * 動作攜帶的 lineIndex／memberLineIndexes 皆以「原始 raw」的行號為準。若逐一 splice 刪除，
 * 會使後續動作的行號失準（先刪後編會打到錯誤資料列）。故本函式在整批套用期間「不 splice 原始行」：
 *   1. 資料列動作：編輯就地覆寫、新增附加於尾端、刪除僅標記 tombstone；原始行號整批維持不變。
 *   2. 全部資料列動作完成後，才一次實體移除被標記刪除的原始行。
 *   3. 設定列動作（軸線／象限底色）最後才套用：僅影響設定列，且可能插入新設定列，
 *      延後到資料列索引不再被引用之後，避免插入造成的位移。
 * 資料列與設定列互不重疊，重排兩者相對順序不影響結果，故此策略為決定論且與單一動作語意一致。
 * 定位失敗或已刪除的目標一律略過（Fail Safe），確保 render 不崩潰。
 */
export const applyMatrixActions = (
  raw: string,
  actions: readonly IMatrixAction[],
): string => {
  const lines = raw.split("\n");
  const originalLength = lines.length;
  // Info: (20260725 - Luphia) 被標記刪除的「原始行號」集合；套用期間不 splice，維持索引穩定
  const deleted = new Set<number>();
  // Info: (20260725 - Luphia) 設定列動作延後套用（見上方策略第 3 點）
  const configActions: IMatrixAction[] = [];

  // Info: (20260725 - Luphia) 原始行號 idx 是否可作為資料列編輯／刪除目標（在原始範圍內、未刪除、確為資料列）
  const isTargetableDataLine = (idx: number): boolean =>
    Number.isInteger(idx) &&
    idx >= 0 &&
    idx < originalLength &&
    !deleted.has(idx) &&
    getMatrixLineFields(lines[idx]) !== null;

  actions.forEach((action) => {
    switch (action.type) {
      case MatrixActionType.ADD_ITEM: {
        // Info: (20260721 - Julian) 附加到尾端，附加行不佔用原始行號，不影響既有 lineIndex
        const { label, x, y, group } = action.payload;
        lines.push(buildMatrixDataLine(label, x, y, group));
        break;
      }

      case MatrixActionType.EDIT_ITEM: {
        const { lineIndex, label, x, y, group } = action.payload;
        if (!isTargetableDataLine(lineIndex)) break;
        const fields = getMatrixLineFields(lines[lineIndex])!;
        // Info: (20260721 - Julian) 群組未變才保留原顏色；改群組時捨棄顏色，讓其套用新群組的顏色
        const prevGroup = fields[3]?.trim() || undefined;
        const prevColor = fields[4]?.trim() || undefined;
        const color = group && group === prevGroup ? prevColor : undefined;
        lines[lineIndex] = buildMatrixDataLine(label, x, y, group, color);
        break;
      }

      case MatrixActionType.EDIT_GROUP: {
        /**
         * Info: (20260721 - Julian) 一次套用成員組成與顏色：
         * - 成員列：設群組為 group，並套用顏色（有提供 color 則統一；否則沿用原屬此群組時的既有顏色）
         * - 原屬此群組但不在成員清單者：移出群組（清除群組與顏色，成為未分組點）
         * - 其餘資料列不動
         * memberLineIndexes 以原始行號為準，故僅巡覽原始行（附加行不參與分組編輯）。
         */
        const { group, memberLineIndexes, color } = action.payload;
        if (!group) break;
        const memberSet = new Set(memberLineIndexes);
        for (let idx = 0; idx < originalLength; idx += 1) {
          if (!deleted.has(idx)) {
            const fields = getMatrixLineFields(lines[idx]);
            if (fields) {
              const curGroup = fields[3]?.trim() || undefined;
              const label = fields[0];
              const x = Number(fields[1]);
              const y = Number(fields[2]);
              if (memberSet.has(idx)) {
                const keptColor =
                  curGroup === group
                    ? fields[4]?.trim() || undefined
                    : undefined;
                const rowColor =
                  color && color.trim() !== "" ? color : keptColor;
                lines[idx] = buildMatrixDataLine(label, x, y, group, rowColor);
              } else if (curGroup === group) {
                // Info: (20260721 - Julian) 移出群組 → 取消分組（連同顏色一併清除）
                lines[idx] = buildMatrixDataLine(label, x, y);
              }
            }
          }
        }
        break;
      }

      case MatrixActionType.DELETE_ITEM: {
        const { lineIndex, group } = action.payload;

        // Info: (20260721 - Julian) 刪除單一項目（以 lineIndex 定位；0 為合法行號）；僅標記，不 splice
        if (lineIndex !== undefined && isTargetableDataLine(lineIndex)) {
          deleted.add(lineIndex);
        }

        // Info: (20260721 - Julian) 刪除整個分組：標記該分組所有資料列
        if (group) {
          for (let i = 0; i < originalLength; i += 1) {
            if (!deleted.has(i)) {
              const fields = getMatrixLineFields(lines[i]);
              if (fields && (fields[3]?.trim() || "") === group) {
                deleted.add(i);
              }
            }
          }
        }

        break;
      }

      case MatrixActionType.EDIT_AXIS:
      case MatrixActionType.CHANGE_QUADRANT_COLOR: {
        // Info: (20260725 - Luphia) 設定列動作延後套用
        configActions.push(action);
        break;
      }

      default:
        break;
    }
  });

  // Info: (20260725 - Luphia) 資料列動作完成 → 一次實體移除被標記刪除的原始行（附加行不在集合中，一律保留）
  const materialized = lines.filter((_, idx) => !deleted.has(idx));

  // Info: (20260725 - Luphia) 最後套用設定列動作（此時資料列索引已不再被引用，插入設定列不致位移）
  configActions.forEach((action) => {
    if (action.type === MatrixActionType.EDIT_AXIS) {
      const { xMin, yMin, xMax, yMax } = action.payload;
      setConfigLine(
        materialized,
        CustomChartConfigKey.X_AXIS,
        buildAxisValue(xMin ?? "", xMax ?? ""),
      );
      setConfigLine(
        materialized,
        CustomChartConfigKey.Y_AXIS,
        buildAxisValue(yMin ?? "", yMax ?? ""),
      );
    } else if (action.type === MatrixActionType.CHANGE_QUADRANT_COLOR) {
      // Info: (20260721 - Julian) 以單一設定列存 Q1..Q4 底色（逗號分隔 HEX）
      const { colors } = action.payload;
      const value = colors
        .map((c) => c.trim())
        .filter((c) => c !== "")
        .join(", ");
      setConfigLine(materialized, CustomChartConfigKey.QUADRANT_COLORS, value);
    }
  });

  return materialized.join("\n");
};

/**
 * Info: (20260721 - Julian)
 * 將單一結構化動作決定論地套用到矩陣圖 DSL 字串，回傳新字串（不變更輸入）。
 * 委派批次引擎，語意與 applyMatrixActions 完全一致（保留既有呼叫端 API）。
 */
export const applyMatrixAction = (raw: string, action: IMatrixAction): string =>
  applyMatrixActions(raw, [action]);
