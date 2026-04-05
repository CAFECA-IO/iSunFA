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
    targetCompany: params.keyword || "Company",
  };

  if (params.prerequisiteData?.esgRecordsContext) {
    targetObj.internalDataContext = params.prerequisiteData.esgRecordsContext;
  }

  const targetInfo = JSON.stringify(targetObj, null, 2);
  const tasks: ITaskDefinition[] = [];

  const dataSourceInstruction = params.isExternal
    ? "請強制啟動網路搜尋功能，抓取該公司最新公開的財報與數據進行深度的客觀分析。"
    : "請嚴格基於系統提供的內部數據庫資料（包含但不限於內部財務報表、傳票、日記帳、綠色/ESG數據紀錄等），禁止使用網路搜尋獲取外部財報。請純粹判斷內部資料。";

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

  const injectedFinalPrompt = finalPrompt
    .replace(/\{Target_Company\}/g, targetCompanyName)
    .replace(/\{Period\}/g, periodName)
    .replace(/\{Year\}/g, String(params.year || "未提供"));

  tasks.push(
    taskGenerator.generateTask("FINAL", injectedFinalPrompt, targetInfo, 1),
  );

  return {
    name: `Internal Analysis - ${params.category} - ${params.periodValue}`,
    tasks,
  };
}
