// Info: (20260411 - Tzuhan) 統一的輸入介面 (Aggregated Input DTOs)
// Info: (20260411 - Tzuhan) 涵蓋所有可能從 Prisma JsonValue 取出的欄位
export interface IShareDataInput {
    keyword?: string;
    companyName?: string;
    targetCompany?: string;
}

export interface IShareResultInput {
    // Info: (20260411 - Tzuhan) 碳排相關欄位
    totalEmissions?: number | null;
    score?: number | null;
    hotspots?: Array<{ category?: string; percentage?: number }>;

    // Info: (20260411 - Tzuhan) 財務與評級相關欄位
    finalRating?: string;
    rating?: string;
    riskLevel?: string;
    executiveSummary?: string;
    keyHighlights?: string[];

    // Info: (20260411 - Tzuhan) 共用欄位
    aiSummary?: string;
    summary?: { aiSummary?: string };
}

// Info: (20260411 - Tzuhan) 嚴格的輸出介面 (Strict Output Types)
export interface ICarbonMetrics {
    totalEmissions: number | null;
    score: number | null;
    hotspots: Array<{ category: string; percentage: number }>;
}

export interface IFinancialMetrics {
    finalRating: string;
    riskLevel: string;
    keyHighlights: string[];
}

export interface IPublicReportData<TMetrics> {
    companyName: string;
    aiSummary: string;
    metrics: TMetrics;
}

// Info: (20260411 - Tzuhan) 策略介面：只保留「輸出」的泛型
export interface IShareSanitizeStrategy<TMetrics> {
    sanitize(data: IShareDataInput | null, result: IShareResultInput | null): IPublicReportData<TMetrics>;
}

// Info: (20260411 - Tzuhan) 策略實作區
export class CarbonSanitizer implements IShareSanitizeStrategy<ICarbonMetrics> {
    sanitize(data: IShareDataInput | null, result: IShareResultInput | null): IPublicReportData<ICarbonMetrics> {
        const safeData = data || {};
        const safeResult = result || {};

        return {
            companyName: safeData.keyword || safeData.companyName || '未公開企業',
            aiSummary: safeResult.aiSummary || safeResult.summary?.aiSummary || '暫無公開摘要',
            metrics: {
                totalEmissions: safeResult.totalEmissions ?? null,
                score: safeResult.score ?? null,
                hotspots: (safeResult.hotspots || []).map(h => ({
                    category: h?.category || 'Other',
                    percentage: h?.percentage || 0,
                })),
            },
        };
    }
}

export class FinancialSanitizer implements IShareSanitizeStrategy<IFinancialMetrics> {
    sanitize(data: IShareDataInput | null, result: IShareResultInput | null): IPublicReportData<IFinancialMetrics> {
        const safeData = data || {};
        const safeResult = result || {};

        return {
            companyName: safeData.keyword || safeData.targetCompany || '未公開企業',
            aiSummary: safeResult.executiveSummary || safeResult.aiSummary || '暫無公開摘要',
            metrics: {
                finalRating: safeResult.finalRating || safeResult.rating || 'N/A',
                riskLevel: safeResult.riskLevel || '未評估',
                keyHighlights: (safeResult.keyHighlights || []).filter(item => typeof item === 'string'),
            },
        };
    }
}

// Info: (20260411 - Tzuhan) 工廠模式 (Factory)
export class ShareSanitizerFactory {
    /**
     * Info: (20260411 - Tzuhan)
     * 由於輸出型別 (TMetrics) 是協變的 (Covariant)，
     * TypeScript 允許我們將 <ICarbonMetrics> 或 <IFinancialMetrics> 
     * 自然地回傳給宣告為 <unknown> 的介面，不需寫任何 as cast！
     */
    static getSanitizer(category: string): IShareSanitizeStrategy<unknown> {
        switch (category) {
            case 'carbon_health_check':
            case 'net_zero_emissions':
                return new CarbonSanitizer();

            case 'financial_product_rating':
            case 'irsc':
            case 'industry_development':
                return new FinancialSanitizer();

            default:
                throw new Error(
                    `[Security Guard] Unsupported share category: '${category}'. Sharing is blocked to prevent data leakage.`
                );
        }
    }
}