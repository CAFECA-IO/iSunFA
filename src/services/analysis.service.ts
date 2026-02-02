import { mkdir } from 'fs/promises';
import path from 'path';
import { getAnalysisCost } from '@/lib/analysis/pricing';
import { storageService } from '@/services/storage.service';
import { analysisRepo } from '@/repositories/analysis.repo';
import { promises as fs } from 'fs';
import { missionGenerator, IMissionDefinition } from '@/lib/worker/mission.generator';


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

    // Info: (20260129 - Luphia) Generate Mission Content via MissionGenerator
    let missionDef: IMissionDefinition | null = null;
    let analysisResult = "AI Analysis Content Placeholder...";

    try {
      missionDef = missionGenerator.generateMission({
        category: params.category,
        periodType: params.periodType,
        periodValue: params.periodValue,
        year: params.year
      });

      if (missionDef) {
        analysisResult = "Analysis Mission Generated. Pending Execution.";
      }
    } catch (error) {
      console.error('[AnalysisService] Mission Generation Failed:', error);
      analysisResult = "Analysis Generation Failed. Please contact support.";
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
          missionName: missionDef ? missionDef.name : `Analysis-${params.category}-${params.periodType}`,
          missionData: {
            cost,
            remainingBalance: 9500,
            generatedAt: new Date().toISOString(),
            planHash: reportId,
            periodType: params.periodType,
            periodValue: params.periodValue,
            year: params.year
          },
          tasks: missionDef ? missionDef.tasks : undefined // Info: (20260130 - Luphia) Save tasks to DB
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
