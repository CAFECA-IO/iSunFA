import { TaskGenerator, ITaskDefinition } from '@/lib/worker/task.generator';
import { COMPANY as ECQ } from '@/constants/prompts/company/ecq';
import { COMPANY as ERE } from '@/constants/prompts/company/ere';
import { COMPANY as GDI } from '@/constants/prompts/company/gdi';
import { COMPANY as GES } from '@/constants/prompts/company/ges';
import { COMPANY as MMP } from '@/constants/prompts/company/mmp';
import { COMPANY as SRR } from '@/constants/prompts/company/srr';
import { COMPANY as TPM } from '@/constants/prompts/company/tpm';
import { COMPANY as UEE } from '@/constants/prompts/company/uee';
import { COMPANY as FINAL } from '@/constants/prompts/company/final';

export interface IMissionParams {
  category: string;
  periodType: string;
  periodValue: string;
  year: number;
  country?: string;
  keyword?: string;
}

export interface IMissionDefinition {
  name: string;
  tasks: ITaskDefinition[];
}

export class MissionGenerator {
  // Info: (20260130 - Luphia) Remove async as it's just structural generation
  generateMission(params: IMissionParams): IMissionDefinition | null {
    if (params.category === 'irsc') {
      const taskGenerator = new TaskGenerator();
      let targetInfo = `Target Company: ${params.periodValue} (Fiscal Year: ${params.year})`;
      if (params.country || params.keyword) {
        targetInfo = `Target External: ${params.keyword || 'Company'} / Country: ${params.country || 'N/A'} / Period: ${params.periodValue} (Year: ${params.year})`;
      }
      const tasks: ITaskDefinition[] = [];

      const promptMap = [
        { key: 'ECQ', prompt: ECQ },
        { key: 'MMP', prompt: MMP },
        { key: 'UEE', prompt: UEE },
        { key: 'GDI', prompt: GDI },
        { key: 'TPM', prompt: TPM },
        { key: 'SRR', prompt: SRR },
        { key: 'ERE', prompt: ERE },
        { key: 'GES', prompt: GES },
      ];

      // Info: (20260130 - Luphia) 1. Parallel Analysis Tasks (Order 0)
      promptMap.forEach(item => {
        tasks.push(taskGenerator.generateTask(item.key, item.prompt, targetInfo, 0));
      });

      // Info: (20260130 - Luphia) 2. Final Synthesis Task (Order 1)
      // Note: The prompt for FINAL depends on the inputs of previous tasks. 
      // Since we are not executing here, we save the raw template. 
      // The Executor will need to handle the prompt interpolation using results from Order 0 tasks.
      tasks.push(taskGenerator.generateTask('FINAL', FINAL, targetInfo, 1));

      return {
        name: `IRSC Analysis - ${params.periodValue}`,
        tasks
      };
    }

    if (['market_trends', 'industry_development', 'financial_product_rating'].includes(params.category)) {
      const taskGenerator = new TaskGenerator();
      const targetInfo = `Target: ${params.keyword || 'General'} / Country: ${params.country || 'N/A'} / Period: ${params.periodValue} (Year: ${params.year})`;
      const tasks: ITaskDefinition[] = [];

      tasks.push(taskGenerator.generateTask('EXTERNAL_DATA_GATHERING', 'Gather external data based on target information and selected category.', targetInfo, 0));
      tasks.push(taskGenerator.generateTask('FINAL', FINAL, targetInfo, 1));

      return {
        name: `External Analysis - ${params.category} - ${params.periodValue}`,
        tasks
      };
    }

    return null;
  }
}

export const missionGenerator = new MissionGenerator();

