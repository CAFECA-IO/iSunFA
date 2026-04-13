"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, Fragment } from "react";
import { X, Calculator, CircleCheck } from "lucide-react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { mockCoefficientList } from "@/interfaces/coefficient";

interface ICoefficientAddEditModalProps {
  selectedCoefficientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CoefficientAddEditModal({
  selectedCoefficientId,
  isOpen,
  onClose,
  onConfirm,
}: ICoefficientAddEditModalProps) {
  // Info: (20260413 - Julian) 如果有選擇係數 ID，則為編輯模式，否則為新增模式
  const isEdit = selectedCoefficientId !== null;

  // Info: (20260413 - Julian) State
  const [name, setName] = useState<string>("");
  const [emissionFactor, setEmissionFactor] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    // Info: (20260413 - Julian) 編輯模式：填入係數資料
    if (isEdit) {
      // ToDo: (20260413 - Julian) 串接 API 取得係數資料
      const data = mockCoefficientList.find((coefficient) => coefficient.id === selectedCoefficientId);
      if (data) {
        setName(data.name);
        setEmissionFactor(data.emissionFactor.toString());
        setUnit(data.unit);
        setDescription(data.description);
      }
    } else {
      // Info: (20260413 - Julian) 新增模式：清空表單
      setName("");
      setEmissionFactor("");
      setUnit("");
      setDescription("");
    }
  }, [selectedCoefficientId, isOpen, isEdit]);

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

                {/* Info: (20260413 - Julian) Form */}
                <div className="grid grid-cols-2 grid-flow-row items-center gap-4 py-6 text-sm font-semibold">
                  {/* Info: (20260413 - Julian) Name */}
                  <div className="flex flex-col gap-1 col-span-2">
                    <label htmlFor="coefficient-name" className="text-xs text-gray-400">係數名稱</label>
                    <input
                      id="coefficient-name"
                      aria-label="係數名稱"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例如：特定產品碳足跡係數"
                      className="rounded-lg border outline-none border-gray-100 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 text-slate-800"
                    />
                  </div>
                  {/* Info: (20260413 - Julian) Emission Factor */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="coefficient-ef" className="text-xs text-gray-400">排放係數 (EF)</label>
                    <input
                      id="coefficient-ef"
                      aria-label="排放係數"
                      type="number"
                      value={emissionFactor}
                      onChange={(e) => setEmissionFactor(e.target.value)}
                      placeholder="0.00"
                      className="rounded-lg border outline-none border-gray-100 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 text-slate-800"
                    />
                  </div>
                  {/* Info: (20260413 - Julian) Unit */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="coefficient-unit" className="text-xs text-gray-400">單位</label>
                    <input
                      id="coefficient-unit"
                      aria-label="單位"
                      type="text"
                      placeholder="kgCO2e/你的單位"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="rounded-lg border outline-none border-gray-100 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 text-slate-800"
                    />
                  </div>
                  {/* Info: (20260413 - Julian) Description */}
                  <div className="flex flex-col gap-1 col-span-2">
                    <label htmlFor="coefficient-desc" className="text-xs text-gray-400">描述說明</label>
                    <textarea
                      id="coefficient-desc"
                      aria-label="描述說明"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="說明此係數的來源貨適用範圍..."
                      className="rounded-lg border outline-none resize-none border-gray-100 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 text-slate-800"
                    />
                  </div>
                </div>

                {/* Info: (20260413 - Julian) Buttons */}
                <div className="flex lg:flex-row flex-col-reverse mt-4 items-center gap-2 text-sm font-semibold">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md bg-gray-100 px-12 py-3 whitespace-nowrap text-gray-600 hover:bg-gray-200 w-full lg:w-auto"
                    onClick={onClose}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-12 py-3 whitespace-nowrap text-white shadow-sm hover:bg-orange-700"
                    onClick={onConfirm}
                  >
                    <CircleCheck size={20} />
                    <p>儲存係數</p>
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};