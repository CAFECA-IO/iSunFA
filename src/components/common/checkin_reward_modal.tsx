"use client";

import { Fragment, FC } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { CheckCircle2 } from "lucide-react";

interface ICheckinRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rewardAmount: string;
}

export const CheckinRewardModal: FC<ICheckinRewardModalProps> = ({
  isOpen,
  onClose,
  rewardAmount,
}) => {
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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-gray-100 bg-white text-left align-middle shadow-xl transition-all">
                <div className="flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-8">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 animate-pulse rounded-full bg-green-200 opacity-60 blur-xl"></div>
                    <div className="relative rounded-full border-4 border-white bg-green-100 p-4 shadow-sm">
                      <CheckCircle2 className="h-16 w-16 text-green-600 drop-shadow-md" />
                    </div>
                  </div>

                  <div className="mb-2 w-full text-center">
                    <DialogTitle
                      as="h3"
                      className="w-full text-center text-2xl font-bold tracking-tight text-gray-800"
                    >
                      {t("checkin_reward.title")}
                    </DialogTitle>
                    <p className="mt-2 px-4 text-center text-[15px] font-medium text-gray-500">
                      {t("checkin_reward.description", {
                        amount: rewardAmount.toString(),
                      })}
                    </p>
                  </div>

                  <div className="mt-6 flex w-full flex-col items-center rounded-xl border border-green-100 bg-white px-8 py-3 shadow-sm">
                    <span className="mb-1 text-xs font-bold tracking-wider text-gray-400 uppercase">
                      {t("checkin_reward.reward_label")}
                    </span>
                    <span className="text-3xl font-black text-green-600">
                      +{rewardAmount} {t("checkin_reward.unit")}
                    </span>
                  </div>
                </div>

                <div className="flex w-full items-center justify-center border-t border-gray-100 bg-gray-50 px-6 py-5">
                  <button
                    onClick={onClose}
                    className="flex h-12 w-full min-w-[200px] items-center justify-center rounded-xl bg-green-600 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-green-500/30 sm:w-auto"
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
