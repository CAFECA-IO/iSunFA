"use client";

import { Fragment } from "react";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  X,
  Check,
  Package,
  CreditCard,
  ClipboardCheck,
  Settings,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ORDER_STATUS } from "@/constants/status";
import { formatDate } from "@/lib/utils/date";

interface IOrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    createdAt: string;
    status: string;
    items?: { name: string }[];
  } | null;
}

export default function OrderTrackingModal({
  isOpen,
  onClose,
  order,
}: IOrderTrackingModalProps) {
  const { t } = useTranslation();

  if (!order) return null;

  const steps = [
    {
      id: "PENDING",
      title: t("billing.tracking.status.pending.title"),
      desc: t("billing.tracking.status.pending.desc"),
      icon: ClipboardCheck,
      status: [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PAYING,
        ORDER_STATUS.PAID,
        ORDER_STATUS.EXECUTING,
        ORDER_STATUS.COMPLETED,
      ],
    },
    {
      id: "PAID",
      title: t("billing.tracking.status.paid.title"),
      desc: t("billing.tracking.status.paid.desc"),
      icon: CreditCard,
      status: [
        ORDER_STATUS.PAID,
        ORDER_STATUS.EXECUTING,
        ORDER_STATUS.COMPLETED,
      ],
    },
    {
      id: "EXECUTING",
      title: t("billing.tracking.status.executing.title"),
      desc: t("billing.tracking.status.executing.desc"),
      icon: Settings,
      status: [ORDER_STATUS.EXECUTING, ORDER_STATUS.COMPLETED],
    },
    {
      id: "COMPLETED",
      title: t("billing.tracking.status.completed.title"),
      desc: t("billing.tracking.status.completed.desc"),
      icon: Package,
      status: [ORDER_STATUS.COMPLETED],
    },
  ];

  const currentStatusIndex = steps.findIndex((step) =>
    (step.status as string[]).includes(order.status),
  );

  return (
    <Transition show={isOpen} as={Fragment}>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
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
              <DialogPanel className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    {t("billing.tracking.title")}
                  </DialogTitle>
                  <div className="mt-2 flex flex-col gap-1">
                    <p className="font-mono text-sm text-gray-500">
                      ID: {order.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("billing.table.date")}:{" "}
                      {formatDate(order.createdAt, "yyyy-MM-dd HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="space-y-8 py-4">
                  {steps.map((step, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className="relative flex gap-4">
                        {/* Info: (20260705 - Luphia) Line connector */}
                        {index !== steps.length - 1 && (
                          <div
                            className={`absolute top-10 left-5 h-10 w-0.5 ${
                              index < currentStatusIndex
                                ? "bg-orange-500"
                                : "bg-gray-200"
                            }`}
                          />
                        )}

                        <div
                          className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                            isCompleted
                              ? "border-orange-500 bg-orange-50 text-orange-600"
                              : "border-gray-200 bg-white text-gray-300"
                          } ${isCurrent ? "ring-4 ring-orange-100" : ""}`}
                        >
                          {isCompleted && !isCurrent ? (
                            <Check className="size-5" />
                          ) : (
                            <Icon className="size-5" />
                          )}
                        </div>

                        <div className="flex flex-col">
                          <h4
                            className={`text-sm font-bold transition-colors duration-300 ${
                              isCompleted ? "text-gray-900" : "text-gray-400"
                            }`}
                          >
                            {step.title}
                          </h4>
                          <p
                            className={`mt-1 text-xs transition-colors duration-300 ${
                              isCompleted ? "text-gray-500" : "text-gray-300"
                            }`}
                          >
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={onClose}
                    className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-gray-800"
                  >
                    {t("common.close")}
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
