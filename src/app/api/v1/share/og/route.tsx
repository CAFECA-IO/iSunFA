import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { ShareSanitizerFactory, ICarbonMetrics, IFinancialMetrics } from '@/lib/analysis/share_sanitizer';

// 強制動態渲染，不快取，確保拿到最新的分享狀態
export const dynamic = 'force-dynamic';

// 簡單的字典檔 (因為 API Route 無法直接使用 useTranslation hook)
const CATEGORY_MAP: Record<string, string> = {
    carbon_health_check: '碳健檢報告',
    net_zero_emissions: '淨零碳排報告',
    financial_product_rating: '金融商品評級',
    irsc: '智能企業評級',
    industry_development: '產業發展分析',
    market_trends: '交易市場趨勢',
    balance_sheet: '資產負債表查核',
    cash_flow: '現金流量表查核',
    income_statement: '損益表查核',
    financial_health: '財務健康分析',
    financial_compliance: '財務合規審查',
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) throw new Error('Missing token');

        // 1. 撈取資料與驗證
        const shareRecord = await prisma.reportShareToken.findUnique({
            where: { token, isActive: true },
            include: { analysis: true }
        });

        if (!shareRecord) throw new Error('Token invalid or inactive');

        // 2. 呼叫 Sanitizer 取得安全資料 (抽出 Day 2 準備好的 metrics)
        const sanitizer = ShareSanitizerFactory.getSanitizer(shareRecord.category);
        const safeData = sanitizer.sanitize(shareRecord.analysis.data, shareRecord.analysis.result);

        const companyName = safeData.companyName;
        const categoryName = CATEGORY_MAP[shareRecord.category] || '專業分析報告';

        // 3. 判斷版型與提取分數/評級
        let displayScore = '';
        let displayTags: string[] = [];
        let isScoreMode = false;

        // 針對碳排系列 (有分數)
        if (['carbon_health_check', 'net_zero_emissions'].includes(shareRecord.category)) {
            const metrics = safeData.metrics as ICarbonMetrics;
            displayScore = metrics?.score || '';
            displayTags = metrics?.tags?.slice(0, 3) || []; // 最多顯示 3 個標籤
            isScoreMode = true;
        }
        // 針對金融評級系列 (有 Rating)
        else if (['financial_product_rating', 'irsc', 'industry_development'].includes(shareRecord.category)) {
            const metrics = safeData.metrics as IFinancialMetrics;
            displayScore = metrics?.rating || '';
            displayTags = metrics?.tags?.slice(0, 3) || [];
        }

        // 4. 開始使用 JSX 繪製圖片 (1200x630 是 Facebook/LINE/Twitter 最佳比例)
        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#FAFAFA', // bg-gray-50
                        fontFamily: 'sans-serif',
                        position: 'relative',
                    }}
                >
                    {/* 頂部裝飾條：iSunFA 品牌色漸層 */}
                    <div style={{ display: 'flex', width: '100%', height: '16px', background: 'linear-gradient(90deg, #EA580C 0%, #F97316 50%, #3B82F6 100%)' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', padding: '60px 80px', flex: 1, justifyContent: 'space-between' }}>

                        {/* Header: Logo 與 報告類型 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {/* 簡單畫一個 iSunFA 的 Logo 意象 */}
                                <div style={{ display: 'flex', width: '48px', height: '48px', borderRadius: '12px', background: '#EA580C', color: 'white', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold' }}>
                                    i
                                </div>
                                <span style={{ fontSize: '32px', fontWeight: 800, color: '#111827' }}>iSunFA 陽光智能會計</span>
                            </div>
                            <div style={{ display: 'flex', padding: '8px 24px', background: '#DBEAFE', borderRadius: '999px', border: '2px solid #BFDBFE' }}>
                                <span style={{ color: '#2563EB', fontSize: '24px', fontWeight: 600 }}>{categoryName}</span>
                            </div>
                        </div>

                        {/* Main Content: 公司名稱與核心分數 */}
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '60%' }}>
                                <span style={{ fontSize: '28px', color: '#6B7280', marginBottom: '16px' }}>分析目標</span>
                                <span style={{ fontSize: '72px', fontWeight: 900, color: '#111827', lineHeight: 1.1 }}>
                                    {companyName}
                                </span>

                                {/* 標籤 (Tags) */}
                                {displayTags.length > 0 && (
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '32px', flexWrap: 'wrap' }}>
                                        {displayTags.map((tag, idx) => (
                                            <div key={idx} style={{ display: 'flex', padding: '8px 20px', background: '#F3F4F6', borderRadius: '8px', border: '2px solid #E5E7EB' }}>
                                                <span style={{ fontSize: '24px', color: '#4B5563', fontWeight: 500 }}>#{tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 右側巨大分數/評級展示區 */}
                            {displayScore && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFF7ED', padding: '40px', borderRadius: '32px', border: '4px solid #FFEDD5', minWidth: '300px' }}>
                                    <span style={{ fontSize: '24px', color: '#C2410C', fontWeight: 600, marginBottom: '8px' }}>
                                        {isScoreMode ? '綜合評分' : '最終評級'}
                                    </span>
                                    <span style={{ fontSize: '96px', fontWeight: 900, color: '#EA580C', lineHeight: 1 }}>
                                        {displayScore}
                                    </span>
                                    {isScoreMode && <span style={{ fontSize: '24px', color: '#F97316', marginTop: '8px' }}>/ 100</span>}
                                </div>
                            )}
                        </div>

                        {/* Footer: 防偽提示 */}
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #E5E7EB', paddingTop: '32px', marginTop: '40px' }}>
                            <span style={{ fontSize: '24px', color: '#9CA3AF' }}>由 AI 驅動的頂級審計與永續分析</span>
                            <span style={{ fontSize: '24px', color: '#9CA3AF', fontWeight: 500 }}>isunfa.com</span>
                        </div>

                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (error) {
        console.error('OG Image generation failed:', error);
        // 產生一張預設的錯誤或備用 OG 圖片
        return new ImageResponse(
            (
                <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', color: 'white', fontSize: '48px', fontWeight: 'bold' }}>
                    iSunFA 專業分析報告
                </div>
            ),
            { width: 1200, height: 630 }
        );
    }
}