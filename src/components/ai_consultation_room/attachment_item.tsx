import { useState, Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";
import { IFile } from "@/interfaces/ai_talk";
import { useTranslation } from "@/i18n/i18n_context";
import { ILariaMetadata } from "@/lib/file_operator";
import { FilePreview} from "@/components/common/file_preview";

export const AttachmentItem = ({ file }: { file: IFile }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [localMeta, setLocalMeta] = useState<{ hash: string; filename?: string; mimeType?: string; fileSize?: number }>({
    hash: file.hash,
    filename: file.fileName,
  });

  const fileName = localMeta.filename ?? file.fileName ?? 'unknown';

  const handlePreviewLoad = (metadata: ILariaMetadata | { filename: string; mimeType?: string; originalFileSize?: number; fileSize?: number }) => {
    let filename = "";
    let mimeType = "";
    let fileSize = 0;

    if ('filename' in metadata) {
      filename = metadata.filename
      mimeType = metadata.mimeType || "";
      fileSize = (metadata as { originalFileSize?: number; fileSize?: number }).originalFileSize || (metadata as { originalFileSize?: number; fileSize?: number }).fileSize || 0;
    }

    setLocalMeta({
      hash: file.hash,
      filename: filename || file.fileName || 'unknown',
      mimeType: mimeType || undefined,
      fileSize: fileSize || undefined
    });
  };

  const thumbnail = (
    <div className="rounded-xl overflow-hidden relative w-full flex items-center justify-center mb-1 h-[90px] shrink-0">
      <FilePreview
        fileId={file.hash}
        file={{ filename: localMeta.hash, mimeType: localMeta.mimeType }}
        className="object-cover w-full h-full pointer-events-none"
      />
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`group relative w-32 h-32 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center outline-none p-2 transition-all cursor-zoom-in hover:shadow-lg`}
        aria-label={
          t("ai_consultation_room.view_image").replace(
            "{name}",
            fileName,
          )
        }
      >
        {thumbnail}
        <span className="text-[10px] text-gray-500 truncate w-full text-center px-1">
          {fileName}
        </span>
      </button>

      {/* Info: (20260209 - Julian) Image Preview Modal */}
      <Transition show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-60"
          onClose={() => setIsModalOpen(false)}
        >
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

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white p-2 text-left shadow-2xl transition-all sm:my-8 max-w-5xl w-full">
                  <div className="absolute right-4 top-4 z-10">
                    <button
                      type="button"
                      className="rounded-full bg-black/20 p-2 text-white hover:bg-black/40 backdrop-blur-md transition-all focus:outline-none"
                      onClick={() => setIsModalOpen(false)}
                    >
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="relative w-full aspect-video min-h-[300px] max-h-[85vh] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center relative">
                      <FilePreview
                        fileId={file.hash}
                        file={{ filename: localMeta.hash, mimeType: localMeta.mimeType }}
                        className="object-contain max-h-[85vh] max-w-full w-auto p-4"
                        loadPreview={handlePreviewLoad}
                      />
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-gray-900 font-bold">
                        {fileName}
                      </h3>
                      {localMeta.mimeType && (
                        <p className="text-xs text-gray-400">
                          {localMeta.fileSize ? `${Math.round(localMeta.fileSize / 1024)} KB • ` : ""}
                          {localMeta.mimeType}
                        </p>
                      )}
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
