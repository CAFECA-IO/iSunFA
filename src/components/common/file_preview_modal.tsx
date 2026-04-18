import { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import ZoomablePreview from "@/components/common/zoomable_preview";

interface IFilePreviewModalProps {
  isEmbedded?: boolean;
  isOpen: boolean;
  onClose: () => void;
  file?: {
    hash?: string;
    fileName?: string;
  } | null;
  title?: string;
  fallbackText?: string;
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  file = undefined,
  title = undefined,
  fallbackText = undefined,
}: IFilePreviewModalProps) {
  const { t } = useTranslation();

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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
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
              <DialogPanel className="relative flex h-[90vh] w-full max-w-[90vw] transform flex-col justify-center overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all">
                {/* Info: (20260325 - Julian) Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <DialogTitle
                    as="h3"
                    className="text-xl font-bold text-slate-800"
                  >
                    {title || t("ocr.preview") || "Preview"}
                  </DialogTitle>
                  <button
                    type="button"
                    className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors outline-none hover:bg-gray-200 hover:text-gray-700"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Info: (20260325 - Julian) Body Content */}
                <div className="flex-1 overflow-hidden bg-gray-50 p-6">
                  <div className="size-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <ZoomablePreview
                      hasContent={!!file?.hash}
                      fallbackText={
                        fallbackText || (t("ocr.no_image") as string)
                      }
                      className="h-full w-full"
                    >
                      {file?.hash && (
                        <FilePreview
                          file={{
                            filename: file.fileName || "Unknown",
                          }}
                          fileId={file.hash}
                          className="size-full object-contain"
                        />
                      )}
                    </ZoomablePreview>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
