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

  /**
   * Info: (20260420 - Tzuhan) 配合字串壓縮，改採逐行字串分析演算法，並加入大額判定。
   * 我們只針對「傳票」行進行過濾，其餘標題或 ESG 盤查行直接放行保留。
   */
  let suspiciousVoucherCount = 0;
  let totalVoucherCount = 0;

  const lines = rawData.split("\n");
  const processedLines = lines.filter((line) => {
    // Info: (20260420 - Tzuhan) 判斷是否為傳票格式行
    if (line.includes("- 傳票號:")) {
      totalVoucherCount++;
      const hasRiskKeyword = fraudKeywords.some((keyword) => line.includes(keyword));
      
      let hasLargeAmount = false;
      const amountMatches = line.matchAll(/金額:(\d+)/g);
      for (const match of amountMatches) {
        if (Number(match[1]) >= 500000) {
          hasLargeAmount = true;
          break;
        }
      }

      const keep = hasRiskKeyword || hasLargeAmount;
      if (keep) suspiciousVoucherCount++;
      return keep;
    }
    
    // Info: (20260420 - Tzuhan) 不是傳票行 (例如標題或 ESG 紀錄段落)，直接保留
    return true;
  });

  const screenedData = processedLines.join("\n");
  
  if (totalVoucherCount > 0 && suspiciousVoucherCount === 0) {
    return `【系統演算快篩結果：未發現顯著高風險異常特徵，常規明細已依據條件屏除】\n\n${screenedData}`;
  }

  if (suspiciousVoucherCount > 0) {
    return `【系統演算快篩結果：高風險嫌疑交易清單】\n(共篩選出 ${suspiciousVoucherCount} 筆異常紀錄，已自動剔除一般合規常態交易)\n\n${screenedData}`;
  }

  return screenedData;
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
