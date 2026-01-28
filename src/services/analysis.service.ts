import { mkdir } from 'fs/promises';
import path from 'path';
import { getAnalysisCost } from '@/lib/analysis/pricing';
import { storageService } from '@/services/storage.service';
import { analysisRepo } from '@/repositories/analysis.repo';
import { promises as fs } from 'fs';
import { ChatService } from '@/services/chat.service';
import { COMPANY as ECQ } from '@/constants/prompts/company/ecq';
import { COMPANY as ERE } from '@/constants/prompts/company/ere';
import { COMPANY as GDI } from '@/constants/prompts/company/gdi';
import { COMPANY as GES } from '@/constants/prompts/company/ges';
import { COMPANY as MMP } from '@/constants/prompts/company/mmp';
import { COMPANY as SRR } from '@/constants/prompts/company/srr';
import { COMPANY as TPM } from '@/constants/prompts/company/tpm';
import { COMPANY as UEE } from '@/constants/prompts/company/uee';
import { COMPANY as FINAL } from '@/constants/prompts/company/final';


export interface IGenerateAnalysisParams {
  category: string;
  periodType: string;
  periodValue: string;
  year: number;
  orderId?: string;
}

export class AnalysisService {
  /**
   * Info: (20260120 - Luphia) Mock generation of financial analysis.
   * In a real implementation, this would:
   * 1. Validate the user and credits.
   * 2. Deduct credits via transaction.
   * 3. Trigger the AI analysis job.
   * 4. Return the job ID or result.
   */
  async generateAnalysis(userId: string, params: IGenerateAnalysisParams) {
    console.log(`[AnalysisService] Generating for ${userId}:`, params);

    /**
     * Info: (20260128 - Luphia) Calculate dynamic cost
     * Note: In production this cost should ideally be passed from the trusted Order 
     * or recalculated and verified to match the Order.
     */
    const cost = getAnalysisCost(params);

    // Info: (20260120 - Luphia) Simulate basic validation
    if (!params.category || !params.periodType) {
      throw new Error('Missing required parameters');
    }

    let analysisResult = "AI Analysis Content Placeholder...";

    // Info: (20260128 - Luphia) IRSC Split-Task Execution
    if (params.category === 'irsc') {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('Missing GEMINI_API_KEY');
        }

        const chatService = new ChatService(apiKey);
        const targetInfo = `Target Company: ${params.periodValue} (Fiscal Year: ${params.year})`;
        console.log(`[AnalysisService] Starting IRSC Analysis for ${targetInfo}...`);

        const tasks = [
          { key: 'ECQ', prompt: ECQ },
          { key: 'MMP', prompt: MMP },
          { key: 'UEE', prompt: UEE },
          { key: 'GDI', prompt: GDI },
          { key: 'TPM', prompt: TPM },
          { key: 'SRR', prompt: SRR },
          { key: 'ERE', prompt: ERE },
          { key: 'GES', prompt: GES },
        ];

        // Info: (20260128 - Luphia) Execute 8 dimensions in parallel
        const results = await Promise.all(
          tasks.map(async (task) => {
            console.log(`[AnalysisService] Running task: ${task.key}`);
            const fullPrompt = `${targetInfo}\n\n${task.prompt}`;
            // Info: (20260128 - Luphia) Use generating model to get analysis for specific dimension
            const result = await chatService.generateRaw(fullPrompt);
            return { key: task.key, content: result };
          })
        );

        console.log(`[AnalysisService] All dimensions completed. Synthesizing final report...`);

        // Info: (20260128 - Luphia) Construct Final Prompt
        let finalPrompt = FINAL;
        results.forEach(({ key, content }) => {
          finalPrompt = finalPrompt.replace(`[${key}_CONTENT]`, content);
        });

        // Info: (20260128 - Luphia) Add context to final prompt as well
        finalPrompt = `${targetInfo}\n\n${finalPrompt}`;

        // Info: (20260128 - Luphia) Generate Final Report
        analysisResult = await chatService.generateRaw(finalPrompt);
        console.log(`[AnalysisService] IRSC Final Report Generated.`);

      } catch (error) {
        console.error('[AnalysisService] IRSC Generation Failed:', error);
        analysisResult = "Failed to generate IRSC report. Please contact support.";
      }
    } else {
      // Info: (20260120 - Luphia) Simulate API delay for other categories
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Info: (20260128 - Luphia) Create Plan Content
    const planContent = {
      title: `Financial Analysis - ${params.category}`,
      userId,
      params,
      cost,
      createdAt: new Date().toISOString(),
      result: analysisResult
    };

    // Info: (20260128 - Luphia) Generate UUID (Hash) by uploading to Storage (Laria)
    let reportId: string;
    try {
      const planFile = new File([JSON.stringify(planContent)], 'plan.json', { type: 'application/json' });
      reportId = await storageService.uploadLaria(planFile);
      console.log(`[AnalysisService] Plan uploaded, hash (ID): ${reportId}`);
    } catch (error) {
      console.error(`[AnalysisService] Failed to upload plan:`, error);
      throw new Error('Failed to upload analysis plan');
    }

    const reportDir = path.join(process.cwd(), 'reports', reportId);

    // Info: (20260128 - Luphia) Create report directory
    try {
      await mkdir(reportDir, { recursive: true });
      console.log(`[AnalysisService] Created report directory: ${reportDir}`);

      // Info: (20260128 - Luphia) Save local backup
      await fs.writeFile(path.join(reportDir, 'plan.json'), JSON.stringify(planContent, null, 2));

    } catch (error) {
      console.error(`[AnalysisService] Failed to create report directory:`, error);
      throw new Error('Failed to initialize report storage');
    }

    // Info: (20260128 - Luphia) Save Analysis to Database
    if (params.orderId) {
      try {
        await analysisRepo.create({
          reportId,
          userId,
          orderId: params.orderId,
          category: params.category,
          missionName: `Analysis-${params.category}-${params.periodType}`,
          missionData: {
            cost,
            remainingBalance: 9500,
            generatedAt: new Date().toISOString(),
            planHash: reportId,
            periodType: params.periodType,
            periodValue: params.periodValue,
            year: params.year
          }
        });
      } catch (error) {
        console.error(`[AnalysisService] Failed to save report to DB:`, error);
        throw new Error('Failed to save report metadata');
      }
    }
    // Info: (20260120 - Luphia) Mock Response
    return {
      success: true,
      message: 'Analysis generated successfully',
      data: {
        reportId: reportId,
        cost: cost,
        remainingBalance: 9500,
        generatedAt: new Date().toISOString(),
        periodType: params.periodType,
        periodValue: params.periodValue,
        year: params.year
      },
    };
  }
}

export const analysisService = new AnalysisService();
