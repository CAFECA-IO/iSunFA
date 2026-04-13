// Info: (20260413 - Tzuhan) 定義 Prisma data 可能包含的欄位
export interface IShareDataInput {
    keyword?: string | null;
    targetCompany?: string | null;
    companyName?: string | null;
    // Info: (20260413 - Tzuhan) 保留擴充性：允許 JSON 中有其他未定義的欄位，但型別受限
    [key: string]: string | number | boolean | object | null | undefined;
}

// Info: (20260413 - Tzuhan) 定義 Prisma result 可能為 Object 時的欄位
export interface IShareResultInput {
    content?: string | null;
    markdown?: string | null;
    [key: string]: string | number | boolean | object | null | undefined;
}

// Info: (20260413 - Tzuhan) Result 可能是純 Markdown 字串，也可能是包裝過的 Object
export type TShareData = IShareDataInput | null | undefined;
export type TShareResult = string | IShareResultInput | null | undefined;

// Info: (20260413 - Tzuhan) 嚴格輸出型別定義 (Output Interfaces)
export interface ICarbonMetrics {
    score: string | null;
    tags: string[];
    strategicPosition: string | null;
}

export interface IFinancialMetrics {
    rating: string | null;
    tags: string[];
}

// Info: (20260413 - Tzuhan) 將所有 Metrics 聯合起來，給 Factory 統一回傳使用
export type TAllShareMetrics = ICarbonMetrics | IFinancialMetrics | null;

export interface IPublicReportData<TMetrics> {
    companyName: string;
    safeMarkdown: string;
    metrics: TMetrics;
}

/** Info: (20260410 - Tzuhan) 嘗試從 Prisma JsonValue 中安全提取 Markdown 字串 */
const extractMarkdown = (result: TShareResult): string => {
    if (typeof result === 'string') return result;
    if (typeof result === 'object' && result !== null) {
        if (typeof result.content === 'string') return result.content;
        if (typeof result.markdown === 'string') return result.markdown;
    }
    return '';
};

/** Info: (20260410 - Tzuhan) 從 Prisma Data 中安全提取公司名稱 */
const extractCompanyName = (data: TShareData, fallback: string): string => {
    if (typeof data === 'object' && data !== null) {
        if (typeof data.keyword === 'string' && data.keyword.trim() !== '') return data.keyword;
        if (typeof data.targetCompany === 'string' && data.targetCompany.trim() !== '') return data.targetCompany;
        if (typeof data.companyName === 'string' && data.companyName.trim() !== '') return data.companyName;
    }
    return fallback;
};

// Info: (20260410 - Tzuhan) 隱藏 Markdown 中的所有表格 (防護財報機密金額)
const redactMarkdownTables = (markdown: string): string => {
    const tableRegex = /\|.*\|[\r\n]+\|[-:\s|]+\|[\r\n]+(\|.*\|[\r\n]+)+/g;
    return markdown.replace(tableRegex, '\n> **🔒 [系統提示] 依據隱私保護原則，詳細財務與金額數據已隱藏，僅公開 AI 查核與戰略總結。**\n\n');
};

// Info: (20260413 - Tzuhan) 策略實作區
export interface IShareSanitizeStrategy<TMetrics> {
    sanitize(data: TShareData, result: TShareResult): IPublicReportData<TMetrics>;
}

/**
 * Info: (20260410 - Tzuhan) 策略 A：碳排與永續報告 (Carbon Health Check)
 */
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

/**
 * Info: (20260410 - Tzuhan) 策略 B：量化金融與市場評級 (Quant & Rating)
 */
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

/**
 * Info: (20260410 - Tzuhan) 策略 C：極密財務報表 (Balance Sheet, Income Statement)
 */
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

// Info: (20260413 - Tzuhan) 工廠模式 (Factory)
export class ShareSanitizerFactory {
    // Info: (20260413 - Tzuhan) 這裡運用了型別協變 (Covariance) 技術，將 TAllShareMetrics 聯集型別作為泛型回傳
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
                throw new Error(
                    `[Security Guard] Unsupported share category: '${category}'. Sharing is blocked.`
                );
        }
    }
}