'use client';

import { useTranslation } from '@/i18n/i18n_context';
import { MarkdownContent } from '@/components/common/markdown_content';
import { ReportLayout } from '@/components/common/report_layout';
import type { IPublicReportData, TAllShareMetrics } from '@/lib/analysis/share_sanitizer';

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

	const localizedCategory = t(`analysis.categories.${(shareRecord.category).toLowerCase()}`) || shareRecord.category;
	const sharedByText = (t('analysis.share.shared_by') || 'Shared by {{name}}')
		.replace('{{name}}', shareRecord.createdBy?.name || 'iSunFA User');

	return (
		<div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
			<ReportLayout
				badgeText={t('analysis.share.public_badge')}
				footerType="cta"
				ctaTitle={t('analysis.share.cta_title')}
				ctaDesc={t('analysis.share.cta_desc')}
				ctaButtonText={t('analysis.share.cta_button')}
				ctaButtonHref="/"
				className="mx-auto max-w-4xl"
			>
				<div className="border-b border-gray-100 pb-6 mb-6">
					<div className="flex items-center gap-2 mb-2">
						<span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">
							{localizedCategory}
						</span>
					</div>
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
			</ReportLayout>
		</div>
	);
}
