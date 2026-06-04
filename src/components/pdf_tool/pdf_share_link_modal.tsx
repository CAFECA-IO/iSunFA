"use client";

import { Fragment } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Loader2, Share2, Trash2 } from "lucide-react";

interface IPdfShareLinkModalProps {
  isOpen: boolean; // Info: (20260604 - Julian) Modal 開關
  toggleShareLinkModal: () => void; // Info: (20260604 - Julian) Modal 開關處理
  shareToken: string | null; // Info: (20260604 - Julian) 分享連結 token
  isRevoking: boolean; // Info: (20260604 - Julian) 撤銷分享中
  handleRevokeShare: () => void; // Info: (20260604 - Julian) 撤銷分享處理
}

export default function PdfShareLinkModal({
  isOpen,
  toggleShareLinkModal,
  shareToken,
  isRevoking,
  handleRevokeShare,
}: IPdfShareLinkModalProps) {
  const { t } = useTranslation();

  const linkUrl = shareToken
    ? `${window.location.origin}/share/pdf/${shareToken}`
    : "";

  const copyToClipboard = async () => {
    if (!shareToken) return;
    await navigator.clipboard.writeText(linkUrl);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-60" onClose={toggleShareLinkModal}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  className="mb-2 flex items-center gap-2 text-lg leading-6 font-bold text-gray-900"
                >
                  <Share2 size={20} className="text-blue-600" />
                  {t("admin_mission_board.pdf_editor.share_link_modal.title")}
                </DialogTitle>

                <div className="mt-2">
                  <p
                    className="mb-4 text-sm text-gray-500"
                    dangerouslySetInnerHTML={{
                      __html: t(
                        "admin_mission_board.pdf_editor.share_link_modal.subtitle",
                      ),
                    }}
                  />

                  <div className="mt-4 mb-6 flex justify-center">
                    {shareToken && (
                      <div className="inline-block rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                        <QRCodeSVG
                          value={linkUrl}
                          size={160}
                          level="M"
                          className="h-auto w-full"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1.5">
                    <input
                      aria-label="Share link"
                      readOnly
                      value={shareToken ? linkUrl : ""}
                      className="flex-1 border-none bg-transparent px-2 text-sm text-gray-600 outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Copy size={16} /> {t("analysis.share.copy")}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    onClick={handleRevokeShare}
                    disabled={isRevoking || !shareToken}
                  >
                    {isRevoking ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    {t("analysis.share.revoke")}
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    onClick={toggleShareLinkModal}
                  >
                    {t("analysis.share.done")}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
