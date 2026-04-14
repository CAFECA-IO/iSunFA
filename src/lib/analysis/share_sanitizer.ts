/**
 * Info: (20260410 - Tzuhan)
 * 分享清洗器 - 涵蓋全系統 11 種報告
 */

export interface IShareDataInput {
    keyword?: string | null;
    targetCompany?: string | null;
    companyName?: string | null;
    [key: string]: string | number | boolean | object | null | undefined;
}

export interface IShareResultInput {
    content?: string | null;
    markdown?: string | null;
    [key: string]: string | number | boolean | object | null | undefined;
}

export type TShareData = IShareDataInput | null | undefined;
export type TShareResult = string | IShareResultInput | null | undefined;

export interface ICarbonMetrics {
    score: string | null;
    tags: string[];
    strategicPosition: string | null;
}

export interface IFinancialMetrics {
    rating: string | null;
    tags: string[];
}

export type TAllShareMetrics = ICarbonMetrics | IFinancialMetrics | null;

export interface IPublicReportData<TMetrics> {
    companyName: string;
    safeMarkdown: string;
    metrics: TMetrics;
}

const extractMarkdown = (result: TShareResult): string => {
    if (typeof result === 'string') return result;
    if (typeof result === 'object' && result !== null) {
        if (typeof result.content === 'string') return result.content;
        if (typeof result.markdown === 'string') return result.markdown;
    }
    return '';
};

const extractCompanyName = (data: TShareData, fallback: string): string => {
    if (typeof data === 'object' && data !== null) {
        if (typeof data.keyword === 'string' && data.keyword.trim() !== '') return data.keyword;
        if (typeof data.targetCompany === 'string' && data.targetCompany.trim() !== '') return data.targetCompany;
        if (typeof data.companyName === 'string' && data.companyName.trim() !== '') return data.companyName;
    }
    return fallback;
};

const redactMarkdownTables = (markdown: string): string => {
    const tableRegex = /\|.*\|[\r\n]+\|[-:\s|]+\|[\r\n]+(\|.*\|[\r\n]+)+/g;
    return markdown.replace(tableRegex, '\n> **🔒 [系統提示] 依據隱私保護原則，詳細財務與金額數據已隱藏，僅公開 AI 查核與戰略總結。**\n\n');
};

export interface IShareSanitizeStrategy<TMetrics> {
    sanitize(data: TShareData, result: TShareResult): IPublicReportData<TMetrics>;
}

export class CarbonSanitizer implements IShareSanitizeStrategy<ICarbonMetrics> {
    sanitize(data: TShareData, result: TShareResult): IPublicReportData<ICarbonMetrics> {
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

export class RatingSanitizer implements IShareSanitizeStrategy<IFinancialMetrics> {
    sanitize(data: TShareData, result: TShareResult): IPublicReportData<IFinancialMetrics> {
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

export class FinancialReportSanitizer implements IShareSanitizeStrategy<null> {
    sanitize(data: TShareData, result: TShareResult): IPublicReportData<null> {
        const rawMarkdown = extractMarkdown(result);
        const redactedMarkdown = redactMarkdownTables(rawMarkdown);

        return {
            companyName: extractCompanyName(data, '企業'),
            safeMarkdown: redactedMarkdown,
            metrics: null,
        };
    }
}

export class ShareSanitizerFactory {
    static getSanitizer(category: string): IShareSanitizeStrategy<TAllShareMetrics> {
        switch (category) {
            case 'carbon_health_check':
            case 'net_zero_emissions':
                return new CarbonSanitizer();

            case 'financial_product_rating':
            case 'irsc':
            case 'industry_development':
            case 'market_trends':
                return new RatingSanitizer();

            case 'balance_sheet':
            case 'cash_flow':
            case 'income_statement':
            case 'financial_health':
            case 'financial_compliance':
                return new FinancialReportSanitizer();

            default:
                throw new Error(`[Security Guard] Unsupported share category: '${category}'.`);
        }
    }
}
