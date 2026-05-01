import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ShareSanitizerFactory, TShareData, TShareResult } from '@/lib/analysis/share_sanitizer';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import PublicReportClientView from '@/app/share/report/[token]/public_report_client_view';

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
	const { token } = await params;

	const shareRecord = await prisma.reportShareToken.findUnique({
		where: { token, isActive: true },
		include: { analysis: { include: { order: true } } }
	});

	if (!shareRecord) return { title: 'iSunFA' };

	const headersList = await headers();
	const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000';
	const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
	const baseUrl = `${protocol}://${host}`;

	// Info: (20260415 - Tzuhan) 解析爬蟲或使用者的 Accept-Language 標頭
	const acceptLanguage = headersList.get('accept-language') || '';
	let ogLang = 'zh_tw'; // Info: (20260415 - Tzuhan) 預設語系

	// Info: (20260415 - Tzuhan) 簡易的語系判斷邏輯
	const lowerLang = acceptLanguage.toLowerCase();
	if (lowerLang.includes('en')) {
		ogLang = 'en';
	} else if (lowerLang.includes('ja')) {
		ogLang = 'ja';
	} else if (lowerLang.includes('zh-cn')) {
		ogLang = 'zh_cn';
	} else if (lowerLang.includes('ko')) {
		ogLang = 'ko';
	}

	try {
		const sanitizer = ShareSanitizerFactory.getSanitizer(shareRecord.category);
		const safeData = sanitizer.sanitize(
			shareRecord.analysis.data as TShareData,
			shareRecord.analysis.result as TShareResult,
			shareRecord.isFinancialDataHidden
		);

		return {
			title: `${safeData.companyName} | iSunFA`,
			openGraph: {
				title: `${safeData.companyName} | iSunFA`,
				type: 'website',
				images: [{ url: `${baseUrl}/api/v1/share/og?token=${token}&lang=${ogLang}`, width: 1200, height: 630 }],
			},
			twitter: { card: 'summary_large_image' }
		};
	} catch (e) {
		console.error(`[PublicReportPage] Error generating metadata: ${e}`);
		return { title: 'iSunFA' };
	}
}

// Info: (20260413 - Tzuhan) 伺服器端資料獲取 (SSR)
export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params;

	const shareRecord = await prisma.reportShareToken.findUnique({
		where: { token, isActive: true },
		include: {
			analysis: {
				include: { order: true }
			},
			createdBy: {
				select: { name: true }
			}
		}
	});

	if (!shareRecord) return notFound();

	let safeData;
	try {
		const sanitizer = ShareSanitizerFactory.getSanitizer(shareRecord.category);
		safeData = sanitizer.sanitize(
			shareRecord.analysis.data as TShareData,
			shareRecord.analysis.result as TShareResult,
			shareRecord.isFinancialDataHidden
		);

		const status = (shareRecord.analysis.order as { status?: string })?.status?.toLowerCase() || 'unknown';
		if (['processing', 'pending', 'doing', 'uploading', 'paying'].includes(status)) {
			safeData.safeMarkdown = "> **⏳ 報告正在生成中，請稍後重新整理本頁面查看結果...**";
		} else if (['failed', 'error'].includes(status)) {
			safeData.safeMarkdown = "> **❌ 報告生成失敗。**";
		} else if (!safeData.safeMarkdown) {
			safeData.safeMarkdown = "> **⚠️ 尚未產生任何內容。**";
		}
	} catch (error) {
		console.error(`[PublicReportPage] Error sanitizing data: ${error}`);
		safeData = null;
	}

	// Info: (20260413 - Tzuhan) 將資料傳遞給 Client Component 進行渲染與 i18n 處理
	return (
		<PublicReportClientView
			shareRecord={JSON.parse(JSON.stringify(shareRecord))}
			safeData={safeData}
		/>
	);
}
