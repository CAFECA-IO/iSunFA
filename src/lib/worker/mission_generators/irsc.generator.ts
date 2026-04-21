import { TaskGenerator, ITaskDefinition } from "@/lib/worker/task.generator";
import { COMPANY as ECQ } from "@/constants/prompts/company/ecq";
import { COMPANY as ERE } from "@/constants/prompts/company/ere";
import { COMPANY as GDI } from "@/constants/prompts/company/gdi";
import { COMPANY as GES } from "@/constants/prompts/company/ges";
import { COMPANY as MMP } from "@/constants/prompts/company/mmp";
import { COMPANY as SRR } from "@/constants/prompts/company/srr";
import { COMPANY as TPM } from "@/constants/prompts/company/tpm";
import { COMPANY as UEE } from "@/constants/prompts/company/uee";
import { COMPANY as FINAL } from "@/constants/prompts/company/final";
import {
  IMissionParams,
  IMissionDefinition,
} from "@/lib/worker/mission.interface";

export function generateIrscMission(
  params: IMissionParams,
): IMissionDefinition | null {
  const taskGenerator = new TaskGenerator();
  let targetInfoStr = `Target Company: ${params.periodValue} (Fiscal Year: ${params.year})`;
  if (params.country || params.keyword) {
    targetInfoStr = `Target External: ${params.keyword || "Company"} / Country: ${params.country || "N/A"} / Period: ${params.periodValue} (Year: ${params.year})`;
  }

  const targetObj: Record<string, unknown> = {
    context: targetInfoStr,
  };

  if (params.prerequisiteData?.esgRecordsContext) {
    targetObj.internalDataContext = params.prerequisiteData.esgRecordsContext;
  }
  
  if (params.data) {
    targetObj.financialDataPayload = params.data;
  }

  const targetInfo = JSON.stringify(targetObj, null, 2);
  const tasks: ITaskDefinition[] = [];

  const promptMap = [
    { key: "ECQ", prompt: ECQ },
    { key: "MMP", prompt: MMP },
    { key: "UEE", prompt: UEE },
    { key: "GDI", prompt: GDI },
    { key: "TPM", prompt: TPM },
    { key: "SRR", prompt: SRR },
    { key: "ERE", prompt: ERE },
    { key: "GES", prompt: GES },
  ];

  // Info: (20260130 - Luphia) 1. Parallel Analysis Tasks (Order 0)
  promptMap.forEach((item) => {
    tasks.push(
      taskGenerator.generateTask(item.key, item.prompt, targetInfo, 0),
    );
  });

  /**
   * Info: (20260316 - Tzuhan) 2. Final Synthesis Task (Order 1)
   * The prompt for FINAL depends on the inputs of previous tasks.
   * Since we are not executing here, we save the raw template.
   * The Executor will need to handle the prompt interpolation using results from Order 0 tasks.
   */
  tasks.push(taskGenerator.generateTask("FINAL", FINAL, targetInfo, 1));

  return {
    name: `IRSC Analysis - ${params.periodValue}`,
    tasks,
  };
}
