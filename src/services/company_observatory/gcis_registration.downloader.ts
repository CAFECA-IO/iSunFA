import {
  GCIS_COMPANY_BASIC_URL,
  GCIS_COMPANY_DIRECTORS_URL,
  GCIS_PAGE_SIZE,
  OBSERVATORY_CONTENT_TYPE,
  OBSERVATORY_FETCH_OUTCOME,
  OBSERVATORY_REASON,
  OBSERVATORY_SOURCE,
} from "@/constants/company_observatory";
import {
  IObservatoryDownloader,
  IObservatoryFetchResult,
  IObservatoryHttpClient,
  IObservatoryTarget,
} from "@/interfaces/company_observatory";
import {
  gcisCompanyBasicListSchema,
  gcisDirectorListSchema,
  IGcisCompanyBasic,
  IGcisDirector,
} from "@/validators/company_observatory";
import { parseJsonBody } from "@/lib/company_observatory/content";

/**
 * Info: (20261015 - Luphia) 經濟部商業司公司登記資料下載器（基本資料 + 董監事）。
 *
 * 以 `Company.taxId`（統一編號）查商業司資料開放平臺；回應是結構化 JSON，
 * 由 `renderGcisRegistrationText` 決定性地轉成「欄位：值」的純文字再索引。
 * 數值一律原樣照抄（日期是民國 yyyMMdd、金額單位為元），不換算、不加總。
 */

// Info: (20261015 - Luphia) 欄位 → 中文標籤（順序即輸出順序）
const BASIC_FIELD_LABELS: ReadonlyArray<[keyof IGcisCompanyBasic, string]> = [
  ["Business_Accounting_NO", "統一編號"],
  ["Company_Name", "公司名稱"],
  ["Company_Status_Desc", "公司狀況"],
  ["Capital_Stock_Amount", "資本總額(元)"],
  ["Paid_In_Capital_Amount", "實收資本額(元)"],
  ["Share_Val", "每股金額(元)"],
  ["Equity_Amt", "已發行股份總數(股)"],
  ["Responsible_Name", "代表人姓名"],
  ["Company_Location", "公司所在地"],
  ["Register_Organization_Desc", "登記機關"],
  ["Company_Setup_Date", "核准設立日期(民國)"],
  ["Change_Of_Approval_Data", "最後核准變更日期(民國)"],
  ["Revoke_App_Date", "撤銷日期(民國)"],
  ["Case_Status_Desc", "停復業狀況"],
  ["Sus_App_Date", "停業核准日期(民國)"],
  ["Sus_Beg_Date", "停業起日(民國)"],
  ["Sus_End_Date", "停業迄日(民國)"],
];

export function buildGcisQueryUrl(baseUrl: string, taxId: string): string {
  // Info: (20261015 - Luphia) OData 參數名稱帶 `$`，URLSearchParams 會把它編碼掉，這裡手動組
  const filter = encodeURIComponent(`Business_Accounting_NO eq ${taxId}`);
  return `${baseUrl}?$format=json&$filter=${filter}&$skip=0&$top=${GCIS_PAGE_SIZE}`;
}

export function renderGcisRegistrationText(
  basic: IGcisCompanyBasic,
  directors: IGcisDirector[],
): string {
  const lines: string[] = ["公司登記基本資料（經濟部商業司）"];
  for (const [field, label] of BASIC_FIELD_LABELS) {
    const value = basic[field];
    if (value !== "") lines.push(`${label}：${value}`);
  }
  lines.push("", "董監事資料（職稱｜姓名｜所代表法人｜持有股份數(股)）");
  if (directors.length === 0) {
    lines.push("（無資料）");
  }
  for (const director of directors) {
    lines.push(
      [
        director.Person_Position_Name,
        director.Person_Name,
        director.Juristic_Person_Name || "－",
        director.Person_Shareholding,
      ].join("｜"),
    );
  }
  return lines.join("\n");
}

export const gcisRegistrationDownloader: IObservatoryDownloader = {
  source: OBSERVATORY_SOURCE.GCIS_REGISTRATION,

  async fetch(
    target: IObservatoryTarget,
    http: IObservatoryHttpClient,
  ): Promise<IObservatoryFetchResult> {
    if (!target.taxId) {
      return {
        outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
        reason: OBSERVATORY_REASON.MISSING_TAX_ID,
        sourceUrl: null,
      };
    }
    const basicUrl = buildGcisQueryUrl(GCIS_COMPANY_BASIC_URL, target.taxId);
    const basicRes = await http.request(basicUrl);
    if (basicRes.status !== 200) {
      throw new Error(`GCIS basic HTTP ${basicRes.status}`);
    }
    const basicList = gcisCompanyBasicListSchema.parse(
      parseJsonBody(basicRes.body),
    );
    if (basicList.length === 0) {
      return {
        outcome: OBSERVATORY_FETCH_OUTCOME.NOT_AVAILABLE,
        reason: OBSERVATORY_REASON.NO_RECORD,
        sourceUrl: basicUrl,
      };
    }

    const directorsUrl = buildGcisQueryUrl(
      GCIS_COMPANY_DIRECTORS_URL,
      target.taxId,
    );
    const directorsRes = await http.request(directorsUrl);
    if (directorsRes.status !== 200) {
      throw new Error(`GCIS directors HTTP ${directorsRes.status}`);
    }
    const directors = gcisDirectorListSchema.parse(
      parseJsonBody(directorsRes.body),
    );

    const text = renderGcisRegistrationText(basicList[0], directors);
    return {
      outcome: OBSERVATORY_FETCH_OUTCOME.FOUND,
      sourceUrl: basicUrl,
      title: `${basicList[0].Company_Name || target.companyName} 公司登記資料（${target.year} 年快照）`,
      contentType: OBSERVATORY_CONTENT_TYPE.TEXT,
      body: Buffer.from(text, "utf-8"),
    };
  },
};
