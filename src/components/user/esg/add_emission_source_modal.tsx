"use client";

import { useState } from "react";
import { request } from '@/lib/utils/request';
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import { IApiResponse } from "@/lib/utils/response";

interface IAddEmissionSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddEmissionSourceModal({
  isOpen,
  onClose,
  onSuccess = () => {},
}: IAddEmissionSourceModalProps) {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const accountBookId = params?.account_book_id as string;

  const [name, setName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [isNameError, setIsNameError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Info: (20260424 - Julian) 未填入名稱 / 正在送出時，禁用送出按鈕
  const disabledSubmit = !name.trim() || isSubmitting;

  // ToDo: (20260421 - Julian) Add API call to create emission source
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setIsNameError(true);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const data = await request<IApiResponse<{newId: string}>>(
        `/api/v1/user/account_book/${accountBookId}/esg/emission_sources`,
        { method: "POST", body: JSON.stringify({ name, address }) },
      );
      
      if (data.success) {
        onClose();
        setName("");
        setAddress("");
        setIsNameError(false);
        if (onSuccess) onSuccess();
        router.refresh();
      } else {
        console.error("Failed to add emission source");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-800">
          {t("emission_sources.modal.title")}
        </h2>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="es-name"
              className="text-sm font-semibold text-slate-600"
            >
              {t("emission_sources.modal.name_label")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="es-name"
              aria-label={t("emission_sources.modal.name_label")}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsNameError(false);
              }}
              placeholder={t("emission_sources.modal.name_placeholder")}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
            {isNameError && (
              <p className="text-xs text-red-500">
                {t("emission_sources.modal.name_error")}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="es-address"
              className="text-sm font-semibold text-slate-600"
            >
              {t("emission_sources.modal.address_label")}
            </label>
            <input
              id="es-address"
              aria-label={t("emission_sources.modal.address_label")}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("emission_sources.modal.address_placeholder")}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
            >
              {t("emission_sources.modal.cancel")}
            </button>
            <button
              type="submit"
              disabled={disabledSubmit}
              className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${disabledSubmit
                ? "cursor-not-allowed bg-gray-300 text-gray-500"
                : "bg-orange-500 text-white enabled:hover:bg-orange-600"
                }`}
            >
              {t("emission_sources.modal.confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
