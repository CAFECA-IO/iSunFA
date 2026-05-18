import { Fragment, useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ICouponCampaignData } from "@/app/admin/coupon/page";
import { downloadFile, uploadFile } from "@/lib/file_operator";

export interface ICouponFormData {
  title: string;
  metadataHash: string;
  markdownContent: string;
  claimCode: string;
  redemptionDeadline: string;
  usageDeadline: string;
  maxClaims: number;
  isTransferable: boolean;
  customQrContent: string;
}

interface ICouponModalProps {
  isOpen: boolean;
  editingCampaign: ICouponCampaignData | null;
  formData: ICouponFormData;
  setFormData: React.Dispatch<React.SetStateAction<ICouponFormData>>;
  onClose: () => void;
  onSave: () => void;
}

export default function CouponModal({
  isOpen,
  editingCampaign,
  formData,
  setFormData,
  onClose,
  onSave,
}: ICouponModalProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingMarkdown, setIsFetchingMarkdown] = useState(false);

  // Info: (20260517 - Luphia) Fetch markdown content if we are editing an existing campaign
  useEffect(() => {
    if (
      isOpen &&
      editingCampaign &&
      editingCampaign.metadataHash &&
      !formData.markdownContent
    ) {
      setIsFetchingMarkdown(true);
      downloadFile(editingCampaign.metadataHash!, {
        onSuccess: async (blob) => {
          try {
            const text = await blob.text();
            setFormData((prev) => ({ ...prev, markdownContent: text }));
          } catch (e) {
            console.error(e);
          } finally {
            setIsFetchingMarkdown(false);
          }
        },
        onError: (err) => {
          console.error(err);
          setIsFetchingMarkdown(false);
        },
      });
    }
  }, [isOpen, editingCampaign, formData.markdownContent, setFormData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await uploadFile(file, {
        onSuccess: (hash) => {
          const imageMarkdown = `\n![image](/api/v1/file/${hash})\n`;
          setFormData({
            ...formData,
            markdownContent: formData.markdownContent + imageMarkdown,
          });
        },
        onError: (err) => console.error("Upload failed", err),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      // Info: (20260517 - Luphia) Reset input
      e.target.value = "";
    }
  };

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
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
                  className="flex items-center justify-between text-lg leading-6 font-medium text-gray-900"
                >
                  {editingCampaign
                    ? t("admin_coupon.edit")
                    : t("admin_coupon.create")}
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </DialogTitle>

                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="coupon-title"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t("admin_coupon.form.title")}
                    </label>
                    <input
                      id="coupon-title"
                      type="text"
                      aria-label={t("admin_coupon.form.title")}
                      className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label
                        htmlFor="coupon-markdown"
                        className="block text-sm font-medium text-gray-700"
                      >
                        {t("admin_coupon.form.content_markdown")}
                      </label>
                      <label
                        htmlFor="coupon-image-upload"
                        className="cursor-pointer text-xs text-orange-600 hover:text-orange-500"
                      >
                        {isUploading
                          ? t("common.uploading")
                          : t("common.upload_image")}
                        <input
                          id="coupon-image-upload"
                          type="file"
                          aria-label={t("common.upload_image")}
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                    {isFetchingMarkdown ? (
                      <div className="flex h-40 items-center justify-center rounded-lg border border-gray-300 bg-gray-50">
                        <span className="text-sm text-gray-500">
                          {t("common.loading")}
                        </span>
                      </div>
                    ) : (
                      <textarea
                        id="coupon-markdown"
                        aria-label={t("admin_coupon.form.content_markdown")}
                        className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                        rows={6}
                        placeholder="# Coupon Title\n\nCoupon description and details..."
                        value={formData.markdownContent}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            markdownContent: e.target.value,
                          })
                        }
                      />
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="coupon-claim-code"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t("admin_coupon.form.claim_code")}
                    </label>
                    <input
                      id="coupon-claim-code"
                      type="text"
                      aria-label={t("admin_coupon.form.claim_code")}
                      placeholder={t(
                        "admin_coupon.form.claim_code_placeholder",
                      )}
                      className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                      value={formData.claimCode}
                      onChange={(e) =>
                        setFormData({ ...formData, claimCode: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="coupon-redemption-deadline"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        {t("admin_coupon.form.redemption_deadline")}
                      </label>
                      <input
                        id="coupon-redemption-deadline"
                        type="datetime-local"
                        aria-label={t("admin_coupon.form.redemption_deadline")}
                        className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                        value={formData.redemptionDeadline}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            redemptionDeadline: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="coupon-usage-deadline"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        {t("admin_coupon.form.usage_deadline")}
                      </label>
                      <input
                        id="coupon-usage-deadline"
                        type="datetime-local"
                        aria-label={t("admin_coupon.form.usage_deadline")}
                        className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                        value={formData.usageDeadline}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            usageDeadline: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="coupon-max-claims"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t("admin_coupon.form.max_claims")}
                    </label>
                    <input
                      id="coupon-max-claims"
                      type="number"
                      aria-label={t("admin_coupon.form.max_claims")}
                      min="0"
                      className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                      value={formData.maxClaims}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxClaims: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="coupon-custom-qr"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t("admin_coupon.form.custom_qr")}
                    </label>
                    <input
                      id="coupon-custom-qr"
                      type="text"
                      aria-label={t("admin_coupon.form.custom_qr")}
                      placeholder={t("admin_coupon.form.custom_qr_placeholder")}
                      className="w-full rounded-lg border-gray-300 bg-white p-2 text-sm text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                      value={formData.customQrContent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customQrContent: e.target.value,
                        })
                      }
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t("admin_coupon.form.custom_qr_help")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isTransferable"
                      aria-label={t("admin_coupon.form.is_transferable")}
                      checked={formData.isTransferable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isTransferable: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <label
                      htmlFor="isTransferable"
                      className="text-sm text-gray-700"
                    >
                      {t("admin_coupon.form.is_transferable")}
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none"
                    onClick={onClose}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 focus:outline-none"
                    onClick={onSave}
                  >
                    {t("admin_coupon.save")}
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
