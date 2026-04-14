"use client";

import { useState, useEffect, Fragment } from "react";
import { X, Calculator, CircleCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { ICoefficient, ICoefficientInput } from "@/interfaces/coefficient";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";

interface ICoefficientAddEditModalProps {
  selectedCoefficientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (coefficient: ICoefficientInput) => void;
}

export default function CoefficientAddEditModal({
  selectedCoefficientId,
  isOpen,
  onClose,
  onConfirm,
}: ICoefficientAddEditModalProps) {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  // Info: (20260413 - Julian) 如果有選擇係數 ID，則為編輯模式，否則為新增模式
  const isEdit = selectedCoefficientId !== null;

  // Info: (20260413 - Julian) State
  const [name, setName] = useState<string>("");
  const [emissionFactor, setEmissionFactor] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // const [isSaving, setIsSaving] = useState<boolean>(false);

  const confirmCoefficient = () => {
    const input: ICoefficientInput = {
      name,
      emissionFactor: parseFloat(emissionFactor),
      unit,
      description,
      source: "", // Info: (20260414 - Julian) 預設為空，由 API 填入
    };
    onConfirm(input);
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
        setName(data.payload.name);
        setEmissionFactor(data.payload.emissionFactor.toString());
        setUnit(data.payload.unit);
        setDescription(data.payload.description);
      }
    } catch (error) {
      console.error("Error fetching coefficient:", error);
    } finally {
      setIsLoading(false);
    }
  };

    // Info: (20260413 - Julian) 編輯模式：填入係數資料
    if (isEdit) {
      // Info: (20260413 - Julian) 串接 API 取得係數資料
      fetchCoefficient();
    } else {
      // Info: (20260413 - Julian) 新增模式：清空表單
      setName("");
      setEmissionFactor("");
      setUnit("");
      setDescription("");
    }
  }, [accountBookId, selectedCoefficientId, isOpen, isEdit]);

  const modalContent = isLoading ? (
    <div className="flex min-h-60 items-center justify-center p-10 text-orange-400">
      <Loader2 className="animate-spin" size={40} />
    </div>
  ) : (
    <>
      {/* Info: (20260413 - Julian) Form */}
      <div className="grid grid-flow-row grid-cols-2 items-center gap-4 py-6 text-sm font-semibold">
        {/* Info: (20260413 - Julian) Name */}
        <div className="col-span-2 flex flex-col gap-1">
          <label htmlFor="coefficient-name" className="text-xs text-gray-400">
            係數名稱
          </label>
          <input
            id="coefficient-name"
            aria-label="係數名稱"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：特定產品碳足跡係數"
            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-gray-400"
          />
        </div>
        {/* Info: (20260413 - Julian) Emission Factor */}
        <div className="flex flex-col gap-1">
          <label htmlFor="coefficient-ef" className="text-xs text-gray-400">
            排放係數 (EF)
          </label>
          <input
            id="coefficient-ef"
            aria-label="排放係數"
            type="number"
            value={emissionFactor}
            onChange={(e) => setEmissionFactor(e.target.value)}
            placeholder="0.00"
            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-gray-400"
          />
        </div>
        {/* Info: (20260413 - Julian) Unit */}
        <div className="flex flex-col gap-1">
          <label htmlFor="coefficient-unit" className="text-xs text-gray-400">
            單位
          </label>
          <input
            id="coefficient-unit"
            aria-label="單位"
            type="text"
            placeholder="kgCO2e/你的單位"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-gray-400"
          />
        </div>
        {/* Info: (20260413 - Julian) Description */}
        <div className="col-span-2 flex flex-col gap-1">
          <label htmlFor="coefficient-desc" className="text-xs text-gray-400">
            描述說明
          </label>
          <textarea
            id="coefficient-desc"
            aria-label="描述說明"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="說明此係數的來源貨適用範圍..."
            className="resize-none rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Info: (20260413 - Julian) Buttons */}
      <div className="mt-4 flex flex-col-reverse items-center gap-2 text-sm font-semibold lg:flex-row">
        <button
          type="button"
          className="inline-flex w-full justify-center rounded-md bg-gray-100 px-12 py-3 whitespace-nowrap text-gray-600 hover:bg-gray-200 lg:w-auto"
          onClick={onClose}
        >
          取消
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-12 py-3 whitespace-nowrap text-white shadow-sm hover:bg-orange-700"
          onClick={confirmCoefficient}
        >
          <CircleCheck size={20} />
          <p>儲存係數</p>
        </button>
      </div>
    </>
  );

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-200" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-201 w-screen overflow-y-auto">
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
              <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white p-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="flex items-start justify-between">
                  <DialogTitle as="div" className="flex items-center gap-4">
                    <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600">
                      <Calculator size={24} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {isEdit ? "編輯自訂係數" : "新增自訂係數"}
                      </h3>
                      <span className="text-xs text-gray-400">
                        定義您的專屬碳排計算邏輯
                      </span>
                    </div>
                  </DialogTitle>
                  <button
                    type="button"
                    className="hover:text-gray-500outline-none text-gray-400"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <X size={24} aria-hidden="true" />
                  </button>
                </div>

                {modalContent}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
