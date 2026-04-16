"use client";

import { useState, useEffect, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { X, Calculator, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
// import { useTranslation } from "@/i18n/i18n_context";
import { ICoefficient } from "@/interfaces/coefficient";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";

interface ICoefficientSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit?: string;
  selectCoefficient: (coefficient: ICoefficient) => void;
}

export default function CoefficientSelectModal({
  isOpen,
  onClose,
  unit = "",
  selectCoefficient,
}: ICoefficientSelectModalProps) {
  // const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const accountBookId = params?.account_book_id as string;

  const [coefficientList, setCoefficientList] = useState<ICoefficient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const coefficientManagementUrl = `/user/account_book/${accountBookId}/esg?tab=coefficient`;

  // Info: (20260414 - Julian) 取得係數列表
  useEffect(() => {
    const fetchCoefficientList = async () => {
      try {
        setIsLoading(true);
        const unitQuery = unit ? `&unit=${unit}` : "";
        const data = await request<
          IApiResponse<{ items: ICoefficient[]; total: number }>
        >(
          `/api/v1/user/account_book/${accountBookId}/esg/coefficient?tab=all${unitQuery}`,
        );
        if (data.payload) {
          setCoefficientList(data.payload.items);
        }
      } catch (err) {
        console.error("Failed to fetch coefficient list:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCoefficientList();
  }, [accountBookId, unit]);

  const gotoCoefficientPage = () => {
    // Info: (20260416 - Julian) 關閉這個 modal
    onClose();
    // Info: (20260416 - Julian) 跳轉到係數管理頁面
    router.push(coefficientManagementUrl);
  };

  const displayCoefficientList = isLoading ? (
    <div className="flex items-center justify-center p-10">
      <Loader2 size={40} className="animate-spin text-orange-300" />
    </div>
  ) : coefficientList.length > 0 ? (
    <div className="flex flex-col gap-2">
      {coefficientList.map((coefficient) => {
        const onClick = () => {
          selectCoefficient(coefficient);
          onClose();
        };
        return (
          <button
            key={coefficient.id}
            type="button"
            onClick={onClick}
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 ease-in-out hover:border-orange-300 hover:bg-orange-50"
          >
            <div className="rounded-lg bg-slate-50 p-2 text-slate-700 transition-all duration-200 ease-in-out group-hover:bg-orange-400 group-hover:text-white">
              <Calculator size={16} />
            </div>
            <div className="flex flex-col items-start">
              <p className="text-sm font-bold text-slate-700">
                {coefficient.name}
              </p>
              <p className="text-xs font-semibold text-slate-400">
                {coefficient.unit} * {coefficient.emissionFactor}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2 px-10 py-5">
      <p className="text-base font-bold text-slate-700">
        目前沒有單位符合{" "}
        <span className="underline underline-offset-2">{unit}</span> 的係數
      </p>
      <button
        type="button"
        onClick={gotoCoefficientPage}
        className="rounded-full bg-orange-400 px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-in-out hover:bg-orange-600"
      >
        前往係數管理頁面新增係數
      </button>
    </div>
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
              <DialogPanel className="relative flex w-[450px] transform flex-col gap-6 overflow-hidden rounded-3xl bg-white p-8">
                {/* Info: (20260415 - Julian) Header */}
                <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                  <button
                    type="button"
                    className="rounded-full bg-white p-2 text-gray-400 outline-none hover:bg-gray-100 hover:text-gray-700"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <X size={24} aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <DialogTitle
                    as="h3"
                    className="text-2xl font-bold text-slate-700"
                  >
                    選擇計算公式
                  </DialogTitle>
                </div>

                {/* Info: (20260415 - Julian) Coefficient List */}
                {displayCoefficientList}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
