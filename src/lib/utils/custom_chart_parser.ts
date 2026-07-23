import { z } from "zod";
import {
  CustomChartType,
  CustomChartConfigKey,
  CustomChartParseErrorCode,
  HistogramTrendType,
  CUSTOM_CHART_COMMENT_PREFIX,
  CUSTOM_CHART_AXIS_SEPARATORS,
  HEX_COLOR_REGEX,
} from "@/constants/custom_chart";
import {
  ICustomChartAxis,
  ICustomChartAst,
  ICustomChartParseResult,
  ICustomMatrixAst,
  ICustomTornadoAst,
  ICustomHistogramAst,
  ICustomBoxAst,
} from "@/interfaces/custom_chart";
import { parseCsvLine } from "@/lib/utils/csv";

// Info: (20260717 - Julian) 防呆上限，避免超大輸入拖垮解析
const MAX_INPUT_LENGTH = 20000;
const MAX_DATA_ROWS = 1000;

// Info: (20260717 - Julian) 各圖表允許的設定 key，用來區分設定列與資料列
const CONFIG_KEYS_BY_TYPE: Record<CustomChartType, Set<string>> = {
  [CustomChartType.MATRIX]: new Set<string>([
    CustomChartConfigKey.TITLE,
    CustomChartConfigKey.X_AXIS,
    CustomChartConfigKey.Y_AXIS,
    CustomChartConfigKey.X_SCALE,
    CustomChartConfigKey.Y_SCALE,
    CustomChartConfigKey.QUADRANT_COLORS,
  ]),
  [CustomChartType.TORNADO]: new Set<string>([
    CustomChartConfigKey.TITLE,
    CustomChartConfigKey.UNIT,
    CustomChartConfigKey.BASELINE,
    CustomChartConfigKey.LEFT_COLOR,
    CustomChartConfigKey.RIGHT_COLOR,
  ]),
  [CustomChartType.HISTOGRAM]: new Set<string>([
    CustomChartConfigKey.TITLE,
    CustomChartConfigKey.X_AXIS,
    CustomChartConfigKey.Y_AXIS,
    CustomChartConfigKey.TREND,
  ]),
  [CustomChartType.BOXPLOT]: new Set<string>([
    CustomChartConfigKey.TITLE,
    CustomChartConfigKey.Y_AXIS,
    CustomChartConfigKey.UNIT,
  ]),
};

/**
 * Info: (20260717 - Julian) 內部解析錯誤，攜帶錯誤碼；於公開 API 邊界轉為結果物件，對外永不 throw
 */
class CustomChartParseError extends Error {
  public readonly code: CustomChartParseErrorCode;

  constructor(code: CustomChartParseErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const malformed = (message: string): CustomChartParseError =>
  new CustomChartParseError(CustomChartParseErrorCode.MALFORMED_ROW, message);

/**
 * Info: (20260717 - Julian) 將字串轉為有限數字；空字串或非數字則拋 INVALID_NUMBER（不做任何計算）
 */
const toNumber = (raw: string, ctx: string): number => {
  const trimmed = raw.trim();
  const n = Number(trimmed);
  if (trimmed === "" || !Number.isFinite(n)) {
    throw new CustomChartParseError(
      CustomChartParseErrorCode.INVALID_NUMBER,
      `「${ctx}」不是有效數字：「${raw}」`,
    );
  }
  return n;
};

const optionalNumber = (
  raw: string | undefined,
  ctx: string,
): number | undefined => (raw === undefined ? undefined : toNumber(raw, ctx));

/**
 * Info: (20260720 - Julian) 判斷欄位是否為有效數字（供龍捲風圖偵測標題列 vs 資料列，不做計算）
 */
const isNumericField = (raw: string | undefined): boolean => {
  if (raw === undefined) return false;
  const trimmed = raw.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed));
};

/**
 * Info: (20260717 - Julian)
 * 解析雙極軸文字：分隔符左邊為 min 端、右邊為 max 端（順序即語意）。
 * 先移除 VS16（emoji 變體選擇符）以相容 ↔️。無分隔符則整串視為 max 端標籤。
 */
const parseAxis = (
  value: string,
  scale: number | undefined,
): ICustomChartAxis => {
  const cleaned = value.replace(/️/g, "").trim();
  const axis: ICustomChartAxis = {};
  if (scale !== undefined) axis.scale = scale;

  for (const sep of CUSTOM_CHART_AXIS_SEPARATORS) {
    const idx = cleaned.indexOf(sep);
    if (idx !== -1) {
      const min = cleaned.slice(0, idx).trim();
      const max = cleaned.slice(idx + sep.length).trim();
      if (min) axis.min = min;
      if (max) axis.max = max;
      return axis;
    }
  }

  if (cleaned) axis.max = cleaned;
  return axis;
};

/**
 * Info: (20260717 - Julian)
 * 前處理：正規化換行、去註解與空行、逐行 trim，並分流設定列（key: value）與資料列（CSV）。
 * 設定列判定：冒號在逗號之前，且冒號前的 key 屬於該圖表的白名單。
 */
const preprocess = (
  type: CustomChartType,
  raw: string,
): { config: Map<string, string>; dataLines: string[] } => {
  const allowed = CONFIG_KEYS_BY_TYPE[type];
  const config = new Map<string, string>();
  const dataLines: string[] = [];

  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(CUSTOM_CHART_COMMENT_PREFIX)) continue;

    const colonIdx = line.indexOf(":");
    const commaIdx = line.indexOf(",");
    const isConfig =
      colonIdx !== -1 &&
      (commaIdx === -1 || colonIdx < commaIdx) &&
      allowed.has(line.slice(0, colonIdx).trim().toLowerCase());

    if (isConfig) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();
      config.set(key, value);
    } else {
      dataLines.push(line);
    }
  }

  return { config, dataLines };
};

const buildMatrix = (
  config: Map<string, string>,
  dataLines: string[],
): ICustomMatrixAst => {
  const title = config.get(CustomChartConfigKey.TITLE) || undefined;
  const xScale = optionalNumber(
    config.get(CustomChartConfigKey.X_SCALE),
    "xScale",
  );
  const yScale = optionalNumber(
    config.get(CustomChartConfigKey.Y_SCALE),
    "yScale",
  );
  const xAxis = parseAxis(
    config.get(CustomChartConfigKey.X_AXIS) ?? "",
    xScale,
  );
  const yAxis = parseAxis(
    config.get(CustomChartConfigKey.Y_AXIS) ?? "",
    yScale,
  );

  // Info: (20260721 - Julian) 四象限底色（選填）：逗號分隔 HEX，逐一驗證，非法值 fail fast
  const quadrantRaw = config.get(CustomChartConfigKey.QUADRANT_COLORS);
  const quadrantColors = quadrantRaw
    ? parseCsvLine(quadrantRaw)
        .map((c) => c.trim())
        .filter((c) => c !== "")
        .map((c) => {
          if (!HEX_COLOR_REGEX.test(c)) {
            throw malformed(`象限底色非有效 HEX：「${c}」`);
          }
          return c;
        })
    : [];

  // Info: (20260721 - Julian) 群組 → 顏色（第 5 欄）；同群組以「首個非空顏色」為準，維持決定論
  const groupColors: Record<string, string> = {};

  const points = dataLines.map((line) => {
    const f = parseCsvLine(line);
    if (f.length < 3) {
      throw malformed(`矩陣資料列需至少 3 欄（label, x, y）：「${line}」`);
    }
    const label = f[0];
    if (!label) throw malformed(`矩陣資料列缺少標籤：「${line}」`);
    const group = f[3]?.trim() || undefined;

    // Info: (20260721 - Julian) 顏色為選填第 5 欄；非法 HEX fail fast（比照 trend 的嚴格策略）
    const color = f[4]?.trim();
    if (color) {
      if (!HEX_COLOR_REGEX.test(color)) {
        throw malformed(`矩陣資料列的群組顏色非有效 HEX：「${color}」`);
      }
      if (group && groupColors[group] === undefined) {
        groupColors[group] = color;
      }
    }

    const base = { label, x: toNumber(f[1], "x"), y: toNumber(f[2], "y") };
    return group ? { ...base, group } : base;
  });

  return {
    type: CustomChartType.MATRIX,
    ...(title ? { title } : {}),
    xAxis,
    yAxis,
    points,
    ...(Object.keys(groupColors).length > 0 ? { groupColors } : {}),
    ...(quadrantColors.length > 0 ? { quadrantColors } : {}),
  };
};

const buildTornado = (
  config: Map<string, string>,
  dataLines: string[],
): ICustomTornadoAst => {
  const title = config.get(CustomChartConfigKey.TITLE) || undefined;
  const unit = config.get(CustomChartConfigKey.UNIT) || undefined;
  const baseline = optionalNumber(
    config.get(CustomChartConfigKey.BASELINE),
    "baseline",
  );

  // Info: (20260723 - Julian) 數列顏色（選填）：非法 HEX fail fast（比照群組顏色的嚴格策略）
  const parseSeriesColor = (
    raw: string | undefined,
    ctx: string,
  ): string | undefined => {
    const color = raw?.trim();
    if (!color) return undefined;
    if (!HEX_COLOR_REGEX.test(color)) {
      throw malformed(`龍捲風「${ctx}」顏色非有效 HEX：「${color}」`);
    }
    return color;
  };
  const leftColor = parseSeriesColor(
    config.get(CustomChartConfigKey.LEFT_COLOR),
    "leftColor",
  );
  const rightColor = parseSeriesColor(
    config.get(CustomChartConfigKey.RIGHT_COLOR),
    "rightColor",
  );

  /**
   * Info: (20260720 - Julian)
   * 依欄位自動偵測標題列：首列若第 2、3 欄皆非數字，視為數列名稱標題列（category, leftSeries, rightSeries）；
   * 否則視為無標題列，數列名稱套用預設值。標題列不吃掉任何資料。
   */
  // ToDo: (20260721 - Luphia) 數列名稱為純數字（如 bare year 2019）時會被誤判為資料列，靜默產生錯誤的單筆長條而非報錯；考慮更嚴謹的 header 判定或加上警示
  const firstFields = parseCsvLine(dataLines[0]);
  const hasHeader =
    firstFields.length >= 3 &&
    !isNumericField(firstFields[1]) &&
    !isNumericField(firstFields[2]);

  // Info: (20260720 - Julian) 數列名稱選填：有標題列才取，未填則留 undefined（不顯示圖例）
  const leftSeries = hasHeader ? firstFields[1].trim() || undefined : undefined;
  const rightSeries = hasHeader
    ? firstFields[2].trim() || undefined
    : undefined;

  const rows = hasHeader ? dataLines.slice(1) : dataLines;
  if (rows.length === 0) {
    throw new CustomChartParseError(
      CustomChartParseErrorCode.NO_DATA_ROWS,
      "龍捲風圖僅有標題列，缺少資料列",
    );
  }

  const bars = rows.map((line) => {
    const f = parseCsvLine(line);
    if (f.length !== 3) {
      throw malformed(
        `龍捲風資料列需 3 欄（category, ${leftSeries ?? "left"}, ${rightSeries ?? "right"}）：「${line}」`,
      );
    }
    const category = f[0].trim();
    if (!category) throw malformed(`龍捲風資料列缺少項目名稱：「${line}」`);
    return {
      category,
      left: toNumber(f[1], leftSeries ?? "left"),
      right: toNumber(f[2], rightSeries ?? "right"),
    };
  });

  return {
    type: CustomChartType.TORNADO,
    ...(title ? { title } : {}),
    ...(unit ? { unit } : {}),
    ...(baseline !== undefined ? { baseline } : {}),
    ...(leftSeries ? { leftSeries } : {}),
    ...(rightSeries ? { rightSeries } : {}),
    ...(leftColor ? { leftColor } : {}),
    ...(rightColor ? { rightColor } : {}),
    bars,
  };
};

const buildHistogram = (
  config: Map<string, string>,
  dataLines: string[],
): ICustomHistogramAst => {
  const title = config.get(CustomChartConfigKey.TITLE) || undefined;
  const xAxis = config.get(CustomChartConfigKey.X_AXIS) || undefined;
  const yAxis = config.get(CustomChartConfigKey.Y_AXIS) || undefined;

  // Info: (20260720 - Julian) 選填趨勢線：僅接受列舉值，未知值 fail fast，不靜默忽略
  const trendRaw = config.get(CustomChartConfigKey.TREND)?.toLowerCase();
  let trend: HistogramTrendType | undefined;
  if (trendRaw !== undefined) {
    const match = Object.values(HistogramTrendType).find((t) => t === trendRaw);
    if (!match) {
      throw malformed(
        `不支援的 trend 類型：「${trendRaw}」（目前僅支援 ${HistogramTrendType.NORMAL}）`,
      );
    }
    trend = match;
  }

  const bins = dataLines.map((line) => {
    const f = parseCsvLine(line);
    if (f.length !== 2) {
      throw malformed(`直方圖資料列需 2 欄（bin, count）：「${line}」`);
    }
    const label = f[0];
    if (!label) throw malformed(`直方圖資料列缺少分箱標籤：「${line}」`);
    return { label, count: toNumber(f[1], "count") };
  });

  return {
    type: CustomChartType.HISTOGRAM,
    ...(title ? { title } : {}),
    ...(xAxis ? { xAxis } : {}),
    ...(yAxis ? { yAxis } : {}),
    ...(trend ? { trend } : {}),
    bins,
  };
};

const buildBox = (
  config: Map<string, string>,
  dataLines: string[],
): ICustomBoxAst => {
  const title = config.get(CustomChartConfigKey.TITLE) || undefined;
  const yAxis = config.get(CustomChartConfigKey.Y_AXIS) || undefined;
  const unit = config.get(CustomChartConfigKey.UNIT) || undefined;

  const boxes = dataLines.map((line) => {
    const f = parseCsvLine(line);
    if (f.length < 6 || f.length > 7) {
      throw malformed(
        `盒鬚圖資料列需 6 或 7 欄（label, min, q1, median, q3, max[, outliers]）：「${line}」`,
      );
    }
    const label = f[0];
    if (!label) throw malformed(`盒鬚圖資料列缺少標籤：「${line}」`);

    const box = {
      label,
      min: toNumber(f[1], "min"),
      q1: toNumber(f[2], "q1"),
      median: toNumber(f[3], "median"),
      q3: toNumber(f[4], "q3"),
      max: toNumber(f[5], "max"),
    };

    if (f.length === 7 && f[6].trim() !== "") {
      const outliers = f[6]
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map((s) => toNumber(s, "outlier"));
      if (outliers.length > 0) return { ...box, outliers };
    }
    return box;
  });

  return {
    type: CustomChartType.BOXPLOT,
    ...(title ? { title } : {}),
    ...(yAxis ? { yAxis } : {}),
    ...(unit ? { unit } : {}),
    boxes,
  };
};

// Info: (20260717 - Julian) Zod schema：對建構出的 AST 做結構驗證（型別/必填/最小筆數）
const axisSchema = z.object({
  min: z.string().optional(),
  max: z.string().optional(),
  scale: z.number().optional(),
});

const matrixSchema = z.object({
  type: z.literal(CustomChartType.MATRIX),
  title: z.string().optional(),
  xAxis: axisSchema,
  yAxis: axisSchema,
  points: z
    .array(
      z.object({
        label: z.string().min(1),
        x: z.number(),
        y: z.number(),
        group: z.string().optional(),
      }),
    )
    .min(1),
  groupColors: z.record(z.string(), z.string()).optional(),
  quadrantColors: z.array(z.string()).optional(),
});

const tornadoSchema = z.object({
  type: z.literal(CustomChartType.TORNADO),
  title: z.string().optional(),
  unit: z.string().optional(),
  baseline: z.number().optional(),
  leftSeries: z.string().min(1).optional(),
  rightSeries: z.string().min(1).optional(),
  leftColor: z.string().optional(),
  rightColor: z.string().optional(),
  bars: z
    .array(
      z.object({
        category: z.string().min(1),
        left: z.number(),
        right: z.number(),
      }),
    )
    .min(1),
});

const histogramSchema = z.object({
  type: z.literal(CustomChartType.HISTOGRAM),
  title: z.string().optional(),
  xAxis: z.string().optional(),
  yAxis: z.string().optional(),
  trend: z.nativeEnum(HistogramTrendType).optional(),
  bins: z
    .array(z.object({ label: z.string().min(1), count: z.number() }))
    .min(1),
});

const boxSchema = z.object({
  type: z.literal(CustomChartType.BOXPLOT),
  title: z.string().optional(),
  yAxis: z.string().optional(),
  unit: z.string().optional(),
  boxes: z
    .array(
      z.object({
        label: z.string().min(1),
        min: z.number(),
        q1: z.number(),
        median: z.number(),
        q3: z.number(),
        max: z.number(),
        outliers: z.array(z.number()).optional(),
      }),
    )
    .min(1),
});

const SCHEMA_BY_TYPE: Record<CustomChartType, z.ZodTypeAny> = {
  [CustomChartType.MATRIX]: matrixSchema,
  [CustomChartType.TORNADO]: tornadoSchema,
  [CustomChartType.HISTOGRAM]: histogramSchema,
  [CustomChartType.BOXPLOT]: boxSchema,
};

const BUILDER_BY_TYPE: Record<
  CustomChartType,
  (config: Map<string, string>, dataLines: string[]) => ICustomChartAst
> = {
  [CustomChartType.MATRIX]: buildMatrix,
  [CustomChartType.TORNADO]: buildTornado,
  [CustomChartType.HISTOGRAM]: buildHistogram,
  [CustomChartType.BOXPLOT]: buildBox,
};

/**
 * Info: (20260717 - Julian)
 * 由 Markdown fence 語言判斷是否為自訂圖表；非自訂圖表回 null。
 */
export const detectCustomChartType = (lang: string): CustomChartType | null => {
  const normalized = (lang ?? "").trim().toLowerCase();
  const found = Object.values(CustomChartType).find((t) => t === normalized);
  return found ?? null;
};

/**
 * Info: (20260717 - Julian)
 * 自訂圖表核心解析器：將原始字串安全解析為標準 JSON AST。
 * 純函式、決定論、不呼叫 LLM、不做數值計算；任何錯誤皆以結果物件回傳，對外永不 throw。
 */
export const parseCustomChart = (
  type: CustomChartType,
  raw: string,
): ICustomChartParseResult => {
  try {
    if (typeof raw !== "string" || raw.trim() === "") {
      return {
        ok: false,
        code: CustomChartParseErrorCode.EMPTY_CONTENT,
        message: "圖表內容為空",
      };
    }
    if (raw.length > MAX_INPUT_LENGTH) {
      return {
        ok: false,
        code: CustomChartParseErrorCode.MALFORMED_ROW,
        message: "圖表內容過長",
      };
    }

    const builder = BUILDER_BY_TYPE[type];
    if (!builder) {
      return {
        ok: false,
        code: CustomChartParseErrorCode.UNKNOWN_TYPE,
        message: `未知的自訂圖表類型：${type}`,
      };
    }

    const { config, dataLines } = preprocess(type, raw);
    if (dataLines.length === 0) {
      return {
        ok: false,
        code: CustomChartParseErrorCode.NO_DATA_ROWS,
        message: "缺少資料列",
      };
    }
    if (dataLines.length > MAX_DATA_ROWS) {
      return {
        ok: false,
        code: CustomChartParseErrorCode.MALFORMED_ROW,
        message: "資料列數過多",
      };
    }

    const ast = builder(config, dataLines);

    const validated = SCHEMA_BY_TYPE[type].safeParse(ast);
    if (!validated.success) {
      return {
        ok: false,
        code: CustomChartParseErrorCode.SCHEMA_VALIDATION_FAILED,
        message: validated.error.issues[0]?.message ?? "結構驗證失敗",
      };
    }

    return { ok: true, ast };
  } catch (error) {
    if (error instanceof CustomChartParseError) {
      return { ok: false, code: error.code, message: error.message };
    }
    // Info: (20260717 - Julian) 未預期錯誤一律收斂為驗證失敗，確保 render 不崩潰
    return {
      ok: false,
      code: CustomChartParseErrorCode.SCHEMA_VALIDATION_FAILED,
      message: "解析發生未預期錯誤",
    };
  }
};
