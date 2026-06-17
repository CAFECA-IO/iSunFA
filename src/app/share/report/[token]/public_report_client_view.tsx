"use client";

import { useTranslation } from "@/i18n/i18n_context";
import { MarkdownContent } from "@/components/common/markdown_content";
import { ReportLayout } from "@/components/common/report_layout";
import type {
  IPublicReportData,
  TAllShareMetrics,
} from "@/lib/analysis/share_sanitizer";

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

export default function PublicReportClientView({
  shareRecord,
  safeData,
}: IPublicReportClientViewProps) {
  const { t } = useTranslation();

  if (!safeData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-lg font-bold text-red-600">
            {t("analysis.share.security_intercept")}
          </p>
          <p className="text-gray-500">{t("analysis.share.security_desc")}</p>
        </div>
      </div>
    );
  }

  const localizedCategory = t(
    `analysis.categories.${shareRecord.category.toLowerCase()}`,
  );
  const sharedByText = t("analysis.share.shared_by").replace(
    "{{name}}",
    shareRecord.createdBy?.name || "iSunFA User",
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 font-sans sm:px-6 lg:px-8">
      <ReportLayout
        badgeText={t("analysis.share.public_badge")}
        footerType="cta"
        ctaTitle={t("analysis.share.cta_title")}
        ctaDesc={t("analysis.share.cta_desc")}
        ctaButtonText={t("analysis.share.cta_button")}
        ctaButtonHref="/"
        className="mx-auto max-w-4xl"
      >
        <div className="mb-6 border-b border-gray-100 pb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
              {localizedCategory}
            </span>
          </div>
          <p className="flex items-center gap-2 text-sm text-gray-500">
            {sharedByText}
            <span className="text-gray-300">•</span>
            <span suppressHydrationWarning>
              {shareRecord.createdAt.split("T")[0].replace(/-/g, "/")}
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
