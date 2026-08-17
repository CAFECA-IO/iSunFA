"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  FileText,
  Loader2,
  Lock,
  Paperclip,
  Share2,
  Trash2,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { HTTP_METHOD } from "@/constants/http";
import { formatDate } from "@/lib/utils/date";
import { USER_DOCUMENT_KIND } from "@/interfaces/user_document";

/**
 * Info: (20260817 - Luphia) 「文件與記憶」。
 *
 * 兩個問題，一個頁面：**我在這個系統上放了什麼**，以及**費思記得我什麼**。
 * 後者在此之前完全不可見——使用者只能整包刪掉一個他從未看過的東西。
 *
 * 兩區的資料性質不同，畫面上要說得出差別：文件有些是端對端加密的
 * （server 自己也讀不到，只知道它存在），記憶則是逐條可刪的。
 */

interface IUserDocument {
  id: string;
  kind: string;
  title: string;
  updatedAt: number;
  encrypted: boolean;
  accountBookId?: string;
  shared?: boolean;
}

interface IMemoryItem {
  id: string;
  category: string;
  statement: string;
  updatedAt: number;
}

interface ITeamOption {
  id: string;
  name: string;
}

const KIND_ICON: Record<string, typeof FileText> = {
  [USER_DOCUMENT_KIND.PDF_EDITOR]: FileText,
  [USER_DOCUMENT_KIND.EVIDENCE_FILE]: Paperclip,
  [USER_DOCUMENT_KIND.CARBON_DRAFT]: FileText,
};

export default function DocumentsAndMemoryPage() {
  const { t } = useTranslation();

  const [documents, setDocuments] = useState<IUserDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const [teams, setTeams] = useState<ITeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [memory, setMemory] = useState<IMemoryItem[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await request<{
          payload: { documents: IUserDocument[] } | null;
        }>("/api/v1/user/documents");
        setDocuments(res.payload?.documents ?? []);
      } catch {
        setDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await request<{ payload: ITeamOption[] | null }>(
          "/api/v1/user/team",
        );
        const list = res.payload ?? [];
        setTeams(list);
        // Info: (20260817 - Luphia) 記憶以團隊為範圍，只有一個團隊就不必多一步選擇
        if (list.length > 0) setSelectedTeamId(list[0].id);
      } catch {
        setTeams([]);
      }
    };
    load();
  }, []);

  const loadMemory = useCallback(async (teamId: string) => {
    setMemoryLoading(true);
    try {
      const res = await request<{
        payload: { enabled: boolean; items: IMemoryItem[] } | null;
      }>(`/api/v1/user/team/${teamId}/faith_memory`);
      setMemoryEnabled(res.payload?.enabled ?? false);
      setMemory(res.payload?.items ?? []);
    } catch {
      setMemory([]);
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) loadMemory(selectedTeamId);
  }, [selectedTeamId, loadMemory]);

  const deleteItem = async (itemId: string) => {
    if (!selectedTeamId) return;
    setDeletingId(itemId);
    try {
      await request(
        `/api/v1/user/team/${selectedTeamId}/faith_memory/${itemId}`,
        { method: HTTP_METHOD.DELETE },
      );
      // Info: (20260817 - Luphia) 樂觀移除：刪除是冪等的，重整也會得到同一個結果
      setMemory((prev) => prev.filter((item) => item.id !== itemId));
    } catch {
      // Info: (20260817 - Luphia) 失敗就重載，讓畫面與伺服器一致而不是停在樂觀狀態
      loadMemory(selectedTeamId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">
        {t("documents_memory.title")}
      </h1>
      <p className="mb-8 text-sm text-gray-600">
        {t("documents_memory.description")}
      </p>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
          <FileText className="size-5 shrink-0 text-orange-600" />
          {t("documents_memory.documents_title")}
        </h2>

        {documentsLoading ? (
          <Loader2 className="size-5 animate-spin text-orange-500" />
        ) : documents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            {t("documents_memory.documents_empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => {
              const Icon = KIND_ICON[doc.kind] ?? FileText;
              return (
                <li
                  key={`${doc.kind}-${doc.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="size-5 shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {doc.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t(`documents_memory.kind.${doc.kind}`)} ·{" "}
                        {formatDate(doc.updatedAt * 1000, "yyyy-MM-dd HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/**
                     * Info: (20260817 - Luphia) 端對端加密的文件要明講「系統也讀不到」。
                     * 不標的話，使用者會以為我們看得到而選擇不顯示。
                     */}
                    {doc.encrypted && (
                      <span
                        title={t("documents_memory.encrypted_hint")}
                        className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600"
                      >
                        <Lock className="size-3 shrink-0" />
                        {t("documents_memory.encrypted")}
                      </span>
                    )}
                    {doc.shared && (
                      <span
                        title={t("documents_memory.shared_hint")}
                        className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                      >
                        <Share2 className="size-3 shrink-0" />
                        {t("documents_memory.shared")}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
          <Brain className="size-5 shrink-0 text-orange-600" />
          {t("documents_memory.memory_title")}
        </h2>

        {teams.length > 1 && (
          <select
            value={selectedTeamId ?? ""}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            aria-label={t("documents_memory.memory_team")}
            className="mb-4 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}

        {memoryLoading ? (
          <Loader2 className="size-5 animate-spin text-orange-500" />
        ) : !memoryEnabled ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            {t("documents_memory.memory_free_plan")}
          </p>
        ) : memory.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            {t("documents_memory.memory_empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {memory.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-900">{item.statement}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {t(`documents_memory.category.${item.category}`)} ·{" "}
                    {formatDate(item.updatedAt * 1000, "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  disabled={deletingId === item.id}
                  title={t("documents_memory.memory_delete")}
                  className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="size-4 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-gray-500">
          {t("documents_memory.memory_note")}
        </p>
      </section>
    </div>
  );
}
