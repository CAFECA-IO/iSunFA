import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { ShareSanitizerFactory, ICarbonMetrics, IFinancialMetrics, TShareData, TShareResult } from '@/lib/analysis/share_sanitizer';

export const dynamic = 'force-dynamic';

const DICTIONARY: Record<string, Record<string, Record<string, string>>> = {
    zh_tw: {
        category: {
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
            default: "專業分析報告"
        },
        ui: {
            target: "ANALYSIS TARGET",
            score: "ANALYSIS SCORE",
            rating: "RATING",
            readyBadge: "STATUS",
            readyTitle: "專屬洞察已就緒",
            slogan: "運用 AI 驅動的頂尖財務與碳管理平台",
            subSlogan: "免費產生專屬企業洞察",
            cta: "立即前往 isunfa.com"
        }
    },
    en: {
        category: {
            balance_sheet: "Balance Sheet",
            cash_flow: "Cash Flow",
            income_statement: "Income Statement",
            irsc: "IRSC Rating",
            financial_compliance: "Compliance",
            financial_health: "Financial Health",
            market_trends: "Market Trends",
            industry_development: "Industry Dev.",
            financial_product_rating: "Product Rating",
            carbon_health_check: "Carbon Health",
            net_zero_emissions: "Net Zero",
            default: "Professional Report"
        },
        ui: {
            target: "ANALYSIS TARGET",
            score: "ANALYSIS SCORE",
            rating: "RATING",
            readyBadge: "STATUS",
            readyTitle: "INSIGHTS READY",
            slogan: "AI-Driven Finance & Carbon Platform",
            subSlogan: "Generate your insights for free",
            cta: "Visit isunfa.com"
        }
    }
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const lang = searchParams.get('lang') || 'zh_tw';

        if (!token) throw new Error('Missing token');

        const t = DICTIONARY[lang] || DICTIONARY['zh_tw'];

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
        const categoryName = t.category[shareRecord.category] || t.category.default;

        let displayScore = '';
        let rawTags: string[] = [];
        let isScoreMode = false;

        if (safeData.metrics !== null) {
            if ('score' in safeData.metrics) {
                displayScore = (safeData.metrics as ICarbonMetrics).score || '';
                rawTags = safeData.metrics.tags || [];
                isScoreMode = true;
            } else if ('rating' in safeData.metrics) {
                displayScore = (safeData.metrics as IFinancialMetrics).rating || '';
                rawTags = safeData.metrics.tags || [];
            }
        }
        let displayTags = rawTags
            .reduce((acc, tag) => {
                const parts = tag.split(/[#，、,]+/).map(t => t.trim()).filter(Boolean);
                return [...acc, ...parts];
            }, [] as string[])
            .slice(0, 5);

        if (!displayScore || shareRecord.category === 'financial_product_rating') {
            displayTags = [];
        }

        const isShortRating = !isScoreMode && displayScore.length <= 3 && /^[a-zA-Z\+\-\*]+$/.test(displayScore);
        const getScoreFontSize = (score: string) => {
            if (isScoreMode || isShortRating) {
                return '72px';
            } else {
                if (score.length <= 5) return '36px';
                return '28px';
            }
        };

        const scoreFontSize = getScoreFontSize(displayScore);
        const scoreFontWeight = (isScoreMode || isShortRating) ? 800 : 700;
        const nameFontSize = companyName.length > 20 ? '48px' : (companyName.length > 10 ? '56px' : '72px');

        return new ImageResponse(
            (
                <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>

                    {/* Info: (20260416 - Tzuhan) Background Layer */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
                        <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#FFFFFF" />
                                    <stop offset="100%" stopColor="#FFF7ED" />
                                </linearGradient>
                                <radialGradient id="glow1" cx="80%" cy="0%" r="50%">
                                    <stop offset="0%" stopColor="#FFEDD5" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#FFEDD5" stopOpacity="0" />
                                </radialGradient>
                                <radialGradient id="glow2" cx="0%" cy="100%" r="60%">
                                    <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.6" />
                                    <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0" />
                                </radialGradient>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(234, 88, 12, 0.05)" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="1200" height="630" fill="url(#bg)" />
                            <rect width="1200" height="630" fill="url(#grid)" />
                            <rect width="1200" height="630" fill="url(#glow1)" />
                            <rect width="1200" height="630" fill="url(#glow2)" />
                        </svg>
                    </div>

                    {/* Info: (20260416 - Tzuhan) Top Accent line */}
                    <div style={{ display: 'flex', width: '100%', height: '12px', background: 'linear-gradient(90deg, #EA580C 0%, #F97316 50%, #FDBA74 100%)', zIndex: 10 }} />

                    <div style={{ display: 'flex', flexDirection: 'column', padding: '50px 80px', flex: 1, justifyContent: 'space-between', zIndex: 10 }}>

                        {/* Info: (20260416 - Tzuhan) Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <svg width="224" height="64" viewBox="0 0 224 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M90.8386 49.4178H84.7725V51.9896H90.8386V49.4178Z" fill="#1A2E50" />
                                    <path d="M90.8386 32.2538H84.7725V41.7059H90.8386V32.2538Z" fill="#1A2E50" />
                                    <path d="M90.8386 44.2776H84.7725V46.8494H90.8386V44.2776Z" fill="#1A2E50" />
                                    <path d="M87.7571 28.8271C89.8604 28.8271 91.1824 27.4076 91.1824 25.5973C91.1324 23.737 89.8604 22.3175 87.8072 22.3175C85.754 22.3175 84.4319 23.737 84.4319 25.5973C84.4319 27.4577 85.754 28.8271 87.7604 28.8271H87.7571Z" fill="#1A2E50" />
                                    <path d="M90.8386 54.5613H84.7725V56.091H90.8386V54.5613Z" fill="#1A2E50" />
                                    <path d="M97.6392 49.5314C99.5956 50.6569 102.53 51.6355 105.615 51.6355C109.481 51.6355 111.634 49.8253 111.634 47.1333C111.634 44.6384 109.972 43.1688 105.762 41.6524C100.33 39.6952 96.858 36.8062 96.858 32.0601C96.858 26.6761 101.358 22.5647 108.503 22.5647C112.075 22.5647 114.716 23.3462 116.429 24.228L114.96 29.0742C113.784 28.4363 111.488 27.5078 108.403 27.5078C104.587 27.5078 102.924 29.5619 102.924 31.4723C102.924 34.0173 104.834 35.193 109.234 36.9064C114.96 39.0606 117.747 41.9464 117.747 46.6958C117.747 51.9829 113.734 56.582 105.221 56.582C101.749 56.582 98.1266 55.6034 96.3171 54.5279L97.6392 49.5347V49.5314Z" fill="#1A2E50" />
                                    <path d="M144.509 48.9435C144.509 51.7825 144.606 54.1305 144.706 56.091H139.421L139.127 52.4705H139.031C138.002 54.1839 135.655 56.6321 131.399 56.6321C127.142 56.6321 123.082 54.037 123.082 46.2549V32.2572H129.098V45.2262C129.098 49.1907 130.37 51.7357 133.552 51.7357C135.949 51.7357 137.515 50.0223 138.152 48.506C138.349 47.9683 138.496 47.3304 138.496 46.6457V32.2572H144.516V48.9469L144.509 48.9435Z" fill="#1A2E50" />
                                    <path d="M151.26 39.3479C151.26 36.6058 151.21 34.3079 151.063 32.2505H156.348L156.641 35.8242H156.788C157.817 33.9639 160.407 31.7128 164.37 31.7128C168.53 31.7128 172.833 34.4048 172.833 41.943V56.0877H166.817V42.6277C166.817 39.2009 165.545 36.6058 162.267 36.6058C159.87 36.6058 158.207 38.3192 157.57 40.1294C157.373 40.6672 157.326 41.4019 157.326 42.0866V56.0843H151.26V39.3445V39.3479Z" fill="#1A2E50" />
                                    <path d="M178.459 21.7965H196.557V26.8164H184.475V36.5189H195.729V41.4587H184.475V56.091H178.462V21.7998L178.459 21.7965Z" fill="#1A2E50" />
                                    <path d="M205.317 46.6223L202.717 56.0877H196.607L206.593 21.7965H214.078L224 56.0877H217.7L214.983 46.6223H205.314H205.317ZM214.091 42.0299L211.768 33.7535C211.183 31.5925 210.652 29.0108 210.178 26.8999H210.055C209.594 29.0341 209.073 31.676 208.526 33.7468L206.226 42.0332H214.091V42.0299Z" fill="#1A2E50" />
                                    <path d="M57.5498 5.54096C50.4688 0.544403 42.4396 -0.968591 33.953 0.581142C24.7185 2.26447 17.6241 7.20425 12.6296 15.0565C13.9183 21.1251 16.5691 27.3708 20.4986 33.2859L33.4956 20.2835C34.821 18.9575 36.971 18.9575 38.2964 20.2835C39.6218 21.6094 39.6218 23.7604 38.2964 25.0863L24.605 38.7834C25.5632 39.929 26.5748 41.0546 27.6364 42.1568L54.5451 15.2368C55.8705 13.9109 58.0206 13.9109 59.346 15.2368C60.6714 16.5628 60.6714 18.7137 59.346 20.0397L32.5975 46.7993C33.776 47.7912 34.9746 48.7264 36.1898 49.6082L47.4541 38.3392C48.7795 37.0132 50.9295 37.0132 52.2549 38.3392C53.5803 39.6652 53.5803 41.8161 52.2549 43.142L42.0456 53.3556C46.9332 56.0977 51.9711 57.9881 56.8821 58.9801C64.4406 54.254 69.7355 46.5688 71.1644 37.2537C73.1943 24.0175 68.5203 13.2729 57.5565 5.53762L57.5498 5.54096ZM43.8718 18.0357C41.9955 18.0357 40.4765 16.516 40.4765 14.639C40.4765 12.7619 41.9955 11.2422 43.8718 11.2422C45.7481 11.2422 47.2671 12.7619 47.2671 14.639C47.2671 16.516 45.7481 18.0357 43.8718 18.0357Z" fill="url(#paint0_linear_12_4673)" />
                                    <path d="M37.2081 58.1952C35.2317 57.0796 33.2787 55.8238 31.369 54.4311C28.7483 52.5206 26.2043 50.3563 23.7905 47.9382C22.3783 46.5254 21.0496 45.0692 19.811 43.5796C18.3186 41.786 16.9532 39.9457 15.7146 38.0687C12.5229 33.2358 10.1826 28.1824 8.74033 23.1892C8.28295 24.3582 7.82891 25.5272 7.34816 26.6828C4.95108 32.4242 2.58071 38.1722 0.210339 43.9236C-0.200303 44.9156 -0.0433912 45.1527 1.01493 45.1661C2.71091 45.1894 4.4069 45.1594 6.10288 45.1727C7.32479 45.1828 7.61524 45.2495 7.68201 46.1046C7.69537 46.295 7.70204 46.6221 7.70204 46.7959C7.70538 49.7585 7.70538 52.7243 7.70538 55.6869C7.70538 57.928 7.70538 60.1691 7.70538 62.4102C7.70538 63.9232 7.77549 63.9933 9.31456 63.9933C13.4777 63.9967 17.6442 63.9933 21.8074 63.9933C22.9225 63.9933 24.0342 63.9933 25.1493 63.9933C27.2359 63.9933 29.3258 63.9933 31.4124 63.9933C34.1868 63.9933 36.9644 63.9933 39.7388 63.9933C41.7085 63.9933 43.6616 63.7896 45.5812 63.4122C46.4092 63.2485 47.2238 63.0581 48.0217 62.841C44.4094 61.7522 40.7704 60.1958 37.2115 58.1885L37.2081 58.1952Z" fill="#1A2E50" />
                                    <defs>
                                        <linearGradient id="paint0_linear_12_4673" x1="62.0836" y1="9.64575" x2="29.0115" y2="42.7074" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#FFA502" />
                                            <stop offset="1" stopColor="#FF8430" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <div style={{ display: 'flex', padding: '12px 32px', background: '#FFFFFF', borderRadius: '999px', border: '2px solid #EA580C', boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.1)' }}>
                                <span style={{ color: '#EA580C', fontSize: '24px', fontWeight: 800, letterSpacing: '0.05em' }}>{categoryName}</span>
                            </div>
                        </div>

                        {/* Info: (20260416 - Tzuhan) Main Content */}
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                            {/* Info: (20260416 - Tzuhan) 左側：公司資訊 */}
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '16px', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ display: 'flex', width: '40px', height: '4px', background: '#EA580C', borderRadius: '2px' }} />
                                    <span style={{ fontSize: '22px', color: '#6B7280', letterSpacing: '0.15em', fontWeight: 700 }}>{t.ui.target}</span>
                                </div>
                                <span style={{ fontSize: nameFontSize, fontWeight: 900, color: '#111827', lineHeight: 1.2, wordBreak: 'break-word' }}>
                                    {companyName}
                                </span>

                                {displayTags.length > 0 && (
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                                        {displayTags.map((tag, idx) => (
                                            <div key={idx} style={{ display: 'flex', padding: '8px 24px', background: '#FFF7ED', borderRadius: '999px', border: '1px solid #FED7AA', maxWidth: '100%' }}>
                                                <span style={{ fontSize: '20px', color: '#C2410C', fontWeight: 700 }}>#{tag}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Info: (20260416 - Tzuhan) 右側：動態分數與評級區塊 */}
                            {displayScore ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', padding: '32px', borderRadius: '32px', border: '2px solid #FFEDD5', marginLeft: '40px', width: '360px', flexShrink: 0, boxShadow: '0 20px 25px -5px rgba(234, 88, 12, 0.1), 0 8px 10px -6px rgba(234, 88, 12, 0.1)' }}>
                                    <span style={{ fontSize: '20px', color: '#C2410C', fontWeight: 800, marginBottom: '16px', letterSpacing: '0.1em', textAlign: 'center' }}>
                                        {isScoreMode ? t.ui.score : t.ui.rating}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                                        <span style={{ fontSize: scoreFontSize, fontWeight: scoreFontWeight, color: '#EA580C', lineHeight: 1.3, textAlign: 'center', wordBreak: 'break-all' }}>{displayScore}</span>
                                        {isScoreMode && <span style={{ fontSize: '32px', color: '#F97316', fontWeight: 700 }}>/ 100</span>}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#FFFFFF', padding: '24px', borderRadius: '24px', border: '2px solid #FFEDD5', marginLeft: '40px', width: '280px', flexShrink: 0, boxShadow: '0 20px 25px -5px rgba(234, 88, 12, 0.1), 0 8px 10px -6px rgba(234, 88, 12, 0.1)' }}>
                                    <svg width="120" height="120" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '12px' }}>
                                        <circle cx="80" cy="80" r="60" fill="#FFEDD5" />
                                        <rect x="45" y="30" width="70" height="90" rx="6" fill="#FFFFFF" stroke="#FDBA74" strokeWidth="4" />
                                        <rect x="60" y="55" width="40" height="6" rx="3" fill="#FED7AA" />
                                        <rect x="60" y="70" width="25" height="6" rx="3" fill="#FED7AA" />
                                        <rect x="60" y="95" width="20" height="6" rx="3" fill="#F97316" />
                                        <path d="M100 65 L120 55 L140 65 L135 100 C125 115 105 125 105 125 C105 125 90 115 85 100 Z" fill="#FFFFFF" stroke="#EA580C" strokeWidth="4" strokeLinejoin="round" />
                                        <path d="M110 85 L118 92 L130 75" stroke="#F97316" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M35 45 L39 33 L45 45 L55 49 L45 54 L39 65 L35 54 L25 49 Z" fill="#FDBA74" />
                                    </svg>

                                    <span style={{ fontSize: '18px', color: '#EA580C', fontWeight: 800, marginBottom: '4px', letterSpacing: '0.1em' }}>{t.ui.readyBadge}</span>
                                    <span style={{ fontSize: '26px', fontWeight: 800, color: '#C2410C', textAlign: 'center' }}>{t.ui.readyTitle}</span>
                                </div>
                            )}
                        </div>

                        {/* Info: (20260416 - Tzuhan) Footer */}
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', borderTop: '2px solid #FFEDD5', paddingTop: '28px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontSize: '24px', color: '#1A2E50', fontWeight: 700 }}>{t.ui.slogan}</span>
                                <div style={{ display: 'flex', width: '6px', height: '6px', borderRadius: '50%', background: '#F97316' }} />
                                <span style={{ fontSize: '24px', color: '#6B7280', fontWeight: 600 }}>{t.ui.subSlogan}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 32px', background: 'linear-gradient(90deg, #EA580C 0%, #F97316 100%)', borderRadius: '999px', boxShadow: '0 8px 16px -4px rgba(234, 88, 12, 0.4)' }}>
                                <span style={{ fontSize: '22px', color: '#FFFFFF', fontWeight: 800, letterSpacing: '0.05em' }}>{t.ui.cta}</span>
                            </div>
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
