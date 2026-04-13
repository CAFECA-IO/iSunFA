import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ShareSanitizerFactory } from '@/lib/analysis/share_sanitizer';
import { MarkdownContent } from '@/components/common/markdown_content';
import { Metadata } from 'next';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
    const { token } = await params;

    const shareRecord = await prisma.reportShareToken.findUnique({
        where: { token, isActive: true },
        include: { analysis: true }
    });

    if (!shareRecord) return { title: '報告已失效 | iSunFA' };

    try {
        const sanitizer = ShareSanitizerFactory.getSanitizer(shareRecord.category);
        const safeData = sanitizer.sanitize(shareRecord.analysis.data, shareRecord.analysis.result);
        const companyName = safeData.companyName || '企業';

        return {
            title: `${companyName} 的分析報告 | iSunFA`,
            description: '點擊查看此份由 iSunFA AI 生成的專業分析摘要。機密數據已由系統安全保護。',
            openGraph: {
                title: `${companyName} 的分析報告 | iSunFA`,
                description: '點擊查看此份由 iSunFA AI 生成的專業分析摘要。',
                type: 'website',
                // Todo: （20260410 - Tzuhan 這裡預留給動態 OG 圖片網址
                // images: [`/api/v1/share/og?token=${token}`], 
            },
            twitter: {
                card: 'summary_large_image',
            }
        };
    } catch (e) {
        console.error('[Security] Sanitizer failed or unsupported category:', e);
        return { title: '分析報告 | iSunFA' };
    }
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    ;
    const shareRecord = await prisma.reportShareToken.findUnique({
        where: { token, isActive: true },
        include: {
            analysis: true,
            createdBy: true
        }
    });
    if (!shareRecord) {
        return notFound();
    }

    let safeData;
    try {
        const sanitizer = ShareSanitizerFactory.getSanitizer(shareRecord.category);
        safeData = sanitizer.sanitize(shareRecord.analysis.data, shareRecord.analysis.result);
    } catch (error) {
        console.error('[Security] Sanitizer failed or unsupported category:', error);
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                    <p className="text-red-600 font-bold text-lg mb-2">系統安全攔截</p>
                    <p className="text-gray-500">此類型的報告尚未開放公開分享，或資料格式異常。</p>
                </div>
            </div>
        );
    }
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-md ring-1 ring-gray-900/5 overflow-hidden">
                <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
                    <div className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="text-orange-500">iSunFA</span> 陽光智能會計
                    </div>
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/30">
                        公開摘要報告
                    </span>
                </div>


                <div className="p-6 sm:p-10">
                    <div className="border-b border-gray-100 pb-6 mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                            {safeData.companyName}
                        </h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            由 {shareRecord.createdBy?.name || 'iSunFA 用戶'} 分享
                            <span className="text-gray-300">•</span>
                            {shareRecord.createdAt.toLocaleDateString()}
                        </p>
                    </div>


                    <div className="prose prose-sm sm:prose-base max-w-none text-gray-700">
                        <MarkdownContent content={safeData.safeMarkdown} theme="light" />
                    </div>
                </div>


                <div className="bg-orange-50 px-6 py-8 border-t border-orange-100 text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">想為您的企業產生專屬的深度分析報告嗎？</h3>
                    <p className="text-sm text-gray-600 mb-6 max-w-lg mx-auto">
                        iSunFA 透過前沿 AI 技術，為您提供包含碳健檢、財務評級、合規審查等全方位智能會計解決方案。
                    </p>
                    <Link
                        href="/"
                        className="inline-block rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 transition-all duration-200"
                    >
                        了解 iSunFA 陽光智能會計
                    </Link>
                </div>

            </div>
        </div>
    );
}