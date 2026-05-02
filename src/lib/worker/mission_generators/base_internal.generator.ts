import { TaskGenerator, ITaskDefinition } from "@/lib/worker/task.generator";
import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";

export function generateBaseInternalMission(
  params: IMissionParams,
  promptMap: { key: string; prompt: string }[],
  finalPrompt: string,
): IMissionDefinition | null {
  const taskGenerator = new TaskGenerator();

  const targetObj: Record<string, unknown> = {
    category: params.category,
    period: params.periodValue,
    year: params.year,
    prevYear: params.year ? params.year - 1 : null,
    targetCompany: params.keyword || "Company",
  };

  const internalDataContextParts: string[] = [];

  if (params.prerequisiteData?.balanceSheetReport) {
    internalDataContextParts.push(
      `【系統自動結算之資產負債表報表】\n(已自動將指定期間內之傳票彙整為下列科目餘額與指標)\n\n${JSON.stringify(params.prerequisiteData.balanceSheetReport, null, 2)}`,
    );
  }
  if (params.prerequisiteData?.cashFlowReport) {
    internalDataContextParts.push(
      `【系統自動結算之現金流量表報表】\n(已自動將指定期間內之傳票彙整為下列科目餘額與指標)\n\n${JSON.stringify(params.prerequisiteData.cashFlowReport, null, 2)}`,
    );
  }
  if (params.prerequisiteData?.incomeStatementReport) {
    internalDataContextParts.push(
      `【系統自動結算之綜合損益表報表】\n(已自動將指定期間內之傳票彙整為下列科目餘額與指標)\n\n${JSON.stringify(params.prerequisiteData.incomeStatementReport, null, 2)}`,
    );
  }
  if (params.prerequisiteData?.esgReport) {
    internalDataContextParts.push(
      `【系統自動結算之碳盤查報告】\n(已自動將指定期間內之紀錄彙整為下列排放量與指標)\n\n${JSON.stringify(params.prerequisiteData.esgReport, null, 2)}`,
    );
  }
  if (params.prerequisiteData?.esgRecordsContext) {
    internalDataContextParts.push(
      params.prerequisiteData.esgRecordsContext as string,
    );
  }
  if (params.prerequisiteData?.voucherRecordsContext) {
    internalDataContextParts.push(
      params.prerequisiteData.voucherRecordsContext as string,
    );
  }

  if (internalDataContextParts.length > 0) {
    targetObj.internalDataContext =
      internalDataContextParts.join("\n\n---\n\n");
  }

  if (params.data) {
    const safeData = { ...params.data };
    delete (safeData as Record<string, unknown>).prerequisiteData; // Info: (20260429 - Luphia) 移除原始巨量資料，避免干擾 AI 或超出 Token
    targetObj.financialDataPayload = safeData;
  }

  const targetInfo = JSON.stringify(targetObj, null, 2);
  const tasks: ITaskDefinition[] = [];

  /**
   * Info: (20260502 - Tzuhan)
   * [系統人設] 為了啟動 LLM 最嚴格的邏輯防呆與防幻覺機制，底層 System Prompt 採用英文撰寫，並強制其輸出繁體中文。
   * 此設定確立了 iSunFA 作為「最高等級簽證會計師與碳會計師」，只陳述事實、絕不腦補的商業定位。
   */
  const internalInstruction = `
You are a top-tier Certified Public Accountant (CPA) and Carbon Accountant.
Your ULTIMATE DIRECTIVE is to act strictly on "revealed facts".

[CRITICAL RULES]:
1. ZERO HALLUCINATION: You must derive your analysis STRICTLY and ONLY from the provided structured JSON reports.
2. NO RE-CALCULATION: You are STRICTLY FORBIDDEN to recalculate any financial totals. ALWAYS use the finalized numerical values (e.g., revenue, net income, total assets) directly from the JSON.
3. NO ASSUMPTIONS: Do not guess, assume, or make up any unrevealed business operations, external market conditions, or missing numbers.
4. NO REDUNDANT OPERATIONS: Provide only objective, audit-ready insights. Do not offer unsolicited business advice unless supported by the factual data.
5. IF INSUFFICIENT DATA: If the data is insufficient to conclude a metric, explicitly state: "依目前揭露資訊不足以評估".

[OUTPUT FORMAT]:
You MUST respond entirely in professional Traditional Chinese (zh-TW).
`.trim();

  const dataSourceInstruction = params.isExternal
    ? "請強制啟動網路搜尋功能，抓取該公司最新公開的財報與數據進行深度的客觀分析。"
    : internalInstruction;

  const targetCompanyName = params.keyword || "該企業";
  const periodName =
    params.periodType?.toLowerCase() === "yearly"
      ? "年度"
      : params.periodType?.toLowerCase() === "seasonly"
        ? `第 ${params.periodValue} 季度`
        : params.periodType?.toLowerCase() === "monthly"
          ? `${params.periodValue} 月份`
          : params.periodValue;

  promptMap.forEach((item) => {
    const injectedPrompt = item.prompt
      .replace("{Data_Source_Instruction}", dataSourceInstruction)
      .replace(/\{Target_Company\}/g, targetCompanyName)
      .replace(/\{Period\}/g, periodName)
      .replace(/\{Year\}/g, String(params.year || "未提供"));

    tasks.push(
      taskGenerator.generateTask(item.key, injectedPrompt, targetInfo, 0),
    );
  });

  const rawDataStr = params.data
    ? JSON.stringify(params.data, null, 2)
    : "未提供相關 JSON 原始數據";
  const stepTags = promptMap
    .map((item) => `### [${item.key} 分析報告]\n[${item.key}_CONTENT]`)
    .join("\n\n");
  const step0ContentReplacement = `【原始財報與明細數據】：\n${rawDataStr}\n\n【子維度先期分析報告】：\n${stepTags}`;

  const injectedFinalPrompt = finalPrompt
    .replace(/\{Target_Company\}/g, targetCompanyName)
    .replace(/\{Period\}/g, periodName)
    .replace(/\{Year\}/g, String(params.year || "未提供"))
    .replace("[STEP_0_CONTENT]", step0ContentReplacement);

  tasks.push(
    taskGenerator.generateTask("FINAL", injectedFinalPrompt, targetInfo, 1),
  );

  return {
    name: `Internal Analysis - ${params.category} - ${params.periodValue}`,
    tasks,
  };
}
