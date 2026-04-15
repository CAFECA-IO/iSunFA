'use client';

import { useTranslation } from '@/i18n/i18n_context';
import { MarkdownContent } from '@/components/common/markdown_content';
import type { IPublicReportData, TAllShareMetrics } from '@/lib/analysis/share_sanitizer';
import Link from 'next/link';
import Image from 'next/image';


export interface IShareRecordDTO {
    category: string;
    createdAt: string;
    createdBy?: {
        name: string | null;
    } | null;
}


interface IPublicReportClientViewProps {
    shareRecord: IShareRecordDTO;
    safeData: IPublicReportData<TAllShareMetrics> | null;
}

export default function PublicReportClientView({ shareRecord, safeData }: IPublicReportClientViewProps) {
    const { t } = useTranslation();

    if (!safeData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                    <p className="text-red-600 font-bold text-lg mb-2">{t('analysis.share.security_intercept')}</p>
                    <p className="text-gray-500">{t('analysis.share.security_desc')}</p>
                </div>
            </div>
        );
    }

    const localizedCategory = t(`analysis.categories.${shareRecord.category}`) || shareRecord.category;

    const sharedByText = (t('analysis.share.shared_by') || 'Shared by {{name}}')
        .replace('{{name}}', shareRecord.createdBy?.name || 'iSunFA User');

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-md ring-1 ring-gray-900/5 overflow-hidden">
                <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
                    <div className="text-white font-bold text-lg flex items-center gap-3">
                        <Image src="/isunfa_logo.svg" alt="iSunFA Logo" width={112} height={32} priority className="h-7 w-auto" />
                        <span className="hidden sm:inline-block border-l border-gray-600 pl-3">陽光智能會計</span>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/30">
                        {t('analysis.share.public_badge')}
                    </span>
                </div>
                <div className="p-6 sm:p-10">
                    <div className="border-b border-gray-100 pb-6 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">
                                {localizedCategory}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                            {safeData.companyName}
                        </h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            {sharedByText}
                            <span className="text-gray-300">•</span>
                            <span suppressHydrationWarning>
                                {shareRecord.createdAt.split('T')[0].replace(/-/g, '/')}
                            </span>
                        </p>
                    </div>

                    <div className="prose prose-sm sm:prose-base max-w-none text-gray-700">
                        <MarkdownContent content={safeData.safeMarkdown} theme="light" />
                    </div>
                </div>
                <div className="bg-orange-50 px-6 py-8 border-t border-orange-100 text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t('analysis.share.cta_title')}</h3>
                    <p className="text-sm text-gray-600 mb-6 max-w-lg mx-auto">{t('analysis.share.cta_desc')}</p>
                    <Link
                        href="/"
                        className="inline-block rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 transition-all duration-200"
                    >
                        {t('analysis.share.cta_button')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
