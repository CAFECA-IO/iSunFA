"use client";

import { useState, useEffect } from "react";
import { X, Calculator, CircleCheck, Loader2 } from "lucide-react";
import { ICoefficient, ICoefficientInput } from "@/interfaces/coefficient";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { useTranslation } from "@/i18n/i18n_context";

interface ICoefficientAddEditModalProps {
  selectedCoefficientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (coefficient: ICoefficientInput) => void;
}

const MIN_VALUE = 0.01;
const MAX_VALUE = 10;
const STEP_VALUE = 0.01;

export default function CoefficientAddEditModal({
  selectedCoefficientId,
  isOpen,
  onClose,
  onConfirm,
}: ICoefficientAddEditModalProps) {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  // Info: (20260413 - Julian) 如果有選擇係數 ID，則為編輯模式，否則為新增模式
  const isEdit = selectedCoefficientId !== null;

  // Info: (20260413 - Julian) Form State
  const [name, setName] = useState<string>("");
  const [emissionFactor, setEmissionFactor] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Info: (20260414 - Julian) Original Data State
  const [originalData, setOriginalData] = useState<ICoefficientInput | null>(
    null,
  );

  // Info: (20260414 - Julian) Loading State
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Info: (20260414 - Julian) 判斷是否有更改的數據
  const hasChanged =
    name !== originalData?.name ||
    emissionFactor !== originalData?.emissionFactor.toString() ||
    unit !== originalData?.unit ||
    description !== originalData?.description;

  // Info: (20260414 - Julian) 判斷是否有空的欄位
  const hasEmpty =
    name !== "" && emissionFactor !== "" && unit !== "" && description !== "";

  // Info: (20260414 - Julian) 判斷是否可以送出：
  // 1. 新增模式：所有欄位都有填寫
  // 2. 編輯模式：所有欄位都有填寫，且有更改的數據
  const isSubmitDisabled = isEdit ? !hasChanged || !hasEmpty : !hasEmpty;

  // Info: (20260414 - Julian) 送出結果
  const confirmCoefficient = () => {
    // Info: (20260417 - Julian) 無條件捨去小數點後四位
    const efNum = parseFloat(emissionFactor);
    const efFloor = Math.floor(efNum * 10000) / 10000;

    const input: ICoefficientInput = {
      name,
      emissionFactor: efFloor,
      unit,
      description,
      source: "", // Info: (20260414 - Julian) 預設為空，由 API 填入
    };
    onConfirm(input);
  };

  const handleEmissionFactorChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;

    // Info: (20260417 - Julian) 允許清空
    if (value === "") {
      setEmissionFactor("");
      return;
    }

    // Info: (20260417 - Julian) 限制只能輸入數字和小數點，且在 MIN_VALUE 和 MAX_VALUE 之間
    const num = parseFloat(value);
    if (num < MIN_VALUE) {
      setEmissionFactor(MIN_VALUE.toString());
    } else if (num > MAX_VALUE) {
      setEmissionFactor(MAX_VALUE.toString());
    } else {
      setEmissionFactor(value);
    }
  };

  useEffect(() => {
    // Info: (20260414 - Julian) 從 API 取得係數資料
    const fetchCoefficient = async () => {
      try {
        setIsLoading(true);
        const data = await request<IApiResponse<ICoefficient>>(
          `/api/v1/user/account_book/${accountBookId}/esg/coefficient/${selectedCoefficientId}`,
          { method: "GET" },
        );
        if (data.payload) {
          setOriginalData({
            name: data.payload.name,
            emissionFactor: data.payload.emissionFactor,
            unit: data.payload.unit,
            description: data.payload.description,
            source: data.payload.source,
          });
        }
      } catch (error) {
        console.error("Error fetching coefficient:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Info: (20260414 - Julian) 編輯模式才要 call API
    if (isEdit) {
      fetchCoefficient();
    }
  }, [selectedCoefficientId, accountBookId, isEdit]);

  useEffect(() => {
    // Info: (20260413 - Julian) 編輯模式：填入係數資料
    if (isEdit) {
      // Info: (20260413 - Julian) 取得係數資料
      setName(originalData?.name || "");
      setEmissionFactor(originalData?.emissionFactor.toString() || "");
      setUnit(originalData?.unit || "");
      setDescription(originalData?.description || "");
    } else {
      // Info: (20260413 - Julian) 新增模式：清空表單
      setName("");
      setEmissionFactor("");
      setUnit("");
      setDescription("");
    }
  }, [originalData, isEdit, isOpen]);

  const modalContent = isLoading ? (
    <div className="flex min-h-60 items-center justify-center p-10 text-orange-400">
      <Loader2 className="animate-spin" size={40} />
    </div>
  ) : (
    <>
      {/* Info: (20260413 - Julian) Form */}
      <div className="grid grid-flow-row grid-cols-2 items-center gap-4 py-4 text-sm font-semibold lg:py-6">
        {/* Info: (20260413 - Julian) Name */}
        <div className="col-span-2 flex flex-col gap-1">
          <label
            htmlFor="coefficient-name"
            className="text-xs text-slate-600 lg:text-base"
          >
            {t("coefficient.modal.name")}
          </label>
          <input
            id="coefficient-name"
            aria-label={t("coefficient.modal.name")}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("coefficient.modal.name_placeholder")}
            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-slate-800 outline-none placeholder:text-gray-400 lg:text-sm"
          />
        </div>
        {/* Info: (20260413 - Julian) Emission Factor */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="coefficient-ef"
            className="text-xs text-slate-600 lg:text-base"
          >
            {t("coefficient.card.ef")}{" "}
            <span className="text-[10px] text-slate-400">
              小數點後四位無條件捨去
            </span>
          </label>
          <input
            id="coefficient-ef"
            aria-label={t("coefficient.card.ef")}
            type="number"
            min={MIN_VALUE}
            step={STEP_VALUE}
            max={MAX_VALUE}
            value={emissionFactor}
            onChange={handleEmissionFactorChange}
            placeholder="0.0000"
            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-slate-800 outline-none placeholder:text-gray-400 lg:text-sm"
          />
        </div>
        {/* Info: (20260413 - Julian) Unit */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="coefficient-unit"
            className="text-xs text-slate-600 lg:text-base"
          >
            {t("coefficient.modal.unit")}
          </label>
          <input
            id="coefficient-unit"
            aria-label={t("coefficient.modal.unit")}
            type="text"
            placeholder={t("coefficient.modal.unit_placeholder")}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-slate-800 outline-none placeholder:text-gray-400 lg:text-sm"
          />
        </div>
        {/* Info: (20260413 - Julian) Description */}
        <div className="col-span-2 flex flex-col gap-1">
          <label
            htmlFor="coefficient-desc"
            className="text-xs text-slate-600 lg:text-base"
          >
            {t("coefficient.modal.description")}
          </label>
          <textarea
            id="coefficient-desc"
            aria-label={t("coefficient.modal.description")}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("coefficient.modal.desc_placeholder")}
            className="resize-none rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-slate-800 outline-none placeholder:text-gray-400 lg:text-sm"
          />
        </div>
      </div>

      {/* Info: (20260413 - Julian) Buttons */}
      <div className="flex flex-col-reverse items-center gap-2 text-sm font-semibold lg:mt-4 lg:flex-row">
        <button
          type="button"
          className="inline-flex w-full justify-center rounded-md bg-gray-100 px-12 py-3 whitespace-nowrap text-gray-600 hover:bg-gray-200 lg:w-auto"
          onClick={onClose}
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-12 py-3 whitespace-nowrap text-white shadow-sm enabled:hover:bg-orange-700 disabled:bg-gray-200"
          onClick={confirmCoefficient}
          disabled={isSubmitDisabled}
        >
          <CircleCheck size={20} />
          <p>{t("coefficient.modal.save")}</p>
        </button>
      </div>
    </>
  );

  return (
    isOpen && (
      <div className="fixed inset-0 z-200 flex min-h-full w-screen items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity sm:p-0">
        <div className="relative overflow-hidden rounded-2xl bg-white p-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          {/* Info: (20260414 - Julian) Header */}
          <div className="flex items-start justify-between">
            {/* Info: (20260414 - Julian) Title */}
            <div className="flex items-center gap-2.5 lg:gap-4">
              <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600">
                <Calculator size={24} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 lg:text-xl">
                  {isEdit
                    ? t("coefficient.modal.title_edit")
                    : t("coefficient.modal.title_add")}
                </h3>
                <span className="text-[10px] text-gray-400 lg:text-xs">
                  {t("coefficient.modal.subtitle")}
                </span>
              </div>
            </div>
            {/* Info: (20260414 - Julian) Close Button */}
            <button
              type="button"
              className="rounded-full p-2 text-gray-400 outline-none hover:bg-gray-100 hover:text-gray-700"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X size={24} aria-hidden="true" />
            </button>
          </div>

          {/* Info: (20260414 - Julian) Modal Content */}
          {modalContent}
        </div>
      </div>
    )
  );
}
