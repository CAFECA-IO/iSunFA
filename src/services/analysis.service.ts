import { mkdir } from 'fs/promises';
import { promises as fs } from 'fs';
import path from 'path';
import { getAnalysisCost } from '@/lib/analysis/pricing';
import { storageService } from '@/services/storage.service';
import { analysisRepo } from '@/repositories/analysis.repo';
import { missionGenerator, IMissionDefinition } from '@/lib/worker/mission.generator';
import { MISSION_STATUS } from '@/constants/status';


export interface IGenerateAnalysisParams {
  category: string;
  periodType: string;
  periodValue: string;
  year: number;
  orderId?: string;
  country?: string;
  keyword?: string;
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
        year: params.year,
        country: params.country,
        keyword: params.keyword
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

    // Info: (20260304 - Tzuhan) Create an instant UUID for reportId instead of waiting 15s for Laria Hash
    const reportId = crypto.randomUUID();

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

    let createdMissionId: string | undefined;

    // Info: (20260128 - Luphia) Save Analysis to Database *immediately*
    if (params.orderId) {
      try {
        const result = await analysisRepo.create({
          reportId,
          userId,
          orderId: params.orderId,
          category: params.category,
          missionName: missionDef ? missionDef.name : `Analysis-${params.category}-${params.periodType}`,
          status: MISSION_STATUS.UPLOADING,
          missionData: {
            cost,
            remainingBalance: 9500,
            generatedAt: new Date().toISOString(),
            planHash: null,
            periodType: params.periodType,
            periodValue: params.periodValue,
            year: params.year,
            country: params.country,
            keyword: params.keyword,
            historicalTags: await analysisRepo.getGlobalTopTags(20)
          },
          tasks: missionDef ? missionDef.tasks : undefined
        });
        createdMissionId = result.missionId || undefined;
      } catch (error) {
        console.error(`[AnalysisService] Failed to save report to DB:`, error);
        throw new Error('Failed to save report metadata');
      }
    }

    const planFile = new File([JSON.stringify(planContent)], 'plan.json', { type: 'application/json' });

    storageService.uploadLaria(planFile).then(async (hash) => {
      console.log(`[Info: (20260304 - Tzuhan)] BACKGROUND Plan uploaded, hash: ${hash} for Mission ${createdMissionId}`);
      if (createdMissionId) {
        try {
          await analysisRepo.updateMissionUploadSuccess(createdMissionId, hash);
          console.log(`[Info: (20260304 - Tzuhan)] BACKGROUND Mission ${createdMissionId} updated with planHash and set to PENDING`);
        } catch (e) {
          console.error(`[Info: (20260304 - Tzuhan)] BACKGROUND Failed to update mission with planHash:`, e);
        }
      }
    }).catch(async (error) => {
      console.error(`[Info: (20260304 - Tzuhan)] BACKGROUND Failed to upload plan:`, error);
      if (createdMissionId) {
        try {
          await analysisRepo.updateMissionUploadFailed(createdMissionId, 'File Upload Failed. Please contact support.');
          console.log(`[Info: (20260304 - Tzuhan)] BACKGROUND Mission ${createdMissionId} marked as FAILED due to upload error`);
        } catch (e) {
          console.error(`[Info: (20260304 - Tzuhan)] BACKGROUND Failed to mark mission as FAILED:`, e);
        }
      }
    });

    // Info: (20260120 - Luphia) Mock Response returned instantly
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
