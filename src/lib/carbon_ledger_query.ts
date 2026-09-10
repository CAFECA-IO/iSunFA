// Info: (20260825 - Emily) 帳本確定性查詢層(#6707 第一層)
//
// Info: (20260825 - Emily) 職責邊界(與 carbon_inventory.ts 同一個立場):
// Info: (20260825 - Emily) 所有數值由本模組從帳本決定性取出,LLM 只負責把 facts 說成人話。
// Info: (20260825 - Emily) LLM 的回答裡不得出現本模組沒給的數字 —— 出口守門(第三層)憑此集合攔截。
//
// Info: (20260825 - Emily) 三條產品鐵律在這一層的落點:
// Info: (20260825 - Emily) 1. 數字不憑空捏造 —— 數值只從 ledger 欄位取,總計讀既存欄位不重算
// Info: (20260825 - Emily)    (summarizeLedgerEntries 是唯一累加實作;這裡連 add 都盡量不做)。
// Info: (20260907 - Emily)    例外:**維度小計**(廠址、ISO 類別、範疇合計)不是既存欄位,得在查詢層以同一個
// Info: (20260907 - Emily)    MoneyUtil 加總,且每一個都必須由「加回總量」的不變式測試釘住(#6778 review 低-1)。
// Info: (20260908 - Emily) 4. 事實的 label / source **只放人話** —— enum 鍵、內部 slug、實作細節(MoneyUtil)
// Info: (20260908 - Emily)    一個都不進 LLM。查核者的追溯另有路(帳本自己存著鍵)。由 carbon_fact_wording 掃描釘住。
// Info: (20260825 - Emily) 2. 異常只來自列舉過的偵測器 —— queryAnomalies 只讀既存的決定性裁決
// Info: (20260825 - Emily)    (匯入阻擋/pending/articulation 的 violations 與 warnings/年度標註),
// Info: (20260825 - Emily)    不發明新的「疑點」;新偵測器要先開票、定義證據鏈、進這個列舉。
// Info: (20260825 - Emily) 3. 拒答是一等公民 —— 資料不在帳本裡回 refused + 缺什麼,不改寫題目。

import { MoneyUtil } from "@/lib/utils/money";
import { isImportedEntry } from "@/lib/carbon_table38.ledger";
import {
  EsgScope,
  GhgCategoryDetails,
  IsoCategoryDetails,
} from "@/constants/esg";
import type { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import type {
  IComputedLedger,
  IComputedLedgerEntry,
  ILedgerImportBlock,
  ILedgerYearWarning,
} from "@/types/carbon_chatbot.types";
import type { IContextFact } from "@/interfaces/carbon_paragraph_draft";

/**
 * Info: (20260825 - Emily) 一筆可引用的事實:label/value 供敘事,source 供溯源(表號+位置或帳本欄位)。
 * Info: (20260827 - Emily) emissionsKg:本筆的排放量數值(kg 級),供出口守門裁決 ——
 * 見 IContextFact.emissionsKg 的註解(渲染字串不當機器裁決的真值來源)。
 */
export interface ILedgerFact {
  label: string;
  value: string;
  source: string;
  emissionsKg?: string[];
}

/**
 * Info: (20260825 - Emily) 拒答理由(一等公民,所以是 enum 不是自由字串):
 * 敘事端與測試都要能對「為什麼拒」做精確斷言,自由字串做不到。
 */
export enum LedgerRefusalReasonEnum {
  /** 帳本不存在或沒有任何分錄(還沒匯入報告、也沒有憑證計算結果) */
  LEDGER_EMPTY = "LEDGER_EMPTY",
  /** 問的維度帳本沒有(例:問廠址,但帳本裡沒有任何帶廠址的分錄) */
  DIMENSION_ABSENT = "DIMENSION_ABSENT",
}

export type ILedgerQueryResult =
  | { ok: true; facts: ILedgerFact[] }
  | {
      ok: false;
      refusal: {
        reason: LedgerRefusalReasonEnum;
        /** 缺的是什麼,說給使用者聽(拒答要說得出缺口,不是一句「不知道」) */
        missing: string;
      };
    };

const refuse = (
  reason: LedgerRefusalReasonEnum,
  missing: string,
): ILedgerQueryResult => ({ ok: false, refusal: { reason, missing } });

const hasEntries = (
  ledger: IComputedLedger | undefined,
): ledger is IComputedLedger =>
  ledger !== undefined && ledger.entries.length > 0;

/**
 * Info: (20260907 - Emily) ISO 14064-1 類別的短標籤(「類別三」)。
 *
 * `IsoCategoryDetails[...].nameZh` 是「類別三:運輸之間接溫室氣體排放」——
 * 全稱進事實值會讓每一筆 label 長到讀不動,而**代碼(CATEGORY_3)不能直接給 LLM**:
 * 使用者問的是「類別三」,兩者對不上就等於沒有這筆事實。取冒號前那一段,
 * 不自己維護第二份中文對照表(那會與 esg.ts 漂移)。
 */
const isoCategoryLabel = (category: Iso14064Category): string =>
  IsoCategoryDetails[category].nameZh.split(/[:\uff1a]/)[0];

/**
 * Info: (20260907 - Emily) 範疇小計的標籤原本是**原始 enum 鍵**(`SCOPE_2_INDIRECT 小計`)。
 *
 * 那一串會原樣進 persona 的事實清單(`chat.service.ts` 逐筆印 `label = value`),
 * 而使用者問的是「範疇二」。同一份帳本裡 `SCOPE_3_CAT_4` 這種鍵更不可能對上任何問法 ——
 * 模型要嘛答不出來,要嘛自己猜對照,而猜錯是靜默的。
 *
 * Info: (20260908 - Emily) 9/07 那一版把 enum 鍵**保留在方括號裡**(「原鍵供查核者對回帳本欄位」)。
 * owner 9/08 實測後判定不該出現,而那個判斷是對的:`label` 是 persona 逐筆印給
 * **使用者**看的字串,查核者的追溯另有路(帳本自己存著鍵、報告的表 3.8 帶著表號),
 * 把識別碼塞進人話等於讓每個使用者付查核者的成本。**事實的 label / source 只放人話**,
 * 識別碼一個都不送進 LLM —— 用 `carbon_fact_wording.test.ts` 的掃描釘住,
 * 不靠 persona 規則叫它「別印方括號」(那種規則遲早被繞過,而繞過是靜默的)。
 *
 * 範疇三的 GHG 類別(`SCOPE_3_CAT_n`)中文名不帶範疇字樣(「購買的商品與服務」),
 * 單獨印出來使用者不知道它屬於範疇三,所以前面補「範疇三:」。
 * **刻意不寫「類別 n」**:那是 GHG Protocol 的 category,與 ISO 14064-1 的「類別」同字不同義,
 * 而這兩套術語的混淆正是 #6778 的起點。
 * 中文名不在本檔維護(那會與 esg.ts 漂移)。
 */
const scopeLabel = (scope: string): string => {
  const detail = GhgCategoryDetails[scope as GhgProtocolCategory];
  if (!detail) return scope;
  return detail.scope === EsgScope.SCOPE_3
    ? `範疇三:${detail.nameZh}`
    : detail.nameZh;
};

/**
 * Info: (20260908 - Emily) 範疇合計的標籤,**把兩套術語的對照寫在 label 上**(#6778 第三半)。
 *
 * owner 9/08 實測:問「範疇三的排放量」,帳本的 `scopeSubtotals` 是按 GHG 類別存的
 * (`SCOPE_3_CAT_1`…),沒有一格叫「範疇三合計」;模型守規矩不自己加,只能把六個零件攤出來。
 * 這是 #6778 前半(缺 ISO 類別小計)的同形:**使用者會問的彙總層級,事實包裡沒有那一格。**
 *
 * 對照寫在 label 上是刻意的:模型的語意配對本來就強,缺的只是一座橋讓它知道
 * 「範疇三」與「類別三+四+五+六」是同一批東西。橋寫在事實上,比另外做意圖分類便宜,
 * 而且可測。對照本身是 ISO 14064-1:2018 與 GHG Protocol 的標準對應,不是本專案的判斷。
 * 不寫阿拉伯數字(不寫「Scope 3」):label 不進守門的合法集合,但模型會照抄 label,
 * 一個裸露的 3 出現在排放單位旁邊就是一筆假主張。
 */
const SCOPE_ROLLUP_LABEL: Record<EsgScope, string> = {
  [EsgScope.SCOPE_1]:
    "範疇一合計(GHG Protocol 直接排放;對應 ISO 14064-1 類別一)",
  [EsgScope.SCOPE_2]:
    "範疇二合計(GHG Protocol 能源間接排放;對應 ISO 14064-1 類別二)",
  [EsgScope.SCOPE_3]:
    "範疇三合計(GHG Protocol 其他間接排放;對應 ISO 14064-1 類別三、四、五、六)",
};
const SCOPE_ROLLUP_ORDER: EsgScope[] = [
  EsgScope.SCOPE_1,
  EsgScope.SCOPE_2,
  EsgScope.SCOPE_3,
];

/**
 * Info: (20260908 - Emily) 表號的人話寫法。
 *
 * `importedOrigin.tableNo` 經 `normalizeSourceTableNo` 之後**已經帶「表」**(「表3.8」),
 * 而這裡原本再串一個「表」—— owner 9/08 截圖裡的「表表3.8」就是這麼來的。
 * 測試夾具用的是不帶「表」的「3.8」,所以兩種寫法都要收,不假設上游一定正規化過。
 */
const tableRef = (tableNo: string): string =>
  tableNo.startsWith("表") ? tableNo : `表${tableNo}`;
const tableRefs = (tableNos: Iterable<string>): string =>
  [...new Set([...tableNos].map(tableRef))].join("、");

/** Info: (20260907 - Emily) 沒有 isoCategory 的分錄(憑證/計算來源)的桶名 */
const UNCATEGORIZED_LABEL = "未標註 ISO 類別";

/**
 * Info: (20260907 - Emily) ISO 14064-1 類別小計(#6778)。
 *
 * ## 為什麼非有不可
 *
 * 事實包原本只有 `scopeSubtotals`(GHG Protocol 的**範疇**)。使用者問
 * 「ISO 14064 類別三的排放量」時,清單裡沒有這個維度 ——
 * 守規矩的模型只能拒答,不守規矩的會拿「範疇三 小計」充當答案,而那是錯的:
 *
 *     ISO 類別三 = 運輸之間接排放
 *     GHG 範疇三 = ISO 類別三 + 四 + 五 + 六
 *
 * 兩者在有類別四(組織使用產品)的報告上差距很大,而報告本身是照類別編的
 * (表 38 的每一列都帶類別)。分錄上一直有 `importedOrigin.isoCategory`,
 * 只是從來沒有人把它加總或印出來。
 *
 * ## 為什麼在查詢層加總,而不是加一個帳本欄位
 *
 * 本檔檔頭的規則是「小計讀既存欄位,不重算」,而既存欄位裡沒有類別小計。
 * 兩條路:
 *
 * 1. 加進 `summarizeLedgerEntries`(唯一累加實作)→ 帳本多一個欄位 →
 *    型別、`ComputedLedgerSchema`、寫路徑守門、**以及所有已存的舊帳本**都要跟著動;
 *    舊帳本沒有那個欄位,還是得有一條回算路徑 —— 等於兩份實作都要寫。
 * 2. 在查詢層以 `MoneyUtil` 加總(與 `querySiteSubtotals` 同一個做法,廠址小計
 *    也不是既存欄位)→ 不動儲存格式、不必遷移、舊帳本立刻就有這個維度。
 *
 * 取 2。代價是這裡確實做了加法,所以用**同一個 MoneyUtil**(不是原生浮點),
 * 並由測試釘住不變式:**各類別小計 + 未標註 = 帳本總量**。加法只要與
 * `summarizeLedgerEntries` 不一致,那條就會紅。
 *
 * ## 未標註類別的分錄自成一桶,不併進任何類別
 *
 * 憑證與活動數據算出來的分錄沒有 `isoCategory`。把它們塞進「類別一」
 * 是替使用者的盤查邊界做決定;省略不提則會讓各類別小計加不回總量,
 * 而那正是查核者第一個會做的檢查。所以明說「未標註」,數字自己說話。
 *
 * `esg.ts` 有一張 `GhgToIsoMapping`(範疇 → 類別)看起來可以拿來推導。**這裡不用**:
 * 它現有的兩個呼叫端(`esg_detail_modal.tsx` / `esg_table_section.tsx`)都是
 * 使用者選了範疇之後的**預填值,使用者可以改** —— 那是人在迴圈裡的建議,
 * 不是可申報的歸類。把它靜默套用在事實包上,會讓一個推導出來的數字與
 * 原文照錄的數字混在同一筆小計裡,而查核者看不出差別。
 * 憑證那條線的類別歸屬要等匯入線穩定後另外量(owner 20260907 指示的順序)。
 */
export const queryIsoCategorySubtotals = (
  ledger: IComputedLedger | undefined,
): ILedgerQueryResult => {
  if (!hasEntries(ledger)) {
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄:請先匯入盤查報告,或完成活動數據與係數計算",
    );
  }
  const categorized = ledger.entries.filter(
    (entry) => entry.importedOrigin !== undefined,
  );
  if (categorized.length === 0) {
    return refuse(
      LedgerRefusalReasonEnum.DIMENSION_ABSENT,
      "帳本中沒有帶 ISO 14064 類別的分錄(類別來自匯入的原文表格):目前無法按類別拆分,只能按 GHG Protocol 範疇",
    );
  }
  /*
   * Info: (20260907 - Emily) 以 enum 的宣告順序輸出(類別一→六),不是以出現順序:
   * 同一份帳本兩次問答不得換順序,而使用者是照類別編號讀的。
   */
  const subtotals = new Map<Iso14064Category, string>();
  const tableNos = new Set<string>();
  categorized.forEach((entry) => {
    const category = entry.importedOrigin!.isoCategory;
    tableNos.add(entry.importedOrigin!.tableNo);
    subtotals.set(
      category,
      MoneyUtil.add(subtotals.get(category) ?? "0", entry.co2eKg),
    );
  });
  const ordered = (
    Object.keys(IsoCategoryDetails) as Iso14064Category[]
  ).filter((category) => subtotals.has(category));
  const facts: ILedgerFact[] = ordered.map((category) => {
    const subtotal = subtotals.get(category)!;
    return {
      label: `${isoCategoryLabel(category)} 排放小計(ISO 14064-1)`,
      value: `${subtotal} kgCO2e`,
      source: `原文照錄 ${tableRefs(tableNos)} 分錄按 ISO 類別加總`,
      emissionsKg: [subtotal],
    };
  });
  const uncategorized = ledger.entries.filter(
    (entry) => entry.importedOrigin === undefined,
  );
  if (uncategorized.length > 0) {
    const subtotal = uncategorized.reduce(
      (acc, entry) => MoneyUtil.add(acc, entry.co2eKg),
      "0",
    );
    facts.push({
      label: `${UNCATEGORIZED_LABEL} 排放小計`,
      value: `${subtotal} kgCO2e`,
      source: `本系統計算的分錄加總(${uncategorized.length} 筆,無原文類別)`,
      emissionsKg: [subtotal],
    });
  }
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 分錄的溯源字串。匯入項有 importedOrigin(表號+廠址+子代碼),
 * 憑證項退回 sourceName —— 兩種來源都必須說得出「這個數字從哪來」。
 * Info: (20260908 - Emily) 原本憑證項還帶 `(activityKey)`:那是內部 slug,使用者看不懂也
 * 不能拿它做任何事。所有事實字串一律只放人話(見 scopeLabel 的說明)。
 */
const traceOf = (entry: IComputedLedgerEntry): string =>
  entry.importedOrigin
    ? `原文照錄 ${tableRef(entry.importedOrigin.tableNo)} ${entry.importedOrigin.site} ${entry.importedOrigin.subCategory}(${isoCategoryLabel(entry.importedOrigin.isoCategory)})`
    : `本系統計算 ${entry.sourceName}`;

/**
 * Info: (20260825 - Emily) 全公司總量與範疇小計。
 * **讀既存欄位,不重算**:totalCo2eKg/scopeSubtotals 由 summarizeLedgerEntries 寫入,
 * 這裡再加一次就是第二份累加實作 —— 兩份遲早不一致,而不一致在查帳系統裡是致命的。
 */
export const queryTotal = (
  ledger: IComputedLedger | undefined,
): ILedgerQueryResult => {
  if (!hasEntries(ledger)) {
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄:請先匯入盤查報告,或完成活動數據與係數計算",
    );
  }
  /*
   * Info: (20260908 - Emily) 範疇合計(#6778 第三半):`scopeSubtotals` 的鍵是 GHG 類別
   * (`SCOPE_3_CAT_n`),同一範疇底下可能有很多筆;合計在查詢層以 MoneyUtil 加總,
   * 與類別小計、廠址小計同一個例外、同一條不變式:**三個範疇合計相加 = 帳本總計欄**。
   * 範疇一、二各只有一個鍵,合計就等於那一筆 —— 仍然印成「合計」那一筆(帶術語對照),
   * 原本那筆不重印:同一個數字印兩次,模型會以為是兩件事。
   * 範疇三合計印在它的各類別之前:先給答案,再給組成。
   */
  const rollups = new Map<EsgScope, string>();
  const byScope = new Map<EsgScope, [string, string][]>();
  Object.entries(ledger.scopeSubtotals).forEach(([key, subtotal]) => {
    const scope = GhgCategoryDetails[key as GhgProtocolCategory]?.scope;
    if (!scope) return;
    rollups.set(scope, MoneyUtil.add(rollups.get(scope) ?? "0", subtotal));
    byScope.set(scope, [...(byScope.get(scope) ?? []), [key, subtotal]]);
  });
  const scopeFacts: ILedgerFact[] = SCOPE_ROLLUP_ORDER.filter((scope) =>
    rollups.has(scope),
  ).flatMap((scope) => {
    const members = byScope.get(scope) ?? [];
    const rollup: ILedgerFact = {
      label: SCOPE_ROLLUP_LABEL[scope],
      value: `${rollups.get(scope)} kgCO2e`,
      source:
        members.length === 1
          ? "帳本範疇小計欄"
          : `帳本範疇小計欄按範疇加總(${members.length} 個 GHG 類別)`,
      emissionsKg: [rollups.get(scope)!],
    };
    if (members.length === 1) return [rollup];
    return [
      rollup,
      ...members.map(([key, subtotal]) => ({
        label: `${scopeLabel(key)} 小計`,
        value: `${subtotal} kgCO2e`,
        source: "帳本範疇小計欄",
        emissionsKg: [subtotal],
      })),
    ];
  });
  const facts: ILedgerFact[] = [
    {
      label: "全公司總排放量",
      value: `${ledger.totalCo2eKg} kgCO2e`,
      source: `帳本總計欄(${ledger.entries.length} 筆分錄,計算於 ${ledger.computedAt})`,
      emissionsKg: [ledger.totalCo2eKg],
    },
    ...scopeFacts,
  ];
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 排放量前 N 大來源(「最高的碳排是什麼?」的答案)。
 * 排序走 decimal.js 的 comparedTo —— 碳排量字串禁止原生浮點,排序也一樣
 * ("1000.05" vs "1000.5" 用 parseFloat 排對是運氣,不是保證)。
 * 同值以 activityKey 字典序決勝:排序必須決定性,同一份帳本兩次問答不得換答案。
 */
export const queryTopEmitters = (
  ledger: IComputedLedger | undefined,
  count: number,
): ILedgerQueryResult => {
  if (!hasEntries(ledger)) {
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄:請先匯入盤查報告,或完成活動數據與係數計算",
    );
  }
  const ranked = [...ledger.entries].sort((a, b) => {
    const byAmount = MoneyUtil.toDecimal(b.co2eKg).comparedTo(
      MoneyUtil.toDecimal(a.co2eKg),
    );
    if (byAmount !== 0) return byAmount;
    return a.activityKey < b.activityKey ? -1 : 1;
  });
  /**
   * Info: (20260825 - Emily) 占比由這裡決定性算出(Decimal,一位小數)。
   * 08-25 實測:事實包沒給占比,LLM 就自己算了「39.9%」—— persona 禁計算
   * 擋不住它,而 % 沒有排放單位、守門也不看。把占比變成事實,
   * LLM 有現成的值可引用,就沒有理由自己算。
   * (%的守門納管先不做:方法學文字裡的合法百分比 —— 重算門檻 3%、
   * 不確定性 5% —— 不在事實包裡,納管會誤殺;記在 #6707。)
   */
  const total = MoneyUtil.toDecimal(ledger.totalCo2eKg);
  const shareOf = (co2eKg: string): string | null =>
    total.isZero()
      ? null
      : MoneyUtil.toDecimal(co2eKg).div(total).mul(100).toFixed(1);
  const facts = ranked.slice(0, count).map((entry, index) => {
    const share = shareOf(entry.co2eKg);
    return {
      label: `排放量第 ${index + 1} 大:${entry.sourceName}`,
      value: `${entry.co2eKg} kgCO2e(${entry.convertedQuantity} ${entry.convertedUnit}${share === null ? "" : `,占全公司總量 ${share}%`})`,
      source: traceOf(entry),
      // Info: (20260827 - Emily) 只有 co2eKg 是排放量:括號裡的活動量與占比不得替排放量斷言背書
      emissionsKg: [entry.co2eKg],
    };
  });
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 各廠址小計。廠址維度只存在於匯入分錄(importedOrigin.site);
 * 憑證分錄沒有這個維度 —— 所以這裡的累加是**新維度的第一份實作**,不是第二份
 * (summarizeLedgerEntries 只按範疇分組)。仍全程 MoneyUtil,禁止原生浮點累加。
 * 帳本裡沒有任何帶廠址的分錄時拒答,並說清楚是維度缺席,不是排放量為零。
 */
export const querySiteSubtotals = (
  ledger: IComputedLedger | undefined,
): ILedgerQueryResult => {
  if (!hasEntries(ledger)) {
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄:請先匯入盤查報告,或完成活動數據與係數計算",
    );
  }
  const imported = ledger.entries.filter(
    (entry) => isImportedEntry(entry) && entry.importedOrigin,
  );
  if (imported.length === 0) {
    return refuse(
      LedgerRefusalReasonEnum.DIMENSION_ABSENT,
      "帳本中沒有帶廠址資訊的分錄(廠址維度來自匯入的原文表格):目前無法按廠址拆分",
    );
  }
  const subtotals = new Map<string, string>();
  const tableNos = new Set<string>();
  imported.forEach((entry) => {
    const site = entry.importedOrigin!.site;
    tableNos.add(entry.importedOrigin!.tableNo);
    subtotals.set(
      site,
      MoneyUtil.add(subtotals.get(site) ?? "0", entry.co2eKg),
    );
  });
  /*
   * Info: (20260909 - Emily) 排放量由大到小,同額以廠址名排(#6783 review 低-2)。
   *
   * 原本是 Map 的插入順序 —— 也就是「哪個廠址的分錄先出現」,沒有意義而且
   * 一旦要裁就會裁掉任意的幾個(可能正是最大的那幾個)。排序方式與
   * `queryTopEmitters` 同一個慣例:Decimal 比大小、名稱當決勝鍵(決定性)。
   */
  const ranked = [...subtotals.entries()].sort(([siteA, a], [siteB, b]) => {
    const byAmount = MoneyUtil.toDecimal(b).comparedTo(MoneyUtil.toDecimal(a));
    if (byAmount !== 0) return byAmount;
    return siteA < siteB ? -1 : 1;
  });
  const listed = ranked.slice(0, LEDGER_FACT_SITES_MAX);
  const rest = ranked.slice(LEDGER_FACT_SITES_MAX);
  const facts: ILedgerFact[] = listed.map(([site, subtotal]) => ({
    label: `${site} 排放小計`,
    value: `${subtotal} kgCO2e`,
    source: `原文照錄 ${tableRefs(tableNos)} 分錄加總`,
    emissionsKg: [subtotal],
  }));
  /**
   * Info: (20260909 - Emily) 超過上限的廠址併成一筆「另有 N 個」(#6783 review 低-2)。
   *
   * 省略不提會讓各廠址小計加不回匯入分錄的總量,而那正是查核者第一個會做的檢查
   * (與「未標註 ISO 類別」那一桶同一把尺)。所以說出來,數字自己說話。
   */
  if (rest.length > 0) {
    const remainder = MoneyUtil.sum(rest.map(([, subtotal]) => subtotal));
    facts.push({
      label: `另有 ${rest.length} 個廠址 排放小計`,
      value: `${remainder} kgCO2e`,
      source: `原文照錄 ${tableRefs(tableNos)} 分錄加總(排放量前 ${LEDGER_FACT_SITES_MAX} 大之外的 ${rest.length} 個廠址合計)`,
      emissionsKg: [remainder],
    });
  }
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 疑點(「這間公司的碳排是否異常?」的素材)。
 *
 * **列舉制**:只讀五個既存的決定性裁決 ——
 * 1. importBlocks:匯入表格被勾稽擋下的紀錄(「對帳差異」偵測器;
 *    存在 state 不在 ledger,因為被擋時帳本可能整本是空的)
 * 2. pending:決定論引擎判「無法裁決」的活動(絕不猜值的那批)
 * 3. articulation.violations:質量守恆勾稽的缺口(期初+採購-期末 ≠ 帳上消耗)
 * 4. articulation.warnings:合理性警示(數量超出物理量級邊界;僅警示不凍結)
 * 5. yearWarning:年度標註不完整(detectUndatedImportedEntries 的決定性判斷;
 *    同 importBlocks 住在 state 不在 ledger —— 它是「這次匯入與既有帳本的關係」,
 *    不是帳本自身的一筆資料。**刻意不塞進 pending**(PR #6725 round-2 追加回饋):
 *    pending 的語意是「活動數據待補」,借用它就是從既有桶子偷渡偵測器,
 *    而且 label 會變成「待補項」、待補計數會被污染)
 *
 * 這裡**不發明新偵測器**(不能為了找錯而找):新的偵測器要先開票、
 * 定義證據鏈、進這個列舉,才輪得到出現在回答裡。
 * 沒有觸發時回 ok + 空 facts —— 「查過而無異常」與「沒查」必須分得出來。
 *
 * 帳本空 + 有阻擋紀錄 → **回 ok 帶阻擋事實,不拒答**:
 * 「帳本為什麼是空的」本身就是這一題的答案,拒答反而把最該浮出的疑點藏掉。
 */
export const queryAnomalies = (
  ledger: IComputedLedger | undefined,
  importBlocks?: ILedgerImportBlock[],
  yearWarning?: ILedgerYearWarning,
): ILedgerQueryResult => {
  const blockFacts: ILedgerFact[] = (importBlocks ?? []).map((block) => ({
    label: `匯入表格被勾稽擋下:${block.paragraphId}`,
    value: block.reason,
    source: `匯入勾稽紀錄(${block.blockedAt})`,
  }));
  /**
   * Info: (20260828 - Emily) 第五個偵測器:年度標註不完整。
   * label 講實話 —— 它不是待補項,而是「帳本裡有分錄無法判斷年度歸屬」;
   * 沒有 activityKey 可寫,source 因此指向這次匯入的年度(證據鏈)。
   *
   * Info: (20260904 - Emily) **原本這句話的結尾指示使用者「清空帳本後逐年重新匯入」**
   *(PR #6725 round-2 的低-1,當時提出、未修,跟著合併進 develop)。
   *
   * 那句話違反的是這一層自己立好的界線(見 `carbon_ledger_query.test.ts` 的
   * 「帳本為空的拒答仍然可以說『請先匯入』」那段):**祈使句不是一律不准,
   * 要擋的是指示一個會動到既有帳本的動作** —— 而「清空帳本」是這個產品裡
   * 對既有資料最具破壞性的動作,它會連非匯入的憑證計算分錄一起丟掉,
   * 而「逐年重新匯入」預設使用者手上還留著每一份原始報告(那個前提沒被檢查過)。
   *
   * 改成**陳述代價然後停住**。刻意不給出路:可逆的出路是「逐筆補年度」,
   * 而那個能力今天不存在 —— 不存在就不要寫在紙上(事實值會被逐字帶進敘事)。
   *
   * Info: (20260906 - Luphia) 這次改寫把 `undatedCount` 從 label 搬進 value,
   * 而**出口守門的合法數字集合只讀 `fact.value`、不讀 `fact.label`**
   *(`carbon_reply_gate.ts` 的 `buildAllowedNumbers`)。所以這是一次放寬,
   * 照 §2.5 記下「現在最多能發生多壞」:
   *
   * 一個 1–50 的小整數(無年度分錄的筆數)成為合法數字,LLM 可以把它印在
   * 回覆的任何位置,包括當成排放量而不被攔下。**與既有同級**:那個集合裡
   * 本來就有占比百分比、年間倍數、活動量這些同量級的小數字,所以這不是
   * 新增一個類別,是多一個同類成員 —— 換來的是使用者看得到虛增的量級。
   *
   * 下一個要把數字塞進 value 的人請先讀這一段:label 不進合法集合,value 會。
   */
  const yearFacts: ILedgerFact[] = yearWarning
    ? [
        {
          label: `年度標註不完整:${yearWarning.undatedCount} 筆匯入分錄沒有盤查年度`,
          value: `這些分錄在系統開始記錄盤查年度之前匯入,無法判斷屬於哪一年。若它們不屬於 ${yearWarning.incomingYear} 年,帳本總量會虛增這 ${yearWarning.undatedCount} 筆的量;系統目前沒有逐筆補記年度的能力,因此這些分錄的年度歸屬在帳本裡無法確定。`,
          source: `帳本年度歸屬檢查(本次匯入年度 ${yearWarning.incomingYear})`,
        },
      ]
    : [];
  const signalFacts = [...blockFacts, ...yearFacts];
  if (!hasEntries(ledger)) {
    if (signalFacts.length > 0) return { ok: true, facts: signalFacts };
    return refuse(
      LedgerRefusalReasonEnum.LEDGER_EMPTY,
      "帳本中沒有任何排放分錄,無從評估異常:請先匯入盤查報告",
    );
  }
  const facts: ILedgerFact[] = [
    ...signalFacts,
    ...ledger.pending.map((item) => ({
      label: `待補項:${item.sourceName}`,
      value: item.reason,
      source: "帳本待補清單",
    })),
    ...(ledger.articulation?.violations ?? []).map((violation) => ({
      label: `質量守恆缺口:${violation.materialName}`,
      value: `期初+採購-期末=${violation.expectedConsumption} ${violation.unit},帳上消耗=${violation.actualConsumption} ${violation.unit},缺口=${violation.gap} ${violation.unit}`,
      source: "帳本質量守恆勾稽",
    })),
    ...(ledger.articulation?.warnings ?? []).map((warning) => ({
      label: `合理性警示:${warning.sourceName}`,
      value: `數量 ${warning.quantity} ${warning.unit},超出物理量級邊界(上限 ${warning.plausibleMax} ${warning.unit})`,
      source: "帳本合理性警示",
    })),
  ];
  return { ok: true, facts };
};

/**
 * Info: (20260825 - Emily) 把查詢結果攤平成 IContextFact,給注入層(第二層)餵 LLM。
 * 拒答不產生 facts —— 拒答句由敘事端用 refusal.missing 組,不讓 LLM 有機會填空。
 *
 * Info: (20260908 - Emily) **`emissionsKg` 一定要帶過去。** 這一行漏了 12 天。
 *
 * 20260827 為了 PR #6716 round-5 的阻擋項(活動數據與占比不得替排放量背書)在
 * `ILedgerFact` 與 `IContextFact` 都加了 `emissionsKg`,查詢層每一筆排放量事實也都填了,
 * 出口守門也照它裁決 —— 但這個 mapper 沒有跟著改,於是**事實包送出去的每一筆都沒有它**。
 * 9/08 實測:`buildLedgerFactBundle` 回 4 筆、帶 emissionsKg 的 0 筆、
 * 守門的 `emissionKg` 集合大小 0。
 *
 * 後果有兩層,都是靜默的:
 * 1. 守門退回「value 裡每個數字都合法」—— round-5 修的洗白路徑(排放 1 公噸被 1000 立方公尺
 *    洗白)在聊天路徑上**從來沒有關上**。
 * 2. kg↔公噸換算沒有材料:模型只要寫「227.8986 公噸」就會被攔,所以它學會了只吐 kg 原值 ——
 *    owner 9/08 看到的「683966.6 kgCO2e」滿版數字,一部分是這裡逼出來的。
 *    同日的 `carbon_report_facts` / `carbon_report_freshness` 也都靠這個欄位判「一致」,
 *    沒有它,報告印公噸的每一節都會被判成與帳本不一致、且永遠不會被標過期。
 *
 * 這是 #6725 / #6788 那個形狀(型別有、傳遞端沒有)的又一個實例,只是這次不是 schema
 * 而是手寫的 mapper。修法是不再逐欄位手抄:整筆展開,型別相容由 TS 保證。
 */
export const toContextFacts = (result: ILedgerQueryResult): IContextFact[] =>
  result.ok ? result.facts.map((fact) => ({ ...fact })) : [];

/**
 * Info: (20260825 - Emily) 年間量級跳動的門檻:×3 或 ÷3(#6707 的年間偵測器)。
 *
 * 為什麼是倍數不是百分比:需求原話是「量級跳動」—— ±30% 是正常年間波動
 * (產能、天氣、係數改版),報了就是「為了找錯而找」;跨一個量級
 * (三倍以上)才值得人看一眼。門檻是具名常數:要調,這裡調,說得出為什麼。
 */
export const YEAR_OVER_YEAR_JUMP_FACTOR = 3;

/** Info: (20260825 - Emily) 年間比較的單邊輸入:年度 + 該年度的帳本 */
export interface IYearLedger {
  year: number;
  ledger: IComputedLedger;
}

/**
 * Info: (20260825 - Emily) 年間量級跳動偵測器(獨立入口,不在 queryAnomalies 的列舉裡 ——
 * 它吃的是兩個年度的帳本快照,不是當前帳本;`open/63` 的查詢層半件)。
 *
 * 配對鍵用 sourceName(廠址+排放源,兩種 provenance 都有這個欄位)——
 * activityKey 含 basis 前綴與 esgRecordId,同一排放源兩年的 key 不保證相等。
 *
 * 三種疑點形態,各有證據鏈(兩年的值+各自的表號):
 * 1. 量級跳動:兩年都有值,比值 ≥ ×3 或 ≤ ÷3(0 → 正值視為跳動,寫「0 → X」)
 * 2. 排放源消失:上年度有、本年度無 —— 可能是真減排,也可能是漏盤,都該看一眼
 * 3. 排放源新增:本年度有、上年度無 —— 可能是新設施,也可能是上年度漏了
 *
 * 只有單一年度時拒答(DIMENSION_ABSENT)—— 「無法比較」與「比較過沒異常」
 * 必須分得出來,這正是拒答一等公民的用法。
 */
export const queryYearOverYear = (
  current: IYearLedger | undefined,
  previous: IYearLedger | undefined,
): ILedgerQueryResult => {
  if (!current || !previous || !hasEntries(current.ledger)) {
    /**
     * Info: (20260827 - Emily) 拒答的說明**只在年度已知時**指示「再匯一年」
     * (PR #6725 review R1)。
     *
     * 原本一律那樣說,而 reviewer 追出來的後果是:年度未知時,
     * 跨年度匯入會在帳本裡留下「只有前一年有」的孤兒列並算進總量
     * (去重鍵不含年度;年度未知時合併端無從分辨,只能退回舊行為)。
     * 也就是系統會主動叫使用者去做一件安靜弄髒總量的事 —— 而那份總量
     * 會流進事實包、LLM 引用、數據表與桑基圖,最後進到送查證的文件。
     *
     * Info: (20260831 - Emily) R1 更正:兩態**都**改成只說狀態(不再分安全與否)。
     *
     * 規則 3(換鍋)上線後,年度已知時再匯一年確實是安全的 —— 但那不構成
     * 系統該指示使用者去做的理由。拒答的職責是說明「為什麼答不出來」,
     * 不是替使用者決定下一步;要不要匯第二年是他的決定,真的匯了,
     * 合併規則與年度標註偵測器會接住。
     *
     * 界線不是「祈使句一律不准」:帳本為空時的「請先匯入盤查報告」照留,
     * 那個動作沒有任何既有資料可以弄髒。要擋的是**指示一個會動到既有帳本的動作**。
     */
    const yearKnown = current?.year !== undefined;
    return refuse(
      LedgerRefusalReasonEnum.DIMENSION_ABSENT,
      yearKnown
        ? "帳本只有單一年度,年間比較無從進行(年間比較需要兩個年度各自的帳本快照)"
        : "本帳本沒有標註盤查年度,年間比較無從進行(年度快照以盤查年度為鍵,未標註年度時建立不了快照)",
    );
  }
  const byName = (ledger: IComputedLedger): Map<string, IComputedLedgerEntry> =>
    new Map(ledger.entries.map((entry) => [entry.sourceName, entry]));
  const currentByName = byName(current.ledger);
  const previousByName = byName(previous.ledger);
  const facts: ILedgerFact[] = [];

  currentByName.forEach((entry, name) => {
    const prior = previousByName.get(name);
    if (!prior) {
      facts.push({
        label: `年間新增排放源:${name}`,
        value: `${previous.year} 年無此排放源,${current.year} 年為 ${entry.co2eKg} kgCO2e —— 可能是新設施,也可能是 ${previous.year} 年漏盤`,
        source: `${current.year}:${traceOf(entry)}`,
        // Info: (20260827 - Emily) 年份不是排放量:只標排放量本體(見 IContextFact.emissionsKg)
        emissionsKg: [entry.co2eKg],
      });
      return;
    }
    const currentValue = MoneyUtil.toDecimal(entry.co2eKg);
    const priorValue = MoneyUtil.toDecimal(prior.co2eKg);
    if (priorValue.isZero() && currentValue.isZero()) return;
    const jumped = priorValue.isZero()
      ? true
      : currentValue.div(priorValue).gte(YEAR_OVER_YEAR_JUMP_FACTOR) ||
        (!currentValue.isZero() &&
          priorValue.div(currentValue).gte(YEAR_OVER_YEAR_JUMP_FACTOR)) ||
        currentValue.isZero();
    if (!jumped) return;
    const ratio = priorValue.isZero()
      ? `0 → ${entry.co2eKg}`
      : `×${currentValue.div(priorValue).toFixed(1)}`;
    facts.push({
      label: `年間量級跳動:${name}`,
      value: `${previous.year} 年 ${prior.co2eKg} kgCO2e → ${current.year} 年 ${entry.co2eKg} kgCO2e(${ratio})`,
      source: `${previous.year}:${traceOf(prior)} / ${current.year}:${traceOf(entry)}`,
      // Info: (20260827 - Emily) 兩年的排放量都合法可引用;年份與倍數不是排放量
      emissionsKg: [prior.co2eKg, entry.co2eKg],
    });
  });

  previousByName.forEach((prior, name) => {
    if (currentByName.has(name)) return;
    facts.push({
      label: `年間排放源消失:${name}`,
      value: `${previous.year} 年為 ${prior.co2eKg} kgCO2e,${current.year} 年無此排放源 —— 可能是真減排,也可能是漏盤`,
      source: `${previous.year}:${traceOf(prior)}`,
      emissionsKg: [prior.co2eKg],
    });
  });

  /**
   * Info: (20260831 - Emily) 兩個年度都在、什麼都沒跨門檻時**也要有結論**
   * (PR #6725 review R4 的殘留半)。
   *
   * 這是本函式檔頭自己寫的那條規矩:「『無法比較』與『比較過沒異常』必須分得出來」。
   * 原本 facts 為空就回空 —— 於是事實包裡零筆年間事實,與「只有一個年度」
   * 在下游**完全同形**,而 persona 被指示去轉述一筆不存在的「無法進行」說明
   * (reviewer 實測:年增 10% 的主要路徑上,清單裡年間事實 0 筆)。
   *
   * 三種上游狀態現在有三種可觀測值:
   *   不滿兩個年度      → yearComparisonUnavailableFact 的「無法進行」(進 core)
   *   兩年且有跳動/增減 → 逐筆疑點(進異常池,排在最前面)
   *   兩年且都沒跨門檻 → 這一筆「查過而無異常」
   *
   * 不省這一筆的理由與拒答一等公民同源:沉默無法區分「查過」與「沒查」,
   * 而 LLM 對沉默的處理方式沒有人保證。
   */
  if (facts.length === 0) {
    return {
      ok: true,
      facts: [
        {
          label: "年間比較:各排放源皆未跨門檻",
          value: `${previous.year} 年與 ${current.year} 年逐排放源比對,無任何一項達到 ×${YEAR_OVER_YEAR_JUMP_FACTOR} 或 ÷${YEAR_OVER_YEAR_JUMP_FACTOR} 的量級跳動,也沒有排放源新增或消失`,
          source: `帳本年度快照(${previous.year} / ${current.year})`,
        },
      ],
    };
  }

  return { ok: true, facts };
};

/** Info: (20260825 - Emily) 事實包上限。與 validator 的 ledgerFacts max 同值 —— 超了請求會被 schema 打回 */
export const LEDGER_FACT_BUNDLE_MAX = 80;
/** Info: (20260825 - Emily) 「最高的碳排是什麼」要答得出前幾名,固定取 5:決定性,不隨帳本大小變 */
export const LEDGER_FACT_TOP_EMITTERS = 5;
/**
 * Info: (20260909 - Emily) 廠址小計的上限(#6783 review 低-2)。
 *
 * 這是 `core` 裡**唯一沒有上界**的那一組 —— 一個廠址一筆。而事實包的裁剪
 * (`buildLedgerFactBundle` 的 `budget`)只裁 `anomalies`,於是廠址一多,
 * 先是把疑點全部擠掉,再往上就整包超過 `LEDGER_FACT_BUNDLE_MAX`,
 * 而 validator 的 `ledgerFacts` 是 `.max(80)` —— **整個聊天請求被 schema 打回**,
 * 那間帳本的每一則訊息都失敗。不是降級,是全失敗。實測 80 個廠址 → 90 筆。
 *
 * 有了這個上界,`core` 的最大筆數算得出來:
 *
 *     1  全公司總量
 *   + 20 範疇(3 個範疇合計 + 最多 17 個 GHG 類別鍵)
 *   + 7  ISO 類別(6 個類別 + 未標註)
 *   + 13 廠址(上限 12 + 「另有 N 個」那一筆)
 *   + 5  前五大
 *   + 1  年間比較無法進行
 *   = 47
 *
 * 「維度無法拆分」那兩筆不進最大值:它們與對應的小計互斥(有小計就不會有那一筆)。
 * 於是疑點至少還有 `80 - 47 - 1 = 32` 個位置,而超出的部分仍由「異常事實逾上限」
 * 那一筆誠實交代。上限本身由測試釘住(見 `carbon_ledger_query.test.ts` 的
 * 「事實包在最壞情況下仍不超過上限」)。
 */
export const LEDGER_FACT_SITES_MAX = 12;

/**
 * Info: (20260825 - Emily) 標準事實包(#6707 第二層的輸入):每一則聊天請求隨行注入。
 *
 * ## 為什麼是「一律注入」而不是「先判斷使用者在問什麼再查」
 *
 * 路由使用者意圖需要一層 NLU —— 那一層一旦判錯,查詢層再正確也輪不到上場,
 * 而且判錯是**靜默的**(使用者只看到 AI 答非所問或編了數字)。
 * 事實包是決定性組出來的固定形狀(總量+範疇+廠址+前五大+異常),
 * 成本可預算(上限 LEDGER_FACT_BUNDLE_MAX),把「懂問題」留給 LLM,
 * 把「數字對」留給本模組 —— 各做各的擅長。
 *
 * ## 上限的處理是明說,不是靜默截斷
 *
 * 異常事實可能很多(待補清單沒有上限)。超出預算時裁掉的是異常尾巴,
 * 並補一筆「另有 N 條未列出」—— 靜默截斷會讓 LLM 說「只有這些問題」,那是說謊。
 *
 * 帳本空時回空陣列:注入端(persona)對「無事實」另有明確拒答指令,不在這裡造假事實。
 */
/**
 * Info: (20260825 - Emily) #6719:從年度快照挑最近兩年做年間比較。
 * Info: (20260831 - Emily) 不滿兩個年度時仍然回空 —— 但「為什麼比不了」改由
 * yearComparisonUnavailableFact 送進 core(舊註解說「由 persona 的無事實規則處理」
 * 是錯的:帳本有分錄時 persona 走的是**有事實**分支,那條規則不會生效)。
 */
const yearOverYearFacts = (
  ledgerByYear: Record<number, IComputedLedger> | undefined,
): IContextFact[] => {
  const years = Object.keys(ledgerByYear ?? {})
    .map(Number)
    .sort((a, b) => b - a);
  if (!ledgerByYear || years.length < 2) return [];
  return toContextFacts(
    queryYearOverYear(
      { year: years[0], ledger: ledgerByYear[years[0]] },
      { year: years[1], ledger: ledgerByYear[years[1]] },
    ),
  );
};

/**
 * Info: (20260831 - Emily) 年間比較做不成時的**說明**(PR #6725 R1 更正時追出來的缺口)。
 *
 * persona 有一條「使用者問跟去年比 → 照清單中的說明原文轉述」,而拒答經
 * toContextFacts 一律不產生事實、yearOverYearFacts 又在不滿兩個年度時早退 ——
 * 清單裡從來沒有那筆。模型被要求轉述一段不存在的文字,而 persona 的其他條文
 * 正在禁止它自行發揮。兩端各自看起來都正確,錯在它們之間。
 *
 * **它進 core 不進 anomalies**,兩個理由,都是昨天那條回饋的同一把尺:
 * 1. 它不是疑點。放進異常池會讓「另有 N 條異常事實未列出」把它算進去 ——
 *    那是拿別的桶子的語意來裝自己的東西(pending 那格剛因為同樣的理由被否決)。
 * 2. 異常池會被上限裁掉,而「為什麼比不了」正好在帳本最忙的時候最該說得出來。
 *
 * 帳本本身空的時候不送:那時每個查詢都拒答,persona 走「無事實」分支,
 * 多這一條只會讓空帳本的畫面更吵。
 */
const yearComparisonUnavailableFact = (
  ledgerByYear: Record<number, IComputedLedger> | undefined,
  ledger: IComputedLedger | undefined,
): IContextFact[] => {
  const years = Object.keys(ledgerByYear ?? {}).map(Number);
  if (years.length >= 2 || !hasEntries(ledger)) return [];
  return [
    {
      label: "年間比較:無法進行",
      value:
        years.length === 1
          ? `年間比較需要兩個年度各自的帳本快照,目前只有 ${years[0]} 年這一份`
          : "年間比較需要兩個年度各自的帳本快照,目前一份都沒有(年度快照以盤查年度為鍵,帳本尚未標註盤查年度)",
      source: `帳本年度快照(目前 ${years.length} 個年度)`,
    },
  ];
};

/**
 * Info: (20260909 - Emily) 某個維度拆不出來時的**說明**(#6783 review 低-3)。
 *
 * 與 `yearComparisonUnavailableFact` 是同一個缺口的同一種修法:拒答經
 * `toContextFacts` 一律不產生事實,於是「這本帳沒有這個維度」在清單裡是沉默的,
 * 而**沉默無法區分「查過」與「沒查」** —— 對 LLM 尤其危險:
 *
 *   使用者問「ISO 類別三排多少」→ 清單裡沒有類別維度,也沒有一句話說它不存在
 *   → 守規矩的模型拒答;不守規矩的拿「範疇三合計」充當答案,而那是錯的
 *     (ISO 類別三只有運輸,GHG 範疇三 = 類別三+四+五+六)
 *
 * 而這種替代**騙得過出口守門**:守門裁決的是數字,而範疇三那個數字是合法的,
 * 錯的是標籤。所以要在事實層面就說清楚。
 *
 * 拒答的 `missing` 本來就是寫給人看的一句話(「帳本中沒有帶 ISO 14064 類別的分錄
 * (類別來自匯入的原文表格):目前無法按類別拆分,只能按 GHG Protocol 範疇」),
 * 這裡直接用它 —— 不另寫第二份文案,那會與拒答漂移。
 *
 * 三個邊界:
 * - **只處理 `DIMENSION_ABSENT`**。另一個拒答理由 `LEDGER_EMPTY` 只在帳本一筆分錄
 *   都沒有時出現,那時每個查詢都拒答、persona 走「無事實」分支,多這幾筆只會讓
 *   空帳本的畫面更吵(同 `yearComparisonUnavailableFact` 的判斷)。
 *   所以這裡**只有這一道 guard**:原本還多寫了一個 `!hasEntries(ledger)`,而
 *   `LEDGER_EMPTY` 本來就等價於它 —— 兩道互相遮蔽,任一道拿掉測試都照綠
 *   (實跑確認過)。留一道測得出來的,而不是兩道測不出來的。
 * - 進 core 不進 anomalies:它不是疑點,也不該被上限裁掉。
 * - **不帶 `emissionsKg`**:它不是排放數字,出口守門不該把它當合法來源。
 */
const dimensionUnavailableFact = (
  dimension: string,
  result: ILedgerQueryResult,
): IContextFact[] => {
  if (result.ok) return [];
  if (result.refusal.reason !== LedgerRefusalReasonEnum.DIMENSION_ABSENT) {
    return [];
  }
  return [
    {
      label: `${dimension}拆分:無法進行`,
      value: result.refusal.missing,
      source: "帳本維度盤點(不是排放數字)",
    },
  ];
};

export const buildLedgerFactBundle = (
  ledger: IComputedLedger | undefined,
  importBlocks?: ILedgerImportBlock[],
  ledgerByYear?: Record<number, IComputedLedger>,
  yearWarning?: ILedgerYearWarning,
): IContextFact[] => {
  /*
   * Info: (20260909 - Emily) 兩個維度的查詢各跑一次,結果同時餵給「小計」與
   * 「拆不出來的說明」(#6783 review 低-3):同一個結果的兩面,不重複查詢。
   */
  const isoResult = queryIsoCategorySubtotals(ledger);
  const siteResult = querySiteSubtotals(ledger);
  const core = [
    ...toContextFacts(queryTotal(ledger)),
    /*
     * Info: (20260907 - Emily) 類別小計與範疇小計**並列**(#6778):兩個維度都印,
     * 不挑一個。使用者的報告是照 ISO 類別編的、而系統的小計欄是 GHG 範疇,
     * 只給一邊就等於要模型自己換算 —— 那是它最會出錯的地方(類別三 ≠ 範疇三)。
     */
    ...toContextFacts(isoResult),
    ...toContextFacts(siteResult),
    ...toContextFacts(queryTopEmitters(ledger, LEDGER_FACT_TOP_EMITTERS)),
    ...dimensionUnavailableFact("ISO 14064-1 類別", isoResult),
    ...dimensionUnavailableFact("廠址", siteResult),
    ...yearComparisonUnavailableFact(ledgerByYear, ledger),
  ];
  /**
   * Info: (20260825 - Emily) 年間疑點與其他異常同池,一起受上限與「據實申報」規則管。
   *
   * Info: (20260831 - Emily) 年間事實排在**最前面**(PR #6725 review R4)。
   *
   * 上限裁的是尾巴(`slice(0, budget)`),而年間事實原本排在最後 ——
   * 也就是這一池裡**訊號最強的東西第一個被丟掉**:待補清單沒有上限,
   * 一份待補很多的帳本會把「某個排放源的排放量翻了三倍」擠掉,
   * 而 LLM 只讀到「另有 N 條異常事實未列出」,它會理解成 N 條待補項,
   * 不會理解成「排放量翻了三倍而我沒說」。
   *
   * 排序是唯一需要的修法:量級跳動是跨年度的結構性變化(可能是關廠、
   * 可能是漏盤、也可能是真的成長),而待補項是單筆活動數據缺係數 ——
   * 前者值得人看一眼,後者是清單工作。
   */
  const anomalies = [
    ...yearOverYearFacts(ledgerByYear),
    ...toContextFacts(queryAnomalies(ledger, importBlocks, yearWarning)),
  ];
  const budget = LEDGER_FACT_BUNDLE_MAX - core.length - 1;
  if (anomalies.length <= budget + 1) {
    return [...core, ...anomalies];
  }
  const kept = anomalies.slice(0, Math.max(budget, 0));
  return [
    ...core,
    ...kept,
    {
      label: "異常事實逾上限",
      value: `另有 ${anomalies.length - kept.length} 條異常事實未列出`,
      source: "事實包上限裁剪(據實申報,非全貌)",
    },
  ];
};
