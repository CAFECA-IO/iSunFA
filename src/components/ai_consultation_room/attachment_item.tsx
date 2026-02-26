import { useState, Fragment, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Paperclip, X, Loader2 } from "lucide-react";
import { IAttachment } from "@/interfaces/ai_talk";
import { useTranslation } from "@/i18n/i18n_context";
import { downloadFile } from "@/lib/file_operator";
import { FilePreview, isImage, isVideo, isAudio, isPdf } from "@/components/common/file_preview";

export const AttachmentItem = ({ attachment }: { attachment: IAttachment }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [localFileUrl, setLocalFileUrl] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState<boolean>(true);

  const isImageFile = isImage(attachment.fileName) || attachment.mimeType.startsWith("image/");
  const isPreviewable = isImageFile || isVideo(attachment.fileName) || isAudio(attachment.fileName) || isPdf(attachment.fileName);

  useEffect(() => {
    let objectUrl = "";
    let isCancelled = false;

    // Info: (20260226 - Julian) 使用前端下載與合併邏輯
    downloadFile(attachment.id, {
      onSuccess: (blob) => {
        if (!isCancelled) {
          objectUrl = URL.createObjectURL(blob);
          setLocalFileUrl(objectUrl);
          setIsDownloading(false);
        } else {
          try {
            URL.revokeObjectURL(URL.createObjectURL(blob));
          } catch {
            // ignore
          }
        }
      },
      onError: (err) => {
        console.error("Failed to download file:", attachment.id, err);
        if (!isCancelled) setIsDownloading(false);
      }
    });

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachment.id]);

  const thumbnail = isDownloading ? (
    <div className="bg-gray-50 rounded-xl w-full h-full flex items-center justify-center mb-1 transition-colors">
      <Loader2 className="animate-spin text-orange-500" size={24} />
    </div>
  ) : isImageFile && localFileUrl ? (
    <div className="rounded-xl overflow-hidden relative w-full flex items-center justify-center mb-1 h-[90px] shrink-0">
      <FilePreview
        file={{ filename: attachment.fileName, mimeType: attachment.mimeType }}
        url={localFileUrl}
        className="object-cover w-full h-full pointer-events-none"
      />
    </div>
  ) : (
    <div className="bg-gray-50 rounded-xl w-full h-full flex items-center justify-center mb-1 group-hover:bg-orange-50 transition-colors">
      <Paperclip
        className="text-gray-400 group-hover:text-orange-500 transition-colors"
        size={24}
      />
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isPreviewable && !isDownloading && localFileUrl) {
            setIsModalOpen(true);
          }
        }}
        className={`group relative w-32 h-32 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center outline-none p-2 transition-all ${
          isPreviewable && !isDownloading ? "cursor-zoom-in hover:shadow-lg" : "cursor-default"
        }`}
        aria-label={
          isPreviewable
            ? t("ai_consultation_room.view_image").replace(
                "{name}",
                attachment.fileName,
              )
            : attachment.fileName
        }
      >
        {thumbnail}
        <span className="text-[10px] text-gray-500 truncate w-full text-center px-1">
          {attachment.fileName}
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
                    {localFileUrl && (
                      <div className="w-full h-full flex items-center justify-center relative">
                        <FilePreview
                          file={{ filename: attachment.fileName, mimeType: attachment.mimeType }}
                          url={localFileUrl}
                          className="object-contain max-h-[85vh] max-w-full w-auto p-4"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-gray-900 font-bold">
                        {attachment.fileName}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {Math.round(attachment.fileSize / 1024)} KB •{" "}
                        {attachment.mimeType}
                      </p>
                    </div>
                    {localFileUrl && (
                      <a
                        href={localFileUrl}
                        download={attachment.fileName}
                        className="bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-orange-500 transition-all active:scale-95"
                      >
                        {t("ai_consultation_room.download_original")}
                      </a>
                    )}
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
