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
import * as MarketAnalysisPrompts from '@/constants/prompts/market_analysis';
import * as FinancialProductRatingPrompts from '@/constants/prompts/financial_product_rating';
import * as IndustryDevelopmentPrompts from '@/constants/prompts/industry_development';
import { getPeriodDateRange } from '@/lib/analysis/period';

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

const COUNTRY_MAPPING: Record<string, string> = {
  'tw': '臺灣',
  'us': '美國',
  'cn': '中國',
  'jp': '日本',
  'eu': '歐洲',
};

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
      const countryName = params.country ? (COUNTRY_MAPPING[params.country] || params.country) : '台灣';
      let startDateStr = 'N/A';
      let endDateStr = 'N/A';

      try {
        const { start, end } = getPeriodDateRange(params.periodType, params.year, params.periodValue);
        startDateStr = start;
        endDateStr = end;
      } catch (e) {
        console.warn('Failed to parse date range for mission generator:', e);
      }

      const targetInfo = JSON.stringify({
        category: params.category,
        startDate: startDateStr,
        endDate: endDateStr,
        marketName: countryName,
        target: params.keyword || 'General',
        period: params.periodValue,
        year: params.year
      });

      const tasks: ITaskDefinition[] = [];

      let promptSet: Record<string, string> = MarketAnalysisPrompts;
      if (params.category === 'financial_product_rating') {
        promptSet = FinancialProductRatingPrompts;
      } else if (params.category === 'industry_development') {
        promptSet = IndustryDevelopmentPrompts;
      }

      // Info: (20260310 - Tzuhan) Step 1: Event Collection
      tasks.push({
        type: 'MARKET_EVENT_COLLECTION',
        order: 0,
        data: {
          key: 'STEP_1',
          prompt: promptSet.STEP_1_EVENT_COLLECTION_PROMPT,
          context: targetInfo
        }
      });

      // Info: (20260310 - Tzuhan) Step 2: Tag Extraction
      tasks.push({
        type: 'MARKET_TAG_EXTRACTION',
        order: 1,
        data: {
          key: 'STEP_2',
          prompt: promptSet.STEP_2_TAG_EXTRACTION_PROMPT,
          context: targetInfo
        }
      });

      // Info: (20260310 - Tzuhan) Step 3: Summary and Analysis
      tasks.push({
        type: 'MARKET_SUMMARY_ANALYSIS',
        order: 2,
        data: {
          key: 'STEP_3',
          prompt: promptSet.STEP_3_SUMMARY_AND_ANALYSIS_PROMPT,
          context: targetInfo
        }
      });

      // Info: (20260310 - Tzuhan) Step 4: Market Reaction
      tasks.push({
        type: 'MARKET_REACTION_PREDICTION',
        order: 3,
        data: {
          key: 'STEP_4',
          prompt: promptSet.STEP_4_MARKET_REACTION_PROMPT,
          context: targetInfo
        }
      });

      // Info: (20260310 - Tzuhan)Step 5: Formatted Output
      tasks.push({
        type: 'MARKET_FORMATTED_OUTPUT',
        order: 4,
        data: {
          key: 'STEP_5',
          prompt: promptSet.STEP_5_FORMATTED_OUTPUT_PROMPT,
          context: targetInfo
        }
      });

      return {
        name: `External Analysis - ${params.category} - ${params.periodValue}`,
        tasks
      };
    }

    return null;
  }
}

export const missionGenerator = new MissionGenerator();

