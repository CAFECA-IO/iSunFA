import { Fragment, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, Search, CheckCircle, Loader2 } from "lucide-react";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

interface IUser {
  id: string;
  name: string | null;
  address: string;
}

interface IPagination {
  page: number;
  limit: number;
  totalPages: number;
  totalElements: number;
}

interface IAirdropModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string | null;
  onSuccess: () => void;
}

export default function AirdropModal({
  isOpen,
  onClose,
  campaignId,
  onSuccess,
}: IAirdropModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<IUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [userQrContents, setUserQrContents] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchUsers = useCallback(
    async (pageNum: number, searchQuery: string, append: boolean = false) => {
      if (!isOpen) return;
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(pageNum),
          limit: "10",
          search: searchQuery,
        });

        const res = await request<{
          success: boolean;
          payload: { data: IUser[]; pagination: IPagination };
        }>(`/api/v1/admin/user?${queryParams.toString()}`);

        if (res.success && res.payload) {
          if (append) {
            setUsers((prev) => [...prev, ...res.payload.data]);
          } else {
            setUsers(res.payload.data);
          }
          setHasMore(pageNum < res.payload.pagination.totalPages);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [isOpen],
  );

  // Info: (20260517 - Luphia) Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers(1, search, false);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, isOpen, fetchUsers]);

  // Info: (20260517 - Luphia) Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setPage(1);
      setSelectedUserIds(new Set());
      setUserQrContents({});
      setError(null);
    }
  }, [isOpen]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUsers(nextPage, search, true);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
      setUserQrContents((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleQrContentChange = (userId: string, content: string) => {
    setUserQrContents((prev) => ({ ...prev, [userId]: content }));
  };

  const handleSubmit = async () => {
    if (!campaignId || selectedUserIds.size === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await request<{
        success: boolean;
        payload: { airdropped: number };
      }>(`/api/v1/admin/coupon/${campaignId}/airdrop`, {
        method: "POST",
        body: JSON.stringify({
          users: Array.from(selectedUserIds).map((userId) => ({
            userId,
            customQrContent: userQrContents[userId] || "",
          })),
        }),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(t("admin_coupon.error_occurred"));
      }
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || t("admin_coupon.error_occurred"));
      } else {
        setError(t("admin_coupon.error_occurred"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="bg-opacity-25 fixed inset-0 bg-black backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  className="flex items-center justify-between text-lg leading-6 font-medium text-gray-900"
                >
                  {t("admin_coupon.airdrop")}
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </DialogTitle>

                <div className="mt-4 space-y-4">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="search-user"
                      aria-label={t("common.search")}
                      className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pr-3 pl-9 text-sm text-gray-900 focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                      placeholder={t("common.search")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200">
                    {users.map((user) => (
                      <Fragment key={user.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleUserSelection(user.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleUserSelection(user.id);
                            }
                          }}
                          className={`flex cursor-pointer items-center justify-between border-b border-gray-100 p-3 last:border-b-0 hover:bg-orange-50 ${
                            selectedUserIds.has(user.id)
                              ? "bg-orange-50/50"
                              : ""
                          }`}
                        >
                          <div className="mr-3 flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-semibold text-gray-900">
                              {user.name || t("admin_member.page.unnamed_user")}
                            </span>
                            <span className="truncate font-mono text-xs text-gray-500">
                              {user.address}
                            </span>
                          </div>
                          <div className="shrink-0">
                            {selectedUserIds.has(user.id) ? (
                              <CheckCircle className="h-5 w-5 text-orange-600" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                        </div>
                        {selectedUserIds.has(user.id) && (
                          <div className="border-b border-gray-100 bg-orange-50/30 px-3 pt-1 pb-3">
                            <input
                              type="text"
                              placeholder={t(
                                "admin_coupon.form.custom_qr_placeholder",
                              )}
                              aria-label={t(
                                "admin_coupon.form.custom_qr_placeholder",
                              )}
                              className="w-full rounded-md border-gray-300 px-2 py-1.5 text-xs text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 focus:outline-none"
                              value={userQrContents[user.id] || ""}
                              onChange={(e) =>
                                handleQrContentChange(user.id, e.target.value)
                              }
                            />
                          </div>
                        )}
                      </Fragment>
                    ))}
                    {loading && (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                      </div>
                    )}
                    {!loading && hasMore && users.length > 0 && (
                      <button
                        onClick={handleLoadMore}
                        className="w-full p-2 text-sm text-gray-500 hover:text-orange-600"
                      >
                        {t("common.load")}...
                      </button>
                    )}
                    {!loading && users.length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        {t("common.no_data")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {t("admin_coupon.selected_users")}:{" "}
                      <span className="font-bold text-orange-600">
                        {selectedUserIds.size}
                      </span>
                    </span>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                      onClick={onClose}
                      disabled={isSubmitting}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
                      onClick={handleSubmit}
                      disabled={isSubmitting || selectedUserIds.size === 0}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("common.processing")}
                        </>
                      ) : (
                        t("common.confirm")
                      )}
                    </button>
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
