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
import { FilePreview } from "@/components/common/file_preview";

export const AttachmentItem = ({ file }: { file: IFile }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [localMeta, setLocalMeta] = useState<{
    hash: string;
    filename?: string;
    mimeType?: string;
    fileSize?: number;
  }>({
    hash: file.hash,
    filename: file.fileName,
  });

  const fileName = localMeta.filename ?? file.fileName ?? "unknown";

  const handlePreviewLoad = (
    metadata:
      | ILariaMetadata
      | {
          filename: string;
          mimeType?: string;
          originalFileSize?: number;
          fileSize?: number;
        },
  ) => {
    let filename = "";
    let mimeType = "";
    let fileSize = 0;

    if ("filename" in metadata) {
      filename = metadata.filename;
      mimeType = metadata.mimeType || "";
      fileSize =
        (metadata as { originalFileSize?: number; fileSize?: number })
          .originalFileSize ||
        (metadata as { originalFileSize?: number; fileSize?: number })
          .fileSize ||
        0;
    }

    setLocalMeta({
      hash: file.hash,
      filename: filename || file.fileName || "unknown",
      mimeType: mimeType || undefined,
      fileSize: fileSize || undefined,
    });
  };

  const thumbnail = (
    <div className="relative mb-1 flex h-[90px] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl">
      <FilePreview
        fileId={file.hash}
        file={{ filename: localMeta.hash, mimeType: localMeta.mimeType }}
        className="pointer-events-none h-full w-full object-cover"
      />
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`group relative flex h-32 w-32 cursor-zoom-in flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-2 transition-all outline-none hover:shadow-lg`}
        aria-label={t("ai_consultation_room.view_image").replace(
          "{name}",
          fileName,
        )}
      >
        {thumbnail}
        <span className="w-full truncate px-1 text-center text-[10px] text-gray-500">
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
                <DialogPanel className="relative w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white p-2 text-left shadow-2xl transition-all sm:my-8">
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      type="button"
                      className="rounded-full bg-black/20 p-2 text-white backdrop-blur-md transition-all hover:bg-black/40 focus:outline-none"
                      onClick={() => setIsModalOpen(false)}
                    >
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="relative flex aspect-video max-h-[85vh] min-h-[300px] w-full items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                    <div className="relative flex h-full w-full items-center justify-center">
                      <FilePreview
                        fileId={file.hash}
                        file={{
                          filename: localMeta.hash,
                          mimeType: localMeta.mimeType,
                        }}
                        className="max-h-[85vh] w-auto max-w-full object-contain p-4"
                        loadPreview={handlePreviewLoad}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{fileName}</h3>
                      {localMeta.mimeType && (
                        <p className="text-xs text-gray-400">
                          {localMeta.fileSize
                            ? `${Math.round(localMeta.fileSize / 1024)} KB • `
                            : ""}
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
