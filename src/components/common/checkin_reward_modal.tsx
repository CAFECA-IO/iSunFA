"use client";

import React, { Fragment } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { CheckCircle2 } from "lucide-react";

interface ICheckinRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rewardAmount: number;
}

export const CheckinRewardModal: React.FC<ICheckinRewardModalProps> = ({ isOpen, onClose, rewardAmount }) => {
  const { t } = useTranslation();

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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all border border-gray-100">
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-green-50 to-white">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-60 animate-pulse"></div>
                    <div className="bg-green-100 rounded-full p-4 relative border-4 border-white shadow-sm">
                      <CheckCircle2 className="w-16 h-16 text-green-600 drop-shadow-md" />
                    </div>
                  </div>

                  <div className="text-center w-full mb-2">
                    <DialogTitle as="h3" className="text-2xl font-bold text-gray-800 w-full text-center tracking-tight">
                      {t("checkin_reward.title")}
                    </DialogTitle>
                    <p className="text-gray-500 mt-2 text-[15px] font-medium px-4 text-center">
                      {t("checkin_reward.description", { amount: rewardAmount.toString() })}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col items-center border border-green-100 rounded-xl px-8 py-3 bg-white shadow-sm w-full">
                    <span className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">
                      {t("checkin_reward.reward_label")}
                    </span>
                    <span className="text-3xl font-black text-green-600">+{rewardAmount} {t("checkin_reward.unit")}</span>
                  </div>
                </div>

                <div className="px-6 py-5 bg-gray-50 flex items-center justify-center border-t border-gray-100 w-full">
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto min-w-[200px] h-12 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center font-medium text-lg rounded-xl shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {t("common.confirm")}
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
