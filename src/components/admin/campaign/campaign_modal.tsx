"use client";

import { X } from "lucide-react";
import { ICampaignData } from "@/components/admin/campaign/types";
import { useTranslation } from "@/i18n/i18n_context";
import { MoneyUtil } from "@/lib/utils/money";

interface ICampaignModalProps {
  isOpen: boolean;
  editingCampaign: ICampaignData | null;
  formData: {
    code: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    bonusPoints: string;
    bonusModules: string;
    isActive: boolean;
  };
  setFormData: (data: {
    code: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    bonusPoints: string;
    bonusModules: string;
    isActive: boolean;
  }) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function CampaignModal({
  isOpen,
  editingCampaign,
  formData,
  setFormData,
  onClose,
  onSave,
}: ICampaignModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {editingCampaign
              ? t("admin_campaign.modal.edit_title")
              : t("admin_campaign.modal.add_title")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="input-code"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t("admin_campaign.modal.code")}
            </label>
            <input
              id="input-code"
              aria-label="活動碼"
              type="text"
              value={formData.code}
              onChange={(e) => {
                const safeCode = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "");
                setFormData({ ...formData, code: safeCode });
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:text-sm"
              placeholder={t("admin_campaign.modal.code_placeholder")}
            />
          </div>

          <div>
            <label
              htmlFor="input-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t("admin_campaign.modal.name")}
            </label>
            <input
              id="input-name"
              aria-label="活動名稱"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="input-desc"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t("admin_campaign.modal.description")}
            </label>
            <textarea
              id="input-desc"
              aria-label="活動說明"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="input-start"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t("admin_campaign.modal.start_date")}
              </label>
              <input
                id="input-start"
                aria-label="開始時間"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="input-end"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t("admin_campaign.modal.end_date")}
              </label>
              <input
                id="input-end"
                aria-label="結束時間"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="input-points"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t("admin_campaign.modal.bonus_points")}
              </label>
              <input
                id="input-points"
                aria-label="贈送點數"
                type="number"
                value={formData.bonusPoints}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bonusPoints:
                      e.target.value === ""
                        ? "0"
                        : MoneyUtil.toDecimal(e.target.value).toString(),
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="input-modules"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t("admin_campaign.modal.bonus_modules")}
              </label>
              <input
                id="input-modules"
                aria-label="解鎖模組"
                type="text"
                value={formData.bonusModules}
                onChange={(e) =>
                  setFormData({ ...formData, bonusModules: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:text-sm"
                placeholder={t(
                  "admin_campaign.modal.bonus_modules_placeholder",
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              aria-label="立即啟用"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
            />
            <label
              htmlFor="isActive"
              className="text-sm font-medium text-gray-700"
            >
              {t("admin_campaign.modal.is_active")}
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
          >
            {t("admin_campaign.modal.cancel")}
          </button>
          <button
            onClick={onSave}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none"
          >
            {t("admin_campaign.modal.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
