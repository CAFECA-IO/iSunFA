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

  const dataSourceInstruction = params.isExternal
    ? "請強制啟動網路搜尋功能，抓取該公司最新公開的財報與數據進行深度的客觀分析。"
    : "請嚴格基於系統提供的「結構化財務報表 (JSON)」與「碳盤查報告」進行專業分析。【⚠️核心防呆規則⚠️：絕對禁止自行將任何金額重新加總，所有財務數據（如營收、淨利、資產總額）請一律直接引用 JSON 報表內的結算數值。】";

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
