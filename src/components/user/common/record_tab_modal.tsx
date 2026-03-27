"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, BookCopy, FileText, Leaf, ImageIcon } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import dynamic from "next/dynamic";
import { IJournal } from "@/interfaces/journal";
import { IVoucher } from "@/interfaces/voucher";
import { IEsgRecord } from "@/interfaces/esg";
import { FilePreview } from "@/components/common/file_preview";

// Info: (20260327 - Luphia) 共用 Loading 畫面
const TabLoading = () => (
  <div className="flex h-full min-h-[50vh] items-center justify-center p-10 text-slate-400">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
  </div>
);

// Info: (20260327 - Luphia) 加入 Loading Fallback 避免動態載入時出現短暫白畫面
const JournalDetailModal = dynamic(() => import("@/components/user/journal/journal_detail_modal"), { ssr: false, loading: TabLoading });
const VoucherDetailModal = dynamic(() => import("@/components/user/voucher/voucher_detail_modal"), { ssr: false, loading: TabLoading });
const EsgDetailModal = dynamic(() => import("@/components/user/esg/esg_detail_modal"), { ssr: false, loading: TabLoading });
const ZoomablePreview = dynamic(() => import("@/components/common/zoomable_preview"), { ssr: false, loading: TabLoading });

export type RecordTabType = "journal" | "voucher" | "esg" | "preview";

interface IRecordTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: RecordTabType;
  journalId?: string | null;
  voucherId?: string | null;
  esgId?: string | null;
  file?: { id: string; hash?: string; fileName?: string } | null;
  onJournalUpdate?: (journal: IJournal) => void;
  onVoucherUpdate?: (voucher: IVoucher) => void;
  onEsgUpdate?: (esg: IEsgRecord) => void;
}

export default function RecordTabModal({
  isOpen,
  onClose,
  defaultTab = "journal",
  journalId: initialJournalId,
  voucherId: initialVoucherId,
  esgId: initialEsgId,
  file: initialFile,
  onJournalUpdate,
  onVoucherUpdate,
  onEsgUpdate,
}: IRecordTabModalProps) {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<RecordTabType>(defaultTab);

  // Info: (20260327 - Luphia) 記錄已點擊過/已掛載的 Tabs，避免切換 Tab 時遺失資料或重複打 API
  const [mountedTabs, setMountedTabs] = useState<Set<RecordTabType>>(new Set());

  const [journalId, setJournalId] = useState<string | null | undefined>(initialJournalId);
  const [voucherId, setVoucherId] = useState<string | null | undefined>(initialVoucherId);
  const [esgId, setEsgId] = useState<string | null | undefined>(initialEsgId);
  const [file, setFile] = useState(initialFile);

  // Info: (20260327 - Luphia) 處理彈窗的「開啟」與「關閉」重置邏輯
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setActiveTab(defaultTab);
      setMountedTabs(new Set([defaultTab]));
    }
  }

  // Info: (20260327 - Luphia) 當父層傳入的 Props 改變時，獨立同步到 Internal State (Render Phase)
  const [prevJournalId, setPrevJournalId] = useState(initialJournalId);
  if (initialJournalId !== prevJournalId) {
    setPrevJournalId(initialJournalId);
    setJournalId(initialJournalId);
  }

  const [prevVoucherId, setPrevVoucherId] = useState(initialVoucherId);
  if (initialVoucherId !== prevVoucherId) {
    setPrevVoucherId(initialVoucherId);
    setVoucherId(initialVoucherId);
  }

  const [prevEsgId, setPrevEsgId] = useState(initialEsgId);
  if (initialEsgId !== prevEsgId) {
    setPrevEsgId(initialEsgId);
    setEsgId(initialEsgId);
  }

  const [prevFile, setPrevFile] = useState(initialFile);
  if (
    initialFile?.id !== prevFile?.id ||
    initialFile?.hash !== prevFile?.hash
  ) {
    setPrevFile(initialFile);
    setFile(initialFile);
  }

  useEffect(() => {
    if (!isOpen) {
      // Info: (20260327 - Luphia) 彈窗關閉後，延遲清空掛載紀錄與內部狀態，確保下次開啟是全新乾淨的狀態
      const timer = setTimeout(() => {
        setMountedTabs(new Set());
        setJournalId(null);
        setPrevJournalId(null);
        setVoucherId(null);
        setPrevVoucherId(null);
        setEsgId(null);
        setPrevEsgId(null);
        setFile(null);
        setPrevFile(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Info: (20260327 - Luphia) 處理 Tab 切換時，將其加入已掛載名單
  const handleTabChange = (tab: RecordTabType) => {
    setActiveTab(tab);
    setMountedTabs((prev) => new Set(prev).add(tab));
  };

  // Info: (20260327 - Luphia) 使用 useCallback 避免子元件不必要的 Re-render
  const handleJournalUpdate = useCallback((j: IJournal) => {
    onJournalUpdate?.(j);
    if (j.voucherId) setVoucherId(j.voucherId);
    if (j.esgRecordId) setEsgId(j.esgRecordId);
    if (j.file) setFile(j.file);
  }, [onJournalUpdate]);

  const handleVoucherUpdate = useCallback((v: IVoucher) => {
    onVoucherUpdate?.(v);
    if (v.journalId) setJournalId(v.journalId);
    if (v.esgRecordId) setEsgId(v.esgRecordId);
    if (v.file) setFile(v.file);
  }, [onVoucherUpdate]);

  const handleEsgUpdate = useCallback((e: IEsgRecord) => {
    onEsgUpdate?.(e);
    if (e.journalId) setJournalId(e.journalId);
    if (e.voucherId) setVoucherId(e.voucherId);
    if (e.file) setFile(e.file);
  }, [onEsgUpdate]);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-[201] w-screen overflow-y-auto">
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
              <DialogPanel className="relative flex h-[90vh] w-full max-w-[95vw] transform flex-col rounded-2xl bg-white text-left shadow-2xl transition-all sm:max-w-[90vw] md:max-w-5xl lg:max-w-6xl">
                {/* Info: (20260327 - Luphia) Header / Tabs */}
                <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-gray-50/50 px-4 py-3 sm:px-6">
                  <div className="flex select-none space-x-2 overflow-x-auto pb-1 sm:space-x-4 sm:pb-0">
                    <button
                      onClick={() => handleTabChange("journal")}
                      disabled={!journalId}
                      className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-bold transition-colors ${activeTab === "journal"
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        }`}
                    >
                      <BookCopy size={16} />
                      <span className="hidden sm:inline">{t("journal.detail_modal.title")}</span>
                    </button>
                    <button
                      onClick={() => handleTabChange("voucher")}
                      disabled={!voucherId}
                      className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-bold transition-colors ${activeTab === "voucher"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        }`}
                    >
                      <FileText size={16} />
                      <span className="hidden sm:inline">{t("voucher.detail_modal.title")}</span>
                    </button>
                    <button
                      onClick={() => handleTabChange("esg")}
                      disabled={!esgId}
                      className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-bold transition-colors ${activeTab === "esg"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        }`}
                    >
                      <Leaf size={16} />
                      <span className="hidden sm:inline">{t("esg.detail_modal.title")}</span>
                    </button>
                    <button
                      onClick={() => handleTabChange("preview")}
                      disabled={!file?.hash}
                      className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 text-sm font-bold transition-colors ${activeTab === "preview"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        }`}
                    >
                      <ImageIcon size={16} />
                      <span className="hidden sm:inline">{String(t("ocr.preview") || "Preview")}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="ml-4 flex-shrink-0 rounded-full bg-gray-100 p-2 text-gray-500 outline-none transition-colors hover:bg-gray-200 hover:text-gray-700"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Info: (20260327 - Luphia) Content Area */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="h-full w-full">
                    {/* Info: (20260327 - Luphia) 只要曾被點擊過就掛載，非目前 active 則用 hidden 隱藏以保留狀態 */}
                    {mountedTabs.has("journal") && !!journalId && (
                      <div className={activeTab === "journal" ? "flex h-full flex-col" : "hidden"}>
                        <JournalDetailModal isOpen={true} onClose={onClose} journalId={journalId} onUpdate={handleJournalUpdate} />
                      </div>
                    )}

                    {mountedTabs.has("voucher") && !!voucherId && (
                      <div className={activeTab === "voucher" ? "flex h-full flex-col" : "hidden"}>
                        <VoucherDetailModal isOpen={true} onClose={onClose} voucherId={voucherId} onUpdate={handleVoucherUpdate} />
                      </div>
                    )}

                    {mountedTabs.has("esg") && !!esgId && (
                      <div className={activeTab === "esg" ? "flex h-full flex-col" : "hidden"}>
                        <EsgDetailModal isOpen={true} onClose={onClose} esgId={esgId} onSave={handleEsgUpdate} />
                      </div>
                    )}

                    {mountedTabs.has("preview") && !!file && (
                      <div className={activeTab === "preview" ? "block h-full" : "hidden"}>
                        <div className="flex h-full flex-col">
                          <div className="flex-1 overflow-hidden bg-gray-50 p-6">
                            <div className="size-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                              <ZoomablePreview
                                hasContent={!!file?.hash}
                                fallbackText={t("ocr.no_image") as string}
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
                        </div>
                      </div>
                    )}
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
