"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { MarkdownContent } from "@/components/common/markdown_content";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";

interface IMechanismModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MechanismModal({
  isOpen,
  onClose,
}: IMechanismModalProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !content) {
      const fetchContent = async () => {
        setIsLoading(true);
        try {
          const res = await request<IApiResponse<{ content: string }>>(
            "/api/v1/salary_calculator/mechanism",
          );
          if (res.payload?.content) {
            setContent(res.payload.content);
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchContent();
    }
  }, [isOpen, content]);

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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <DialogPanel className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <DialogTitle
                  as="h3"
                  className="text-xl font-bold text-slate-800"
                >
                  {t("calculator.header.how_it_works")}
                </DialogTitle>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {isLoading ? (
                  <div className="flex justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  </div>
                ) : (
                  <div className="prose max-w-none text-slate-700">
                    <MarkdownContent content={content} theme="light" />
                  </div>
                )}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
