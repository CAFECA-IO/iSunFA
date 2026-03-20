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
import * as CarbonHealthCheckPrompts from '@/constants/prompts/carbon_health_check';
import * as NetZeroEmissionsPrompts from '@/constants/prompts/net_zero_emissions';
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

      /**
       * Info: (20260316 - Tzuhan) 2. Final Synthesis Task (Order 1)
       * The prompt for FINAL depends on the inputs of previous tasks. 
       * Since we are not executing here, we save the raw template. 
       * The Executor will need to handle the prompt interpolation using results from Order 0 tasks.
       */
      tasks.push(taskGenerator.generateTask('FINAL', FINAL, targetInfo, 1));

      return {
        name: `IRSC Analysis - ${params.periodValue}`,
        tasks
      };
    }

    if (['market_trends', 'industry_development', 'financial_product_rating', 'carbon_health_check', 'net_zero_emissions'].includes(params.category)) {
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
        target: params.keyword || (['carbon_health_check', 'net_zero_emissions'].includes(params.category) ? 'Target Company' : 'General'),
        period: params.periodValue,
        year: params.year
      });

      const tasks: ITaskDefinition[] = [];

      interface IPromptModule {
        STEP_1_EVENT_COLLECTION_PROMPT: string;
        STEP_2_TAG_EXTRACTION_PROMPT: string;
        STEP_4_MARKET_REACTION_PROMPT: string;
        STEP_5_FORMATTED_OUTPUT_PROMPT: string;
        STEP_3_SUMMARY_AND_ANALYSIS_PROMPT?: string;
        STEP_3_1_SUMMARY_AND_ANALYSIS_PROMPT?: string;
        STEP_3_2_SUMMARY_AND_ANALYSIS_PROMPT?: string;
        STEP_3_FINAL_SUMMARY_AND_ANALYSIS_PROMPT?: string;
      }

      // Info: (20260316 - Tzuhan) Dynamically dispatch prompts based on external analysis category
      const promptMap: Record<string, IPromptModule> = {
        'market_trends': MarketAnalysisPrompts,
        'industry_development': IndustryDevelopmentPrompts,
        'financial_product_rating': FinancialProductRatingPrompts,
        'carbon_health_check': CarbonHealthCheckPrompts,
        'net_zero_emissions': NetZeroEmissionsPrompts,
      };
      const selectedPrompts = promptMap[params.category] || MarketAnalysisPrompts;

      // Info: (20260316 - Tzuhan) Build sequential analysis tasks using the selected prompt matrix
      tasks.push({
        type: 'MARKET_EVENT_COLLECTION',
        order: 0,
        data: {
          key: 'STEP_1',
          prompt: selectedPrompts.STEP_1_EVENT_COLLECTION_PROMPT,
          context: targetInfo
        }
      });

      tasks.push({
        type: 'MARKET_TAG_EXTRACTION',
        order: 1,
        data: {
          key: 'STEP_2',
          prompt: selectedPrompts.STEP_2_TAG_EXTRACTION_PROMPT,
          context: targetInfo
        }
      });

      if (selectedPrompts.STEP_3_1_SUMMARY_AND_ANALYSIS_PROMPT) {
        // Info: (20260320 - AI) Dynamically split massive 100-question prompt into smaller tasks
        tasks.push({
          type: 'MARKET_SUMMARY_ANALYSIS',
          order: 2,
          data: {
            key: 'STEP_3_1',
            prompt: selectedPrompts.STEP_3_1_SUMMARY_AND_ANALYSIS_PROMPT!,
            context: targetInfo
          }
        });

        tasks.push({
          type: 'MARKET_SUMMARY_ANALYSIS',
          order: 3,
          data: {
            key: 'STEP_3_2',
            prompt: selectedPrompts.STEP_3_2_SUMMARY_AND_ANALYSIS_PROMPT!,
            context: targetInfo
          }
        });

        tasks.push({
          type: 'MARKET_SUMMARY_ANALYSIS',
          order: 4,
          data: {
            key: 'STEP_3_FINAL',
            prompt: selectedPrompts.STEP_3_FINAL_SUMMARY_AND_ANALYSIS_PROMPT!,
            context: targetInfo
          }
        });

        tasks.push({
          type: 'MARKET_REACTION_PREDICTION',
          order: 5,
          data: {
            key: 'STEP_4',
            prompt: selectedPrompts.STEP_4_MARKET_REACTION_PROMPT,
            context: targetInfo
          }
        });

        tasks.push({
          type: 'MARKET_FORMATTED_OUTPUT',
          order: 6,
          data: {
            key: 'STEP_5',
            prompt: selectedPrompts.STEP_5_FORMATTED_OUTPUT_PROMPT,
            context: targetInfo
          }
        });

      } else {
        tasks.push({
          type: 'MARKET_SUMMARY_ANALYSIS',
          order: 2,
          data: {
            key: 'STEP_3',
            prompt: selectedPrompts.STEP_3_SUMMARY_AND_ANALYSIS_PROMPT!,
            context: targetInfo
          }
        });

        tasks.push({
          type: 'MARKET_REACTION_PREDICTION',
          order: 3,
          data: {
            key: 'STEP_4',
            prompt: selectedPrompts.STEP_4_MARKET_REACTION_PROMPT,
            context: targetInfo
          }
        });

        tasks.push({
          type: 'MARKET_FORMATTED_OUTPUT',
          order: 4,
          data: {
            key: 'STEP_5',
            prompt: selectedPrompts.STEP_5_FORMATTED_OUTPUT_PROMPT,
            context: targetInfo
          }
        });
      }

      return {
        name: `External Analysis - ${params.category} - ${params.periodValue}`,
        tasks
      };
    }

    return null;
  }
}

export const missionGenerator = new MissionGenerator();

