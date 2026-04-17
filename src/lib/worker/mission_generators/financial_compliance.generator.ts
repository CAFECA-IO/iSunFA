import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import { generateBaseInternalMission } from "@/lib/worker/mission_generators/base_internal.generator";
import * as Prompts from "@/constants/prompts/financial_compliance";

// Info: (20260418 - Tzuhan) 內部演算法快篩：從海量傳票與日記帳中，過濾出具備「異常樣態」之清單。
// Info: (20260418 - Tzuhan) 實務對接：可將此處改寫為針對 Prisma DB 的 SQL Query，撈取如「月底大額退貨」等紀錄。
function fastScreenAnomalies(rawData: unknown): string {
  if (typeof rawData !== "string" || !rawData) {
    return "查無相關內部傳票與明細數據。";
  }

  // Info: (20260418 - Tzuhan) 串接真實過濾邏輯，此處將過濾後的結果打上系統標籤，屏除一般常態雜訊交由 AI 審核。
  const fraudKeywords = [
    "退貨", "拆分", "避稅天堂", "開曼", "維京群島", "特許",
    "關係人", "資金貸與", "期末", "年底", "大額", "減損", "異常"
  ];

  try {
    // Info: (20260418 - Tzuhan) 我們的底層已經在 analysis.service.ts 中，將 DB 的 Voucher 與 Lines 撈出並轉為 JSON 傳入。因此此處直接針對標準化的傳票物件 (Voucher) 進行「結構化」的高風險篩選。
    const parsedData = JSON.parse(rawData);
    if (Array.isArray(parsedData)) {
      const filteredData = parsedData.filter((item) => {
        // Info: (20260418 - Tzuhan) 條件 1：如果有特定高風險關鍵字在傳票的 note 或是任何明細中出現
        const hasRiskKeyword = fraudKeywords.some(
          (keyword) =>
            String(item.note || "").includes(keyword) ||
            (item.lines && item.lines.some((line: { particular?: string }) => String(line.particular || "").includes(keyword)))
        );

        // Info: (20260418 - Tzuhan) 條件 2：是否有單筆金額超過一定門檻的高風險交易 (例如大於 50 萬)
        const hasLargeAmount = item.lines && item.lines.some((line: { amount?: number | string }) => Number(line.amount || 0) >= 500000);

        // Info: (20260418 - Tzuhan) 任何一項中標，就保留這張傳票給 AI 稽核
        return hasRiskKeyword || hasLargeAmount;
      });
      if (filteredData.length === 0) {
        return "【系統演算快篩結果：未發現顯著高風險異常特徵，常規明細已依據條件屏除】";
      }
      return `【系統演算快篩結果：高風險嫌疑交易 JSON 清單】\n(已自動剔除一般合規常態交易，僅保留具高度舞弊或異常可能性之紀錄)\n\n${JSON.stringify(filteredData, null, 2)}`;
    }
  } catch (e) {
    // Info: (20260418 - Tzuhan) 若解析 JSON 失敗代表可能是純文字或 Markdown 報表，改採逐行分析演算法
    console.log("fastScreenAnomalies error", e);
    const lines = rawData.split("\n");
    const suspiciousLines = lines.filter((line) => {
      return fraudKeywords.some((keyword) => line.includes(keyword));
    });

    if (suspiciousLines.length === 0) {
      return "【系統演算快篩結果：未發現顯著高風險異常特徵，常規明細已依據條件屏除】";
    }

    const screenedData = suspiciousLines.join("\n");
    return `【系統演算快篩結果：高風險嫌疑交易清單】\n(已自動剔除一般合規常態交易，僅保留具高度舞弊或異常可能性之紀錄)\n\n${screenedData}`;
  }

  return String(rawData);
}

export function generateMission(
  params: IMissionParams,
): IMissionDefinition | null {
  // Info: (20260418 - Tzuhan) 盲點一防禦實作：於 Worker 階段攔截資料，執行 Rule-based 異常快篩，避免 AI 陷入無效搜尋。
  const filteredParams = {
    ...params,
    prerequisiteData: {
      ...params.prerequisiteData,
      esgRecordsContext: fastScreenAnomalies(params.prerequisiteData?.esgRecordsContext)
    }
  };

  return generateBaseInternalMission(
    filteredParams,
    [
      { key: "FRAUD_DETECTION", prompt: Prompts.FRAUD_DETECTION_PROMPT },
      {
        key: "ABNORMAL_TRANSACTIONS",
        prompt: Prompts.ABNORMAL_TRANSACTIONS_PROMPT,
      },
      { key: "REGULATORY", prompt: Prompts.REGULATORY_COMPLIANCE_PROMPT },
    ],
    Prompts.FINAL_PROMPT,
  );
}
