import { Fragment, useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, QrCode } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { MarkdownContent } from "@/components/common/markdown_content";
import { formatDate } from "@/lib/utils/date";
import { downloadFile } from "@/lib/file_operator";
import type { IUserCouponRecord } from "@/app/(landing)/coupon/page";
import { QRCodeSVG } from "qrcode.react";

interface ICouponDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: IUserCouponRecord | null;
}

export default function CouponDetailModal({
  isOpen,
  onClose,
  coupon,
}: ICouponDetailModalProps) {
  const { t } = useTranslation();
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && coupon?.campaign?.metadataHash) {
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
  }, [isOpen, coupon]);

  if (!coupon) return null;

  const isExpired = new Date(coupon.campaign.usageDeadline) < new Date();
  const isUsable = coupon.status === "ACTIVE" && !isExpired;

  /**
   * Info: (20260517 - Luphia)
   * Generate a payload for the QR code (for cashier scanning)
   * Usually this contains the coupon ID and user ID, or a signed token
   */
  let qrPayload = "";
  const customContent =
    coupon.customQrContent || coupon.campaign.customQrContent;
  if (customContent) {
    qrPayload = customContent
      .replace(/{userId}/g, coupon.userId)
      .replace(/{couponId}/g, coupon.id)
      .replace(/{campaignId}/g, coupon.campaignId);
  } else {
    qrPayload = JSON.stringify({
      couponId: coupon.id,
      campaignId: coupon.campaignId,
      userId: coupon.userId,
    });
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="bg-opacity-75 fixed inset-0 bg-black backdrop-blur-md" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all sm:my-8">
                {/* Info: (20260517 - Luphia) Header Image Area (Extracted from Markdown or fallback) */}
                <div className="relative flex items-center justify-center bg-orange-600 px-4 py-4 text-white">
                  <button
                    onClick={onClose}
                    className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-black/20 p-1.5 text-white backdrop-blur hover:bg-black/40"
                  >
                    <X size={18} />
                  </button>
                  <div className="text-center">
                    <h2 className="text-lg leading-[1.5] font-bold tracking-tight shadow-black drop-shadow-sm">
                      {coupon.campaign.title ||
                        `Coupon #${coupon.campaign.claimCode || "Airdrop"}`}
                    </h2>
                    <p className="mt-2 text-sm text-orange-100">
                      {t("user_coupon.valid_until")}{" "}
                      <span className="font-bold text-white">
                        {formatDate(
                          coupon.campaign.usageDeadline,
                          "yyyy-MM-dd HH:mm",
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  {/* Info: (20260517 - Luphia) Markdown Content rendered */}
                  <div className="prose prose-sm prose-orange max-w-none text-gray-700">
                    {loading ? (
                      <div className="flex animate-pulse flex-col gap-2">
                        <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                        <div className="h-4 w-full rounded bg-gray-200"></div>
                        <div className="h-4 w-5/6 rounded bg-gray-200"></div>
                        <div className="mt-4 h-32 w-full rounded bg-gray-200"></div>
                      </div>
                    ) : (
                      <MarkdownContent content={markdownContent} />
                    )}
                  </div>

                  {/* Info: (20260517 - Luphia) QR Code Section for Redemption */}
                  {isUsable ? (
                    <div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6">
                      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
                        <QRCodeSVG
                          value={qrPayload}
                          size={160}
                          fgColor="#ea580c"
                        />
                      </div>
                      <p className="text-center text-sm font-medium text-gray-500">
                        {t("user_coupon.qr_instruction")}
                      </p>
                      <span className="mt-2 font-mono text-xs text-gray-400">
                        ID: {coupon.id.substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-8 flex flex-col items-center justify-center rounded-xl bg-gray-100 p-6">
                      <QrCode className="mb-2 h-12 w-12 text-gray-300" />
                      <p className="font-semibold text-gray-500">
                        {coupon.status === "USED"
                          ? t("user_coupon.status.used")
                          : t("user_coupon.status.expired")}
                      </p>
                    </div>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
