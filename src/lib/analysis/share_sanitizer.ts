/**
 * Info: (20260410 - Tzuhan)
 * 暫時的版本，之後會再重構
 */
export interface ICarbonMetrics {
    score: string | null;
    tags: string[];
    strategicPosition: string | null;
}

export interface IFinancialMetrics {
    rating: string | null;
    tags: string[];
}

export interface IPublicReportData<TMetrics> {
    companyName: string;
    safeMarkdown: string;
    metrics: TMetrics;
}

// Info: (20260410 - Tzuhan) 工具函式 (Helpers)
/** Info: (20260410 - Tzuhan) 嘗試從 Prisma JsonValue 中安全提取 Markdown 字串 */
const extractMarkdown = (result: unknown): string => {
    if (typeof result === 'string') return result;
    if (typeof result === 'object' && result !== null) {
        // Info: (20260410 - Tzuhan) 應對可能的 JSON 結構，如 { content: "..." } 或 { markdown: "..." }
        const obj = result as Record<string, unknown>;
        if (typeof obj.content === 'string') return obj.content;
        if (typeof obj.markdown === 'string') return obj.markdown;
    }
    return '';
};

const extractCompanyName = (data: unknown, fallback: string): string => {
    if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        if (typeof obj.keyword === 'string' && obj.keyword.trim() !== '') return obj.keyword;
        if (typeof obj.targetCompany === 'string' && obj.targetCompany.trim() !== '') return obj.targetCompany;
        if (typeof obj.companyName === 'string' && obj.companyName.trim() !== '') return obj.companyName;
    }
    return fallback;
};

// Info: (20260410 - Tzuhan) 隱藏 Markdown 中的所有表格 (防護財報機密金額)
const redactMarkdownTables = (markdown: string): string => {
    const tableRegex = /\|.*\|[\r\n]+\|[-:\s|]+\|[\r\n]+(\|.*\|[\r\n]+)+/g;
    return markdown.replace(tableRegex, '\n> **🔒 [系統提示] 依據隱私保護原則，詳細財務與金額數據已隱藏，僅公開 AI 查核與戰略總結。**\n\n');
};

// Info: (20260410 - Tzuhan) 策略實作區
export interface IShareSanitizeStrategy<TMetrics> {
    sanitize(data: unknown, result: unknown): IPublicReportData<TMetrics>;
}

/**
 * Info: (20260410 - Tzuhan) 策略 A：碳排與永續報告 (Carbon Health Check)
 */
export class CarbonSanitizer implements IShareSanitizeStrategy<ICarbonMetrics> {
    sanitize(data: unknown, result: unknown): IPublicReportData<ICarbonMetrics> {
        const rawMarkdown = extractMarkdown(result);

        const scoreMatch = rawMarkdown.match(/碳健檢綜合評分：\s*(\d+(?:\.\d+)?)/);
        const tagsMatch = rawMarkdown.match(/減碳核心標籤：\s*\**([^*\n]+)\**/);
        const positionMatch = rawMarkdown.match(/戰略風險定位：\s*\**([^*\n]+)\**/);

        return {
            companyName: extractCompanyName(data, '企業'),
            safeMarkdown: rawMarkdown,
            metrics: {
                score: scoreMatch ? scoreMatch[1] : null,
                tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/#/g, '')) : [],
                strategicPosition: positionMatch ? positionMatch[1].trim() : null,
            },
        };
    }
}

/**
 * Info: (20260410 - Tzuhan) 策略 B：量化金融與市場評級 (Quant & Rating)
 */
export class RatingSanitizer implements IShareSanitizeStrategy<IFinancialMetrics> {
    sanitize(data: unknown, result: unknown): IPublicReportData<IFinancialMetrics> {
        const rawMarkdown = extractMarkdown(result);

        const ratingMatch = rawMarkdown.match(/評級結果：\s*\[?([^\]\n]+)\]?/);
        const tagsMatch = rawMarkdown.match(/產品風險與量化特徵：\s*\**([^*\n]+)\**/);

        return {
            companyName: extractCompanyName(data, '投資標的'),
            safeMarkdown: rawMarkdown,
            metrics: {
                rating: ratingMatch ? ratingMatch[1].replace(/[\*\[\]]/g, '').trim() : null,
                tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : [],
            },
        };
    }
}

/**
 * Info: (20260410 - Tzuhan) 策略 C：極密財務報表 (Balance Sheet, Income Statement)
 */
export class FinancialReportSanitizer implements IShareSanitizeStrategy<null> {
    sanitize(data: unknown, result: unknown): IPublicReportData<null> {
        const rawMarkdown = extractMarkdown(result);
        const redactedMarkdown = redactMarkdownTables(rawMarkdown);

        return {
            companyName: extractCompanyName(data, '企業'),
            safeMarkdown: redactedMarkdown,
            metrics: null,
        };
    }
}

// Info: (20260410 - Tzuhan) 工廠模式 (Factory)
export class ShareSanitizerFactory {
    static getSanitizer(category: string): IShareSanitizeStrategy<unknown> {
        switch (category) {
            // Info: (20260410 - Tzuhan) 永續系列
            case 'carbon_health_check':
            case 'net_zero_emissions':
                return new CarbonSanitizer();

            // Info: (20260410 - Tzuhan) 量化與評級系列
            case 'financial_product_rating':
            case 'irsc':
            case 'industry_development':
            case 'market_trends':
                return new RatingSanitizer();

            // Info: (20260410 - Tzuhan) 機密財報系列
            case 'balance_sheet':
            case 'cash_flow':
            case 'income_statement':
            case 'financial_health':
            case 'financial_compliance':
                return new FinancialReportSanitizer();

            default:
                throw new Error(
                    `[Security Guard] Unsupported share category: '${category}'. Sharing is blocked.`
                );
        }
    }
}