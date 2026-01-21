export interface IGenerateAnalysisParams {
  category: string;
  periodType: string;
  periodValue: string;
  year: number;
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

    // Info: (20260120 - Luphia) Simulate basic validation
    if (!params.category || !params.periodType) {
      throw new Error('Missing required parameters');
    }

    // Info: (20260120 - Luphia) Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Info: (20260120 - Luphia) Mock Response
    return {
      success: true,
      message: 'Analysis generated successfully',
      data: {
        reportId: `mock-report-${Date.now()}`,
        cost: 500,
        remainingBalance: 9500,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export const analysisService = new AnalysisService();
