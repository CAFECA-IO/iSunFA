import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { ShareSanitizerFactory, ICarbonMetrics, IFinancialMetrics, TShareData, TShareResult } from '@/lib/analysis/share_sanitizer';

export const dynamic = 'force-dynamic';

// Info: (20260413 - Tzuhan) 確保涵蓋所有 11 種分類
const CATEGORY_MAP: Record<string, string> = {
    balance_sheet: "資產負債表",
    cash_flow: "現金流量表",
    income_statement: "損益表",
    irsc: "智能企業評級",
    financial_compliance: "財務合規",
    financial_health: "財務健康",
    market_trends: "交易市場趨勢",
    industry_development: "產業發展",
    financial_product_rating: "金融商品評級",
    carbon_health_check: "碳健檢",
    net_zero_emissions: "淨零碳排",
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        if (!token) throw new Error('Missing token');

        const shareRecord = await prisma.reportShareToken.findUnique({
            where: { token, isActive: true },
            include: { analysis: true }
        });

        if (!shareRecord) throw new Error('Token invalid');

        const sanitizer = ShareSanitizerFactory.getSanitizer(shareRecord.category);
        const safeData = sanitizer.sanitize(
            shareRecord.analysis.data as TShareData,
            shareRecord.analysis.result as TShareResult
        );

        const companyName = safeData.companyName;
        const categoryName = CATEGORY_MAP[shareRecord.category] || '專業分析報告';

        let displayScore = '';
        let displayTags: string[] = [];
        let isScoreMode = false;

        // Info: (20260413 - Tzuhan) 依據 metrics 型別判斷要顯示的畫面元素
        if (safeData.metrics !== null) {
            if ('score' in safeData.metrics) { // Info: (20260413 - Tzuhan) Carbon 類
                displayScore = (safeData.metrics as ICarbonMetrics).score || '';
                displayTags = safeData.metrics.tags.slice(0, 3) || [];
                isScoreMode = true;
            } else if ('rating' in safeData.metrics) { // Info: (20260413 - Tzuhan) Rating 類
                displayScore = (safeData.metrics as IFinancialMetrics).rating || '';
                displayTags = safeData.metrics.tags.slice(0, 3) || [];
            }
        }

        return new ImageResponse(
            (
                <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', fontFamily: 'sans-serif' }}>
                    <div style={{ display: 'flex', width: '100%', height: '12px', background: '#EA580C' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', padding: '60px 80px', flex: 1, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="5" fill="#EA580C" />
                                    <path d="M12 2V4M12 20V22M4 12H2M22 12H20M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07M19.07 19.07L17.66 17.66M6.34 6.34L4.93 4.93" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <div style={{ display: 'flex', fontSize: '32px', fontWeight: 800 }}>
                                    <span style={{ color: '#111827' }}>iSun</span>
                                    <span style={{ color: '#EA580C' }}>FA</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', padding: '6px 20px', background: '#FFF7ED', borderRadius: '999px', border: '1.5px solid #FFEDD5' }}>
                                <span style={{ color: '#C2410C', fontSize: '20px', fontWeight: 600 }}>{categoryName}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <span style={{ fontSize: '24px', color: '#6B7280', marginBottom: '12px', letterSpacing: '0.05em' }}>ANALYSIS TARGET</span>
                                <span style={{ fontSize: '64px', fontWeight: 900, color: '#111827', lineHeight: 1.2 }}>{companyName}</span>

                                {displayTags.length > 0 && (
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                        {displayTags.map((tag, idx) => (
                                            <div key={idx} style={{ display: 'flex', padding: '6px 16px', background: '#F3F4F6', borderRadius: '6px' }}>
                                                <span style={{ fontSize: '20px', color: '#374151', fontWeight: 500 }}>#{tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {displayScore && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#FFF7ED', padding: '36px', borderRadius: '24px', border: '2px solid #FFEDD5', marginLeft: '40px' }}>
                                    <span style={{ fontSize: '20px', color: '#9A3412', fontWeight: 700, marginBottom: '4px' }}>{isScoreMode ? 'SCORE' : 'RATING'}</span>
                                    <span style={{ fontSize: '84px', fontWeight: 900, color: '#EA580C', lineHeight: 1 }}>{displayScore}</span>
                                    {isScoreMode && <span style={{ fontSize: '20px', color: '#F97316' }}>/ 100</span>}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: '24px' }}>
                            <span style={{ fontSize: '20px', color: '#9CA3AF' }}>iSunFA AI-Powered Financial Auditor</span>
                            <span style={{ fontSize: '20px', color: '#9CA3AF', fontWeight: 500 }}>www.isunfa.com</span>
                        </div>
                    </div>
                </div>
            ),
            { width: 1200, height: 630 }
        );
    } catch (error) {
        console.error(`[PublicReportPage] Error generating metadata: ${error}`);
        return new ImageResponse(
            <div style={{ height: '100%', width: '100%', display: 'flex', background: '#111827', color: 'white', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>iSunFA</div>,
            { width: 1200, height: 630 }
        );
    }
}