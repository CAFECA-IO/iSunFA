"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";

interface IQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  title?: string;
  description?: string;
}

export default function QrCodeModal({
  isOpen,
  onClose,
  value,
  title = "",
}: IQrCodeModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-center">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-bold text-gray-900"
                  >
                    {title || t("common.qr_code")}
                  </Dialog.Title>
                </div>

                <div className="mt-6 flex flex-col items-center justify-center space-y-6">
                  <div className="rounded-2xl border-4 border-orange-50 bg-white p-4 shadow-inner">
                    <QRCodeSVG
                      value={value}
                      size={200}
                      level="H"
                      includeMargin={false}
                      className="rounded-lg"
                    />
                  </div>

                  <div className="w-full space-y-4">
                    <div className="flex w-full items-center justify-between rounded-lg bg-gray-50 p-3 ring-1 ring-gray-100">
                      <p className="mr-2 truncate font-mono text-xs text-gray-600">
                        {value}
                      </p>
                      <button
                        onClick={handleCopy}
                        className="shrink-0 p-1 text-gray-400 transition-colors hover:text-orange-500"
                      >
                        {copied ? (
                          <Check className="size-4 text-emerald-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white transition-all outline-none hover:bg-orange-700"
                    >
                      {t("common.done")}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
