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
import * as BalanceSheetPrompts from '@/constants/prompts/balance_sheet';
import * as CashFlowPrompts from '@/constants/prompts/cash_flow';
import * as IncomeStatementPrompts from '@/constants/prompts/income_statement';
import * as FinancialCompliancePrompts from '@/constants/prompts/financial_compliance';
import * as FinancialHealthPrompts from '@/constants/prompts/financial_health';
import { getPeriodDateRange } from '@/lib/analysis/period';
import { JOURNAL_PROMPT } from '@/constants/prompts/journal';
import { getVoucherPrompt } from '@/constants/prompts/voucher';
import { ESG_PROMPT } from '@/constants/prompts/esg';

export interface IMissionParams {
  category: string;
  periodType: string;
  periodValue: string;
  year: number;
  country?: string;
  keyword?: string;
  fileId?: string; // Info: (20260320 - Julian) 用於 AI 分析日記帳、傳票和碳盤查
  fileBase64?: string; // Info: (20260320 - Julian) 傳入檔案的 base64 字串
  fileMimeType?: string; // Info: (20260320 - Julian) 傳入檔案的 mimeType
  accountBookId?: string;
  prerequisiteData?: Record<string, unknown>;
  isExternal?: boolean;
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
      const countryName = params.country ? (COUNTRY_MAPPING[params.country] || params.country) : '臺灣';
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
        year: params.year,
        esgRecordsContext: params.category === 'carbon_health_check' ? params.prerequisiteData?.esgRecordsContext : undefined
      });

      const tasks: ITaskDefinition[] = [];

      interface IPromptModule {
        STEP_1_EVENT_COLLECTION_PROMPT: string;
        STEP_2_TAG_EXTRACTION_PROMPT?: string;
        STEP_4_MARKET_REACTION_PROMPT?: string;
        STEP_5_FORMATTED_OUTPUT_PROMPT?: string;
        STEP_3_SUMMARY_AND_ANALYSIS_PROMPT?: string;
        STEP_3_1_SUMMARY_AND_ANALYSIS_PROMPT?: string;
        STEP_3_2_SUMMARY_AND_ANALYSIS_PROMPT?: string;
        STEP_3_FINAL_SUMMARY_AND_ANALYSIS_PROMPT?: string;
        buildNetZeroPrompt?: (params: import('@/constants/prompts/net_zero_emissions').INetZeroPromptParams) => string;
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

      // Info: (20260320 - AI) Net Zero Emissions has a special singular prompt builder
      if (params.category === 'net_zero_emissions' && selectedPrompts.buildNetZeroPrompt) {
        // Info: (20260320 - Tzuhan) Evaluate dynamic prompt
        const p = (params.prerequisiteData as unknown as import('@/constants/prompts/net_zero_emissions').INetZeroPromptParams) || {
          carbonHealthScore: 0,
          tier2Status: 'NONE',
          failedQuestions: ['尚未檢測出明確痛點'],
          companyIndustry: '未分類產業'
        };
        const generatedPrompt = selectedPrompts.buildNetZeroPrompt(p);

        tasks.push({
          type: 'MARKET_FORMATTED_OUTPUT',
          order: 1,
          data: {
            key: 'STEP_5', // Info: (20260320 - Tzuhan) Usually uses [STEP_1_CONTENT] which the engine provides automatically
            prompt: generatedPrompt,
            context: targetInfo
          }
        });
      } else {
        if (selectedPrompts.STEP_2_TAG_EXTRACTION_PROMPT) {
          tasks.push({
            type: 'MARKET_TAG_EXTRACTION',
            order: 1,
            data: {
              key: 'STEP_2',
              prompt: selectedPrompts.STEP_2_TAG_EXTRACTION_PROMPT,
              context: targetInfo
            }
          });
        }

        if (selectedPrompts.STEP_3_1_SUMMARY_AND_ANALYSIS_PROMPT && selectedPrompts.STEP_3_2_SUMMARY_AND_ANALYSIS_PROMPT && selectedPrompts.STEP_3_FINAL_SUMMARY_AND_ANALYSIS_PROMPT && selectedPrompts.STEP_4_MARKET_REACTION_PROMPT && selectedPrompts.STEP_5_FORMATTED_OUTPUT_PROMPT) {
          // Info: (20260320 - Tzuhan) Dynamically split massive 100-question prompt into smaller tasks
          tasks.push({
            type: 'MARKET_SUMMARY_ANALYSIS',
            order: 2,
            data: {
              key: 'STEP_3_1',
              prompt: selectedPrompts.STEP_3_1_SUMMARY_AND_ANALYSIS_PROMPT,
              context: targetInfo
            }
          });

          tasks.push({
            type: 'MARKET_SUMMARY_ANALYSIS',
            order: 3,
            data: {
              key: 'STEP_3_2',
              prompt: selectedPrompts.STEP_3_2_SUMMARY_AND_ANALYSIS_PROMPT,
              context: targetInfo
            }
          });

          tasks.push({
            type: 'MARKET_SUMMARY_ANALYSIS',
            order: 4,
            data: {
              key: 'STEP_3_FINAL',
              prompt: selectedPrompts.STEP_3_FINAL_SUMMARY_AND_ANALYSIS_PROMPT,
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

        } else if (selectedPrompts.STEP_3_SUMMARY_AND_ANALYSIS_PROMPT && selectedPrompts.STEP_4_MARKET_REACTION_PROMPT && selectedPrompts.STEP_5_FORMATTED_OUTPUT_PROMPT) {
          tasks.push({
            type: 'MARKET_SUMMARY_ANALYSIS',
            order: 2,
            data: {
              key: 'STEP_3',
              prompt: selectedPrompts.STEP_3_SUMMARY_AND_ANALYSIS_PROMPT,
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
      }

      return {
        name: `External Analysis - ${params.category} - ${params.periodValue}`,
        tasks
      };
    }

    const internalParallelCategories = ['balance_sheet', 'cash_flow', 'income_statement', 'financial_compliance', 'financial_health'];
    if (internalParallelCategories.includes(params.category)) {
      const taskGenerator = new TaskGenerator();

      const targetObj: Record<string, unknown> = {
        category: params.category,
        period: params.periodValue,
        year: params.year,
        targetCompany: params.keyword || 'Company'
      };
      if (params.prerequisiteData?.esgRecordsContext) {
        targetObj.internalDataContext = params.prerequisiteData.esgRecordsContext;
      }
      const targetInfo = JSON.stringify(targetObj, null, 2);

      const tasks: ITaskDefinition[] = [];
      let promptMap: { key: string, prompt: string }[] = [];
      let finalPrompt = '';

      switch (params.category) {
        case 'balance_sheet':
          promptMap = [
            { key: 'LIQUIDITY', prompt: BalanceSheetPrompts.LIQUIDITY_PROMPT },
            { key: 'SOLVENCY', prompt: BalanceSheetPrompts.SOLVENCY_PROMPT },
            { key: 'ASSET_QUALITY', prompt: BalanceSheetPrompts.ASSET_QUALITY_PROMPT }
          ];
          finalPrompt = BalanceSheetPrompts.FINAL_PROMPT;
          break;
        case 'cash_flow':
          promptMap = [
            { key: 'OPERATING', prompt: CashFlowPrompts.OPERATING_PROMPT },
            { key: 'INVESTING', prompt: CashFlowPrompts.INVESTING_PROMPT },
            { key: 'FINANCING', prompt: CashFlowPrompts.FINANCING_PROMPT }
          ];
          finalPrompt = CashFlowPrompts.FINAL_PROMPT;
          break;
        case 'income_statement':
          promptMap = [
            { key: 'REVENUE', prompt: IncomeStatementPrompts.REVENUE_PROMPT },
            { key: 'PROFITABILITY', prompt: IncomeStatementPrompts.PROFITABILITY_PROMPT },
            { key: 'COST_STRUCTURE', prompt: IncomeStatementPrompts.COST_STRUCTURE_PROMPT }
          ];
          finalPrompt = IncomeStatementPrompts.FINAL_PROMPT;
          break;
        case 'financial_compliance':
          promptMap = [
            { key: 'FRAUD_DETECTION', prompt: FinancialCompliancePrompts.FRAUD_DETECTION_PROMPT },
            { key: 'ABNORMAL_TRANSACTIONS', prompt: FinancialCompliancePrompts.ABNORMAL_TRANSACTIONS_PROMPT },
            { key: 'REGULATORY', prompt: FinancialCompliancePrompts.REGULATORY_COMPLIANCE_PROMPT }
          ];
          finalPrompt = FinancialCompliancePrompts.FINAL_PROMPT;
          break;
        case 'financial_health':
          promptMap = [
            { key: 'DUPONT', prompt: FinancialHealthPrompts.DUPONT_PROMPT },
            { key: 'GROWTH', prompt: FinancialHealthPrompts.GROWTH_PROMPT },
            { key: 'WORKING_CAPITAL', prompt: FinancialHealthPrompts.WORKING_CAPITAL_PROMPT }
          ];
          finalPrompt = FinancialHealthPrompts.FINAL_PROMPT;
          break;
      }

      const dataSourceInstruction = params.isExternal
        ? '請強制啟動網路搜尋功能，抓取該公司最新公開的財報與數據進行深度的客觀分析。'
        : '請嚴格基於系統提供的內部數據庫資料（包含但不限於內部財務報表、傳票、日記帳、綠色/ESG數據紀錄等），禁止使用網路搜尋獲取外部財報。請純粹判斷內部資料。';

      const targetCompanyName = params.keyword || '該企業';
      const periodName = `${params.periodType === 'yearly' ? '年度' : params.periodType === 'seasonly' ? '季度' : params.periodType === 'monthly' ? '月份' : params.periodValue}`;

      promptMap.forEach(item => {
        const injectedPrompt = item.prompt
          .replace('{Data_Source_Instruction}', dataSourceInstruction)
          .replace(/\{Target_Company\}/g, targetCompanyName)
          .replace(/\{Period\}/g, periodName)
          .replace(/\{Year\}/g, String(params.year || '未提供'));

        tasks.push(taskGenerator.generateTask(item.key, injectedPrompt, targetInfo, 0));
      });

      const injectedFinalPrompt = finalPrompt
        .replace(/\{Target_Company\}/g, targetCompanyName)
        .replace(/\{Period\}/g, periodName)
        .replace(/\{Year\}/g, String(params.year || '未提供'));

      tasks.push(taskGenerator.generateTask('FINAL', injectedFinalPrompt, targetInfo, 1));

      return {
        name: `Internal Analysis - ${params.category} - ${params.periodValue}`,
        tasks
      };
    }

    // Info: (20260320 - Julian) AI 分析日記帳、傳票和碳盤查
    if (params.category === 'document_parsing') {
      const tasks: ITaskDefinition[] = [];
      const context = JSON.stringify({
        fileId: params.fileId,
        fileBase64: params.fileBase64,
        fileMimeType: params.fileMimeType,
        accountBookId: params.accountBookId
      });

      tasks.push({
        type: 'JOURNAL_PARSING',
        order: 0,
        data: {
          key: 'JOURNAL',
          prompt: JOURNAL_PROMPT,
          context
        }
      });

      tasks.push({
        type: 'VOUCHER_PARSING',
        order: 0,
        data: {
          key: 'VOUCHER',
          prompt: getVoucherPrompt(params.accountBookId),
          context
        }
      });

      tasks.push({
        type: 'ESG_PARSING',
        order: 0,
        data: {
          key: 'ESG',
          prompt: ESG_PROMPT,
          context
        }
      });

      return {
        name: `Document Parsing - ${params.fileId}`,
        tasks
      };
    }

    return null;
  }
}

export const missionGenerator = new MissionGenerator();

