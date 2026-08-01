import {
  CustomChartType,
  CustomChartConfigKey,
  TornadoActionType,
  CUSTOM_CHART_COMMENT_PREFIX,
  CUSTOM_CHART_PAIR_SEPARATORS,
  CUSTOM_CHART_TORNADO_HEADER_SEPARATOR,
} from "@/constants/custom_chart";
import {
  ITornadoItem,
  ITornadoParseResult,
  ITornadoAction,
} from "@/interfaces/custom_chart";
import { parseCsvLine } from "@/lib/utils/csv";
import {
  parseCustomChart,
  isNumericField,
  isTornadoHeaderFields,
  getTornadoHeaderSeries,
} from "@/lib/utils/custom_chart_parser";

/**
 * Info: (20260722 - Julian)
 * 龍捲風圖（custom-tornado）結構化編輯引擎。
 * 設計對應 custom_matrix_editor：以 lineIndex 定位資料列、附加式新增避免影響既有行號，
 * 純字串操作、決定論、不呼叫 LLM、不做數值計算。
 * 數列名稱以「標頭列」表示（category, leftSeries, rightSeries）；顏色/基準線/單位以設定列表示。
 */

// Info: (20260722 - Julian) 龍捲風圖設定列 key（對應 parser 的 CONFIG_KEYS_BY_TYPE[TORNADO]）
const TORNADO_CONFIG_KEYS: ReadonlySet<string> = new Set<string>([
  CustomChartConfigKey.TITLE,
  CustomChartConfigKey.UNIT,
  CustomChartConfigKey.MODE,
  CustomChartConfigKey.BASELINE,
  CustomChartConfigKey.LEFT_COLOR,
  CustomChartConfigKey.RIGHT_COLOR,
]);

// Info: (20260731 - Julian) 標題列序列化採用的配對分隔符
const PAIR_SEPARATOR = CUSTOM_CHART_TORNADO_HEADER_SEPARATOR;

/**
 * Info: (20260731 - Julian)
 * 數列名稱是否含任一配對分隔符。含分隔符的名稱寫入標題列後無法 round-trip：
 * 例如 `A<->B` 與 `C` 會串成 `A<->B <-> C`，讀回時分成三段而被 parser 拒絕。
 * 依 §6 Fail Fast 於邊界擋下，不產生自己讀不回來的字串。
 */
const containsPairSeparator = (name: string): boolean =>
  CUSTOM_CHART_PAIR_SEPARATORS.some((sep) => name.includes(sep));

const formatCsvField = (field: string): string => {
  const needsQuote = /[",\r\n]/.test(field) || field !== field.trim();
  return needsQuote ? `"${field.replace(/"/g, '""')}"` : field;
};

const buildTornadoDataLine = (
  category: string,
  left: number,
  right: number,
): string => `${formatCsvField(category)}, ${left}, ${right}`;

/**
 * Info: (20260731 - Julian)
 * 一律輸出新式標題列 `左數列 <-> 右數列`：與 3 欄資料列結構互斥，不再有同形歧義。
 * 既有的 legacy 三欄標題列會在使用者編輯時自然遷移為此形式。
 * 含逗號的數列名需引號包夾，否則會被 parseCsvLine 拆成多欄而失去「單一欄位」的判定前提。
 */
const buildHeaderLine = (leftSeries: string, rightSeries: string): string =>
  formatCsvField(`${leftSeries} ${PAIR_SEPARATOR} ${rightSeries}`);

/**
 * Info: (20260722 - Julian) 是否為設定列（key: value，key 屬白名單、冒號在逗號之前）
 */
const isTornadoConfigLine = (rawLine: string): boolean => {
  const line = rawLine.trim();
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return false;
  const commaIdx = line.indexOf(",");
  if (commaIdx !== -1 && colonIdx > commaIdx) return false;
  return TORNADO_CONFIG_KEYS.has(line.slice(0, colonIdx).trim().toLowerCase());
};

/**
 * Info: (20260722 - Julian) 是否為「內容列」（非空、非註解、非設定列）；標頭列與資料列皆屬之
 */
const isContentLine = (rawLine: string): boolean => {
  const line = rawLine.trim();
  return (
    line !== "" &&
    !line.startsWith(CUSTOM_CHART_COMMENT_PREFIX) &&
    !isTornadoConfigLine(line)
  );
};

/**
 * Info: (20260722 - Julian)
 * 回傳可編輯的「資料列」欄位（category, left, right 且左右為有效數字），否則 null（含標頭列）
 */
const getTornadoBarFields = (rawLine: string): string[] | null => {
  if (!isContentLine(rawLine)) return null;
  const fields = parseCsvLine(rawLine.trim());
  if (fields.length < 3 || fields[0] === "") return null;
  if (!isNumericField(fields[1]) || !isNumericField(fields[2])) return null;
  return fields;
};

const findFirstContentIndex = (lines: string[]): number =>
  lines.findIndex((line) => isContentLine(line));

/**
 * Info: (20260722 - Julian)
 * 解析所有資料列（附原始行號），略過設定列、註解、空行與標頭列（永不 throw）
 */
export const parseTornadoBars = (raw: string): ITornadoItem[] => {
  if (!raw || typeof raw !== "string") return [];
  const lines = raw.split("\n");
  const firstIdx = findFirstContentIndex(lines);

  const items: ITornadoItem[] = [];
  lines.forEach((line, lineIndex) => {
    if (!isContentLine(line)) return;
    // Info: (20260722 - Julian) 首個內容列若為標頭列則略過（不計入資料列）
    if (
      lineIndex === firstIdx &&
      isTornadoHeaderFields(parseCsvLine(line.trim()))
    ) {
      return;
    }
    const bar = getTornadoBarFields(line);
    if (!bar) return;
    items.push({
      category: bar[0],
      left: Number(bar[1]),
      right: Number(bar[2]),
      lineIndex,
    });
  });
  return items;
};

/**
 * Info: (20260722 - Julian)
 * 解析龍捲風圖工具列所需資料：資料列（帶行號）＋數列名稱／顏色／基準線／單位＋是否已有標頭列。
 * metadata 沿用 parseCustomChart 結果，避免解析邏輯分歧；解析失敗時退回以標頭列推導名稱。
 */
export const parseTornadoData = (raw: string): ITornadoParseResult => {
  const bars = parseTornadoBars(raw);
  const lines = raw.split("\n");
  const firstIdx = findFirstContentIndex(lines);
  const hasHeader =
    firstIdx !== -1 &&
    isTornadoHeaderFields(parseCsvLine(lines[firstIdx].trim()));

  const result = parseCustomChart(CustomChartType.TORNADO, raw);
  if (result.ok && result.ast.type === CustomChartType.TORNADO) {
    const {
      title,
      unit,
      mode,
      baseline,
      leftSeries,
      rightSeries,
      leftColor,
      rightColor,
    } = result.ast;
    return {
      bars,
      hasHeader,
      title,
      unit,
      mode,
      baseline,
      leftSeries,
      rightSeries,
      leftColor,
      rightColor,
    };
  }

  // Info: (20260722 - Julian) 解析失敗（如缺資料列）：仍以標頭列推導名稱，其餘留空
  let leftSeries: string | undefined;
  let rightSeries: string | undefined;
  if (hasHeader) {
    // Info: (20260731 - Julian) 沿用 parser 的共用取值函式，確保新式與 legacy 兩種形式行為一致
    const series = getTornadoHeaderSeries(parseCsvLine(lines[firstIdx].trim()));
    leftSeries = series?.leftSeries;
    rightSeries = series?.rightSeries;
  }
  return { bars, hasHeader, leftSeries, rightSeries };
};

/**
 * Info: (20260722 - Julian)
 * 更新（或插入／移除）指定設定列（key: value）。value 為空字串時移除該設定列。就地修改 lines。
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
  // Info: (20260722 - Julian) 無現有設定列 → 插入到第一筆內容列（標頭/資料）之前，維持設定在上
  const contentIdx = findFirstContentIndex(lines);
  if (contentIdx === -1) {
    lines.push(newLine);
  } else {
    lines.splice(contentIdx, 0, newLine);
  }
};

/**
 * Info: (20260730 - Julian) 於 materialized（已移除刪除列）套用「數列標頭列」：有標頭則改寫（保留類別欄），否則於首筆內容列前插入
 */
const applyGroupHeader = (
  lines: string[],
  leftSeries: string,
  rightSeries: string,
): void => {
  const contentIdx = findFirstContentIndex(lines);
  if (contentIdx === -1) {
    lines.push(buildHeaderLine(leftSeries, rightSeries));
    return;
  }
  const firstFields = parseCsvLine(lines[contentIdx].trim());
  if (isTornadoHeaderFields(firstFields)) {
    // Info: (20260731 - Julian) 既有標題列（新式或 legacy 三欄）一律改寫為新式，達成漸進遷移
    lines[contentIdx] = buildHeaderLine(leftSeries, rightSeries);
  } else {
    lines.splice(contentIdx, 0, buildHeaderLine(leftSeries, rightSeries));
  }
};

/**
 * Info: (20260730 - Julian)
 * 將「一批」結構化動作決定論地套用到龍捲風圖 DSL 字串，回傳新字串（不變更輸入）。
 *
 * 穩定索引策略（解決 stacked-actions 的 lineIndex 位移問題，比照 applyMatrixActions）：
 * 動作攜帶的 lineIndex 皆以「原始 raw」行號為準。套用期間不 splice 原始行：
 *   1. 資料列動作：編輯就地覆寫、新增附加於尾端、刪除僅標記 tombstone；原始行號整批維持不變。
 *   2. 全部資料列動作完成後，才一次實體移除被標記刪除的原始行。
 *   3. 設定列／標頭動作（EDIT_SETTINGS／EDIT_GROUP，可能插入新行）最後才套用，避免插入造成位移。
 * 定位失敗或已刪除的目標一律略過（Fail Safe）。
 */
export const applyTornadoActions = (
  raw: string,
  actions: readonly ITornadoAction[],
): string => {
  const lines = raw.split("\n");
  const originalLength = lines.length;
  const deleted = new Set<number>();
  const appended: string[] = [];
  const configActions: ITornadoAction[] = [];

  // Info: (20260730 - Julian) 原始行號 idx 是否可作為資料列編輯／刪除目標
  const isTargetableDataLine = (idx: number): boolean =>
    Number.isInteger(idx) &&
    idx >= 0 &&
    idx < originalLength &&
    !deleted.has(idx) &&
    getTornadoBarFields(lines[idx]) !== null;

  actions.forEach((action) => {
    switch (action.type) {
      case TornadoActionType.ADD_ITEM: {
        // Info: (20260722 - Julian) 附加到尾端，不佔用原始行號
        const { category, left, right } = action.payload;
        appended.push(buildTornadoDataLine(category, left, right));
        break;
      }
      case TornadoActionType.EDIT_ITEM: {
        const { lineIndex, category, left, right } = action.payload;
        if (!isTargetableDataLine(lineIndex)) break;
        lines[lineIndex] = buildTornadoDataLine(category, left, right);
        break;
      }
      case TornadoActionType.DELETE_ITEM: {
        const { lineIndex } = action.payload;
        if (isTargetableDataLine(lineIndex)) deleted.add(lineIndex);
        break;
      }
      case TornadoActionType.EDIT_SETTINGS:
      case TornadoActionType.EDIT_GROUP: {
        // Info: (20260730 - Julian) 設定列／標頭動作延後套用
        configActions.push(action);
        break;
      }
      default:
        break;
    }
  });

  // Info: (20260730 - Julian) 一次實體移除被標記刪除的原始行，再接上附加行
  const materialized = lines
    .filter((_, idx) => !deleted.has(idx))
    .concat(appended);

  // Info: (20260730 - Julian) 最後套用設定列／標頭動作（此時資料列索引已不再被引用）
  configActions.forEach((action) => {
    if (action.type === TornadoActionType.EDIT_SETTINGS) {
      const { mode, unit, baseline } = action.payload;
      if (mode !== undefined) {
        setConfigLine(materialized, CustomChartConfigKey.MODE, mode);
      }
      if (unit !== undefined) {
        setConfigLine(materialized, CustomChartConfigKey.UNIT, unit.trim());
      }
      if (baseline !== undefined) {
        setConfigLine(
          materialized,
          CustomChartConfigKey.BASELINE,
          String(baseline),
        );
      }
    } else if (action.type === TornadoActionType.EDIT_GROUP) {
      const { leftSeries, rightSeries, leftColor, rightColor } = action.payload;
      if (leftColor !== undefined) {
        setConfigLine(
          materialized,
          CustomChartConfigKey.LEFT_COLOR,
          leftColor.trim(),
        );
      }
      if (rightColor !== undefined) {
        setConfigLine(
          materialized,
          CustomChartConfigKey.RIGHT_COLOR,
          rightColor.trim(),
        );
      }
      // Info: (20260731 - Julian) 數列名含分隔符會產生無法 round-trip 的標題列，
      // Info: (20260731 - Julian) 故僅略過標頭改寫（顏色設定仍照常套用），不讓髒資料進入 DSL
      if (
        !containsPairSeparator(leftSeries) &&
        !containsPairSeparator(rightSeries)
      ) {
        applyGroupHeader(materialized, leftSeries, rightSeries);
      }
    }
  });

  return materialized.join("\n");
};

/**
 * Info: (20260723 - Julian)
 * 將單一結構化動作套用到龍捲風圖 DSL 字串（委派批次引擎，語意一致，保留既有呼叫端 API）。
 */
export const applyTornadoAction = (
  raw: string,
  action: ITornadoAction,
): string => applyTornadoActions(raw, [action]);
