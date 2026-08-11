import { Fragment, useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, QrCode, Loader2 } from "lucide-react";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { MarkdownContent } from "@/components/common/markdown_content";
import { formatDate } from "@/lib/utils/date";
import { downloadFile } from "@/lib/file_operator";
import type { ICoupon } from "@/app/(landing)/coupon/page";
import { QRCodeSVG } from "qrcode.react";
import { COUPON_STATUS } from "@/constants/status";
import { getLoginOptions } from "@/lib/auth/fido2_client";
import { requestAssertion } from "@/lib/auth/assertion_client";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import UsedStamp from "@/components/user/coupon/used_stamp";

interface ICouponDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: ICoupon | null;
  onStatusChange?: (id: string, status: string) => void;
}

export default function CouponDetailModal({
  isOpen,
  onClose,
  coupon,
  onStatusChange = () => {},
}: ICouponDetailModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUsing, setIsUsing] = useState(false);
  const [serverQrPayload, setServerQrPayload] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      setIsRevealed(false);
      setIsConfirmOpen(false);
      setIsUsing(false);
      setServerQrPayload("");
    }
  }, [isOpen]);

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
  const isUsable = coupon.status === COUPON_STATUS.ACTIVE && !isExpired;

  // Info: (20260519 - Luphia) qrPayload generation from api service instead of client side

  const handleUseCoupon = async () => {
    if (!coupon) return;
    setIsUsing(true);
    try {
      const { challenge, token } = await getLoginOptions(
        undefined,
        ChallengePurpose.USER_ACTION,
      );
      // Info: (20260811 - Luphia) 走 requestAssertion，託管帳號才不會卡在永遠不會成功的系統對話框
      const authentication = await requestAssertion({
        challenge,
        custody: user?.custody,
        challengeToken: token,
      });

      const res = await request<{
        success: boolean;
        payload: { record: ICoupon; qrPayload: string };
      }>(`/api/v1/user/coupon/${coupon.id}/use`, {
        method: "POST",
        body: JSON.stringify({
          fido2Signature: {
            authentication,
            challengeToken: token,
          },
        }),
      });
      if (res.success) {
        setServerQrPayload(res.payload.qrPayload);
        setIsRevealed(true);
        setIsConfirmOpen(false);
        if (onStatusChange) {
          onStatusChange(coupon.id, COUPON_STATUS.USED);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUsing(false);
    }
  };

  return (
    <Fragment>
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
                      <h2 className="text-lg leading-normal font-bold tracking-tight shadow-black drop-shadow-sm">
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

                  <div className="relative overflow-hidden p-6">
                    {coupon.status === COUPON_STATUS.USED && !isRevealed && (
                      <UsedStamp
                        usedAt={coupon.updatedAt}
                        className="absolute top-40 right-5 z-20 opacity-90 md:top-10 md:right-10"
                      />
                    )}
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
                    {isUsable && !isRevealed ? (
                      <div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6">
                        <button
                          onClick={() => setIsConfirmOpen(true)}
                          className="mb-4 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-700"
                        >
                          {t("user_coupon.reveal_qr")}
                        </button>
                        <p className="text-center text-xs font-medium text-orange-600">
                          {t("user_coupon.reveal_warning")}
                        </p>
                      </div>
                    ) : isRevealed && serverQrPayload ? (
                      <div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 p-6">
                        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
                          <QRCodeSVG
                            value={serverQrPayload}
                            size={160}
                            fgColor="#ea580c"
                          />
                        </div>
                        <p className="text-center text-sm font-medium text-orange-700">
                          {t("user_coupon.reveal_success_note")}
                        </p>
                        <span className="mt-2 font-mono text-xs text-orange-400">
                          ID: {coupon.id.substring(0, 8).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-8 flex flex-col items-center justify-center rounded-xl bg-gray-100 p-6">
                        <QrCode className="mb-2 h-12 w-12 text-gray-300" />
                        <p className="font-semibold text-gray-500">
                          {coupon.status === COUPON_STATUS.USED
                            ? t("user_coupon.status.used")
                            : t("user_coupon.status.expired")}
                        </p>
                        {coupon.status === COUPON_STATUS.USED &&
                          coupon.updatedAt && (
                            <p className="mt-2 text-sm font-medium text-gray-400">
                              {formatDate(coupon.updatedAt, "yyyy-MM-dd HH:mm")}
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isConfirmOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-60"
          onClose={() => setIsConfirmOpen(false)}
        >
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle
                    as="h3"
                    className="text-lg leading-6 font-medium text-gray-900"
                  >
                    {t("user_coupon.reveal_qr")}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {t("user_coupon.reveal_confirm")}
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none"
                      onClick={() => setIsConfirmOpen(false)}
                      disabled={isUsing}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none disabled:opacity-50"
                      onClick={handleUseCoupon}
                      disabled={isUsing}
                    >
                      {isUsing && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t("common.confirm")}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </Fragment>
  );
}
