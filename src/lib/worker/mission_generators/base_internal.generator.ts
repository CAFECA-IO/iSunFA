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

  if (params.prerequisiteData?.esgRecordsContext) {
    targetObj.internalDataContext = params.prerequisiteData.esgRecordsContext;
  }
  
  if (params.data) {
    targetObj.financialDataPayload = params.data;
  }

  const targetInfo = JSON.stringify(targetObj, null, 2);
  const tasks: ITaskDefinition[] = [];

  const dataSourceInstruction = params.isExternal
    ? "請強制啟動網路搜尋功能，抓取該公司最新公開的財報與數據進行深度的客觀分析。"
    : "請第一步先檢視系統提供的內部數據庫資料（包含內部帳務、傳票、日記帳等）。【⚠️核心防呆規則⚠️：輸入資料同時包含「傳票(Vouchers)」與「日記帳(Journals)」，兩者為一體兩面，嚴禁將兩者的金額重複加總！計算總額與各項費用時請一律以「日記帳總計/明細(Journals)」為準，追查異常花費、交易動機與供應商時再以「傳票(Vouchers)」為準。】【防呆與推估機制】：若判斷內部當期或前期數據匱乏、缺漏，允許基於現有資料並參酌行業常規會計邏輯推估；但請強制在推估或缺失的段落/表格旁加上標籤 `[💡缺乏基礎數據：沿用推估或留白 N/A]` 以保障決策真實性。";

  const targetCompanyName = params.keyword || "該企業";
  const periodName =
    params.periodType === "yearly"
      ? "年度"
      : params.periodType === "seasonly"
        ? "季度"
        : params.periodType === "monthly"
          ? "月份"
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

  const rawDataStr = params.data ? JSON.stringify(params.data, null, 2) : "未提供相關 JSON 原始數據";
  const stepTags = promptMap.map(item => `### [${item.key} 分析報告]\n[${item.key}_CONTENT]`).join("\n\n");
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
