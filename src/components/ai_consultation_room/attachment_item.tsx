"use client";

import { useState, Fragment } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import Image from "next/image";
import { Paperclip, X } from "lucide-react";
import { IAttachment } from "@/interfaces/ai_talk";

export const AttachmentItem = ({ attachment }: { attachment: IAttachment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isImage = attachment.mimeType.startsWith("image/");

  const thumbnail = attachment.thumbnailUrl ? (
    <div className="rounded-xl overflow-hidden relative w-full flex items-center justify-center mb-1 h-[90px] shrink-0">
      <Image
        src={attachment.thumbnailUrl}
        alt={attachment.fileName}
        fill
        className="object-contain group-hover:bg-orange-50 transition-colors"
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
        onClick={() => isImage && setIsModalOpen(true)}
        className={`group relative w-32 h-32 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center outline-none p-2 transition-all ${
          isImage ? "cursor-zoom-in hover:shadow-lg" : "cursor-default"
        }`}
        aria-label={isImage ? `查看圖片: ${attachment.fileName}` : attachment.fileName}
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
                    <Image
                      src={attachment.url}
                      alt={attachment.fileName}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                  
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-gray-900 font-bold">{attachment.fileName}</h3>
                      <p className="text-xs text-gray-400">
                        {Math.round(attachment.fileSize / 1024)} KB • {attachment.mimeType}
                      </p>
                    </div>
                    <a 
                      href={attachment.url} 
                      download={attachment.fileName}
                      className="bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-orange-500 transition-all active:scale-95"
                    >
                      下載原始檔案
                    </a>
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
