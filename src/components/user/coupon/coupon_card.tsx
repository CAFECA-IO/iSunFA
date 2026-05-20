"use client";

import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { formatDate } from "@/lib/utils/date";
import { downloadFile } from "@/lib/file_operator";
import type { ICoupon } from "@/app/(landing)/coupon/page";
import { COUPON_STATUS } from "@/constants/status";
import { MarkdownContent } from "@/components/common/markdown_content";
import UsedStamp from "@/components/user/coupon/used_stamp";

interface ICouponCardProps {
  coupon: ICoupon;
  onClick: (coupon: ICoupon) => void;
}

export default function CouponCard({ coupon, onClick }: ICouponCardProps) {
  const { t } = useTranslation();
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (coupon?.campaign?.metadataHash) {
      setLoading(true);
      downloadFile(coupon.campaign.metadataHash, {
        onSuccess: async (blob) => {
          try {
            const text = await blob.text();
            setMarkdownContent(text);
          } catch (e) {
            console.error("Failed to parse markdown text", e);
          } finally {
            setLoading(false);
          }
        },
        onError: (err) => {
          console.error("Download failed:", err);
          setLoading(false);
        },
      });
    }
  }, [coupon]);

  const isExpired = new Date(coupon.campaign.usageDeadline) < new Date();
  const statusStyle =
    coupon.status === COUPON_STATUS.USED
      ? "used"
      : isExpired
        ? "expired"
        : "active";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(coupon)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(coupon);
        }
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
        statusStyle !== "active"
          ? "opacity-75 grayscale-[0.5]"
          : "border-gray-200 hover:border-orange-300"
      }`}
    >
      {/* Info: (20260519 - Luphia) Used Stamp on outermost card */}
      {coupon.status === COUPON_STATUS.USED && (
        <UsedStamp
          usedAt={coupon.updatedAt}
          className="absolute top-1/3 right-1/3 z-20 sm:right-6"
        />
      )}
      {/* Info: (20260517 - Luphia) Status Badge */}
      <div className="absolute top-2 right-2 z-10 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-md">
        {statusStyle === "active" && (
          <span className="bg-emerald-100/90 text-emerald-700">
            {t("user_coupon.status.active")}
          </span>
        )}
        {statusStyle === "used" && (
          <span className="bg-gray-100/90 text-gray-600">
            {t("user_coupon.status.used")}
          </span>
        )}
        {statusStyle === "expired" && (
          <span className="bg-red-100/90 text-red-600">
            {t("user_coupon.status.expired")}
          </span>
        )}
      </div>

      {/* Info: (20260517 - Luphia) Markdown Content Preview */}
      <div className="relative h-48 w-full overflow-hidden border-b border-gray-100 bg-gray-50">
        <div className="absolute inset-0 p-4">
          <div className="pointer-events-none h-full overflow-hidden">
            {loading ? (
              <div className="flex h-full animate-pulse flex-col items-center justify-center">
                <Ticket className="h-10 w-10 text-gray-300" />
              </div>
            ) : markdownContent ? (
              <div className="prose prose-sm max-w-none text-gray-700">
                <MarkdownContent content={markdownContent} />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center">
                <Ticket className="h-10 w-10 text-gray-300" />
                <span className="mt-2 truncate text-xs text-gray-400">
                  {coupon.campaign.metadataHash.substring(0, 15)}...
                </span>
              </div>
            )}
          </div>
          {/* Info: (20260517 - Luphia) Gradient Overlay to fade out bottom */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-col gap-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>{t("user_coupon.valid_until")}</span>
            <span className="font-medium text-gray-700">
              {formatDate(coupon.campaign.usageDeadline, "yyyy/MM/dd")}
            </span>
          </div>
          {coupon.status === COUPON_STATUS.USED && (
            <div className="flex justify-between text-gray-400">
              <span>{t("user_coupon.used_at")}</span>
              <span>{formatDate(coupon.updatedAt, "yyyy/MM/dd")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
