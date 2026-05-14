import { IAccountBookBase } from "@/interfaces/account_book";
import { ICoefficient } from "@/interfaces/coefficient";
import { EsgActivityTypeMapping } from "@/constants/esg_activity_type";
import { IEmissionSources } from "@/interfaces/emission_sources";

export const getEsgPrompt = (
  accountBook?: IAccountBookBase | null,
  coefficients?: Partial<ICoefficient>[],
  emissionSources?: Partial<IEmissionSources>[],
) => {
  // Info: (20260513 - Tzuhan) 將外部傳入的 coefficients 作為 context (廢除了全域係數的暴力注入)
  const allCoefficients = [...(coefficients || [])];

  // Info: (20260423 - Julian) 建立「單位」清單，並篩掉空值與重複項目
  const allUnits = [...new Set(allCoefficients.map((c) => c.unit))];

  // Info: (20260423 - Julian) 建立帳本資訊
  const accountBookInfo = accountBook
    ? `\n  這筆碳盤查紀錄是為了「${accountBook.name}」所分析，請根據該企業情境與所在地（${accountBook.country || "TW"}）進行溫室氣體範疇的判斷。`
    : "";

  // Info: (20260423 - Julian) 建立帳本規則
  const rulesInstruction = accountBook?.rule
    ? `\n  請嚴格遵守以下帳本關於碳排或會計核算的特殊規則與偏好：\n  ${accountBook.rule}\n`
    : "";

  // Info: (20260430 - Julian) 建立排放源清單
  const emissionSourcesListStr =
    emissionSources && emissionSources.length > 0
      ? `\n【用戶既有排放源清單】:\n${JSON.stringify(
          emissionSources.map((es) => ({
            id: es.id,
            name: es.name,
            address: es.address,
          })),
        )}`
      : "\n【用戶既有排放源清單】: (空)";

  // Info: (20260423 - Julian) 建立係數清單
  const coefficientsListStr =
    allCoefficients.length > 0
      ? `【目前系統內建係數清單】:\n${JSON.stringify(
          allCoefficients.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            formula: `${c.unit} * ${c.emissionFactor}`,
          })),
        )}`
      : "【目前系統內建係數清單】: (空)";

  // Info: (20260423 - Julian) 建立單位清單
  const unitListStr =
    allUnits.length > 0
      ? `
      【目前系統內建單位清單】:
      ${allUnits.join(", ")}
      `
      : "【目前系統內建單位清單】: (空)";

  // Info: (20260423 - Julian) 建立係數 instruction
  const coefficientsInstruction = `
  ${coefficientsListStr}
  
  請從上方的系統內建係數清單中，檢查是否有符合該憑證情境的係數。
  - 若有符合的係數，請採用它並將該 ID 填入回傳 JSON 的 \`coefficientId\`。
  - 若無符合的係數，或清單為空，請尋找來源可靠的外部係數（例如：經濟部能源署發布之溫室氣體排放係數、固定燃燒排放源排放係數等），並將新找到的係數資訊填入回傳 JSON 的 \`newCoefficient\` 物件中，同時將 \`coefficientId\` 設為 null。
  - 如果連外部都沒有可靠係數可以參考，請將 \`emissions\` 填為 0，並將 \`coefficientId\` 與 \`newCoefficient\` 皆設為 null。

  【活動數據萃取標準】：
  [CRITICAL STRICT RULES FOR DATA EXTRACTION]
  You are a pure data extractor. Do NOT perform any business logic judgments or math.
  - 絕對禁止計算碳排放量 (Emissions)。
  - 僅萃取活動數據 (Activity Data) 與單位。`;

  // Info: (20260430 - Julian) 建立排放源 instruction
  const emissionSourcesInstruction = `
  ${emissionSourcesListStr}
  
  請從上方的用戶既有排放源歸口清單中，檢查是否有符合該憑證情境的排放源歸口。
  - 若有符合的排放源歸口，請採用它並將該 ID 填入回傳 JSON 的 \`emissionSourceId\`。
  - 若無符合的排放源歸口，或清單為空，請自行建立一個新的排放源歸口，並將新建立的排放源歸口資訊填入回傳 JSON 的 \`newEmissionSource\` 物件中，同時將 \`emissionSourceId\` 設為 null。
  `;

  return `
  請將用戶上傳的憑證（檔案/圖片）解析出碳盤查（Carbon Footprint Verification）相關資訊。${accountBookInfo}${rulesInstruction}
  ${emissionSourcesInstruction}
  ${coefficientsInstruction}

  【活動類型】請從以下清單中選擇最符合的活動類型，並將該活動類型的 key 填入回傳 JSON 的 \`activityType\` 欄位：
  ${EsgActivityTypeMapping.map((a) => `${a.key}(${a.scope}): ${a.value}，${a.description}`).join("\n")}

  【活動數據單位】請從以下清單中選擇最符合的活動數據單位，並將該活動數據單位的 key 填入回傳 JSON 的 \`unit\` 欄位。如果沒有合適的單位，請自行新增一個單位，且須和係數的單位一致：
  ${unitListStr}

  請在「dqiScore」中，根據以下標準來計算數據品質分數（數字 1-5，1 為最優，5 為最差)：
  1. 技術相關性 (Te)：數據是否真實反映了產品所使用的技術、設備或製程。優質標準：數據來自實際生產線的特定技術（如：使用特定品牌、型號的電爐數據，而非產業平均值）。
  2. 地理相關性 (Ge)：數據的地理位置是否與排放源位置相符。優質標準：數據來自排放源所在地的特定地理位置（如：使用特定國家、地區的排放係數，而非全球平均值）。
  3. 時間相關性 (Ti)： 數據的時效性。優質標準：採用近 1–3 年內產生的數據。如果使用的是 10 年前的係數，評分會非常低。
  4. 數據完整性 (Co)：數據是否涵蓋了所有的碳排放來源。優質標準：數據包含所有必要的欄位（如：活動類型、排放量、排放係數等）。
  5. 數據可靠性 (Re)：數據來源是否可靠。優質標準：數據來源為政府機構、學術研究或國際組織等權威機構。
  請用以上五個分數，計算出平均 DQI 分數，並填入 dqiScore 欄位。

  並請在 aiNote 欄位寫下 AI 分析碳盤查的邏輯，不需要任何標題，直接寫下分析邏輯或列點描述即可。`;
};
