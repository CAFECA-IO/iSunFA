"use client";

import { useState, useEffect, useCallback } from "react";
import { request } from "@/lib/utils/request";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import ConfirmModal from "@/components/common/confirm_modal";
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Send,
  Key,
  UserCircle,
  Search,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { formatDate } from "@/lib/utils/date";
import { uploadFile } from "@/lib/file_operator";
import CouponModal from "@/components/admin/coupon/coupon_modal";
import AirdropModal from "@/components/admin/coupon/airdrop_modal";
import { getLoginOptions, fido2ClientService } from "@/lib/auth/fido2_client";
import { COUPON_STATUS } from "@/constants/status";

export interface IRedemptionRecordData {
  id: string;
  userId: string;
  campaignId: string;
  status: string;
  txHashClaim: string | null;
  txHashBurn: string | null;
  customQrContent: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    address: string;
  };
  campaign: {
    id: string;
    title: string;
  };
}

export interface ICouponCampaignData {
  id: string;
  title: string;
  metadataHash: string;
  claimCode: string | null;
  redemptionDeadline: string;
  usageDeadline: string;
  maxClaims: number;
  isTransferable: boolean;
  customQrContent: string | null;
  claimsCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CouponManagementPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"campaigns" | "redemptions">(
    "campaigns",
  );
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  // Info: (20260525 - Luphia) Redemptions tab states
  const [redemptionPage, setRedemptionPage] = useState<number>(1);
  const [redemptionSearch, setRedemptionSearch] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<
    string | undefined
  >(undefined);
  const [redemptions, setRedemptions] = useState<IRedemptionRecordData[]>([]);
  const [redemptionLoading, setRedemptionLoading] = useState<boolean>(false);
  const [allCampaignsForFilter, setAllCampaignsForFilter] = useState<
    ICouponCampaignData[]
  >([]);
  const [redemptionPagination, setRedemptionPagination] = useState({
    page: 1,
    limit: 15,
    totalElements: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [campaigns, setCampaigns] = useState<ICouponCampaignData[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalElements: 0,
    totalPages: 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<ICouponCampaignData | null>(null);

  const [isAirdropModalOpen, setIsAirdropModalOpen] = useState(false);
  const [airdropCampaignId, setAirdropCampaignId] = useState<string | null>(
    null,
  );

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    cancelText?: string;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm?: () => void,
    cancelText?: string,
    confirmText?: string,
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      cancelText,
      confirmText,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const [formData, setFormData] = useState({
    title: "",
    metadataHash: "",
    markdownContent: "",
    claimCode: "",
    redemptionDeadline: "",
    usageDeadline: "",
    maxClaims: 0,
    isTransferable: true,
    customQrContent: "",
  });

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      const res = await request<{
        payload: {
          data: ICouponCampaignData[];
          pagination: {
            page: number;
            limit: number;
            totalElements: number;
            totalPages: number;
          };
        };
      }>(`/api/v1/admin/coupon?${query.toString()}`);

      if (res.payload) {
        setCampaigns(res.payload.data);
        setPagination(res.payload.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const fetchRedemptions = useCallback(async () => {
    setRedemptionLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(redemptionPage),
        limit: String(limit),
      });
      if (redemptionSearch) {
        query.append("search", redemptionSearch);
      }
      if (selectedCampaignId) {
        query.append("campaignId", selectedCampaignId);
      }

      const res = await request<{
        payload: {
          data: IRedemptionRecordData[];
          pagination: {
            page: number;
            limit: number;
            totalElements: number;
            totalPages: number;
          };
          stats?: {
            total: number;
            used: number;
            active: number;
          };
        };
      }>(`/api/v1/admin/coupon/records?${query.toString()}`);

      if (res.payload) {
        setRedemptions(res.payload.data);
        setRedemptionPagination(res.payload.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRedemptionLoading(false);
    }
  }, [redemptionPage, redemptionSearch, selectedCampaignId, limit]);

  const fetchAllCampaignsForFilter = useCallback(async () => {
    try {
      const res = await request<{
        payload: {
          data: ICouponCampaignData[];
        };
      }>(`/api/v1/admin/coupon?page=1&limit=100`);
      if (res.payload) {
        setAllCampaignsForFilter(res.payload.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "campaigns") {
      fetchCampaigns();
    } else if (activeTab === "redemptions") {
      fetchRedemptions();
    }
  }, [activeTab, fetchCampaigns, fetchRedemptions]);

  useEffect(() => {
    fetchAllCampaignsForFilter();
  }, [fetchAllCampaignsForFilter]);

  const handleOpenModal = (campaign?: ICouponCampaignData) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        title: campaign.title,
        metadataHash: campaign.metadataHash,
        markdownContent: "",
        claimCode: campaign.claimCode || "",
        redemptionDeadline: new Date(campaign.redemptionDeadline)
          .toISOString()
          .slice(0, 16),
        usageDeadline: new Date(campaign.usageDeadline)
          .toISOString()
          .slice(0, 16),
        maxClaims: campaign.maxClaims,
        isTransferable: campaign.isTransferable,
        customQrContent: campaign.customQrContent || "",
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        title: "",
        metadataHash: "",
        markdownContent: "",
        claimCode: "",
        redemptionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 16),
        usageDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 16),
        maxClaims: 0,
        isTransferable: true,
        customQrContent: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      let currentMetadataHash = formData.metadataHash;

      // Info: (20260517 - Luphia) If markdown content was provided/edited, upload it as a file to get the new hash
      if (formData.markdownContent) {
        const blob = new Blob([formData.markdownContent], {
          type: "text/markdown",
        });
        const file = new File([blob], "coupon.md", { type: "text/markdown" });
        await new Promise<void>((resolve, reject) => {
          uploadFile(file, {
            onSuccess: (hash) => {
              currentMetadataHash = hash;
              resolve();
            },
            onError: (err) => reject(new Error(err)),
          });
        });
      }

      if (!currentMetadataHash) {
        throw new Error("Metadata hash is required. Please provide content.");
      }

      const payload = {
        ...formData,
        metadataHash: currentMetadataHash,
        claimCode: formData.claimCode.trim() || null,
        customQrContent: formData.customQrContent || null,
        redemptionDeadline: new Date(formData.redemptionDeadline).toISOString(),
        usageDeadline: new Date(formData.usageDeadline).toISOString(),
      };

      if (editingCampaign) {
        await request(`/api/v1/admin/coupon/${editingCampaign.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await request(`/api/v1/admin/coupon`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchCampaigns();
    } catch (e) {
      console.error("Failed to save campaign", e);
      showConfirm(
        t("admin_coupon.error_occurred"),
        t("admin_coupon.save_failed"),
      );
    }
  };

  const handleDelete = (id: string) => {
    showConfirm(
      t("admin_coupon.delete_title"),
      t("admin_coupon.delete_confirm"),
      async () => {
        try {
          await request(`/api/v1/admin/coupon/${id}`, { method: "DELETE" });
          fetchCampaigns();
        } catch (e) {
          console.error("Failed to delete campaign", e);
          showConfirm(
            t("admin_coupon.error_occurred"),
            t("admin_coupon.delete_error"),
          );
        }
      },
      t("common.cancel"),
      t("common.confirm"),
    );
  };

  const handleResetCoupon = (couponId: string) => {
    showConfirm(
      t("admin_coupon.redemption_table.reset_confirm_title"),
      t("admin_coupon.redemption_table.reset_confirm_msg"),
      async () => {
        try {
          const { challenge, token } = await getLoginOptions();
          const authentication = await fido2ClientService.startLogin({
            challenge,
          });

          await request<{ success: boolean; message?: string }>(
            `/api/v1/admin/coupon/records`,
            {
              method: "POST",
              body: JSON.stringify({
                couponId,
                fido2Signature: {
                  authentication,
                  challengeToken: token,
                },
              }),
            },
          );

          showConfirm(
            t("common.success"),
            t("admin_coupon.redemption_table.reset_success"),
          );
          fetchRedemptions();
        } catch (e: unknown) {
          console.error("FIDO2 reset failed", e);
          const errorMsg =
            e instanceof Error
              ? e.message
              : t("admin_coupon.redemption_table.reset_failed");
          showConfirm(
            t("admin_coupon.error_occurred"),
            `${t("admin_coupon.redemption_table.reset_failed")}${errorMsg}`,
          );
        }
      },
      t("common.cancel"),
      t("common.confirm"),
    );
  };

  const redemptionColumns: IDataTableColumn<IRedemptionRecordData>[] = [
    {
      key: "user",
      label: t("admin_coupon.redemption_table.user"),
      render: (record) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            {record.user?.name ? (
              record.user.name.substring(0, 2).toUpperCase()
            ) : (
              <UserCircle className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {record.user?.name || "Unnamed User"}
            </div>
            <div
              className="mt-0.5 font-mono text-xs text-gray-400"
              title={record.user?.address}
            >
              {record.user?.address
                ? `${record.user.address.substring(0, 8)}...${record.user.address.substring(record.user.address.length - 6)}`
                : "Unknown"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "campaign",
      label: t("admin_coupon.redemption_table.campaign"),
      render: (record) => (
        <span
          className="text-sm font-medium text-gray-900"
          title={record.campaign?.title}
        >
          {record.campaign?.title || "Unknown Campaign"}
        </span>
      ),
    },
    {
      key: "status",
      label: t("admin_coupon.redemption_table.status"),
      render: (record) => {
        let badgeStyle = "bg-gray-100 text-gray-600";
        let statusLabel = record.status;

        if (record.status === COUPON_STATUS.ACTIVE) {
          badgeStyle =
            "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10";
          statusLabel = t("admin_coupon.redemption_table.status_active");
        } else if (record.status === COUPON_STATUS.USED) {
          badgeStyle = "bg-orange-50 text-orange-700 ring-1 ring-orange-600/10";
          statusLabel = t("admin_coupon.redemption_table.status_used");
        } else if (record.status === COUPON_STATUS.EXPIRED) {
          badgeStyle = "bg-rose-50 text-rose-700 ring-1 ring-rose-600/10";
          statusLabel = t("admin_coupon.redemption_table.status_expired");
        }

        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${badgeStyle}`}
          >
            {statusLabel}
          </span>
        );
      },
    },
    {
      key: "txHashClaim",
      label: t("admin_coupon.redemption_table.tx_claim"),
      render: (record) =>
        record.txHashClaim ? (
          <span
            className="cursor-help rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600"
            title={record.txHashClaim}
          >
            {record.txHashClaim.substring(0, 10)}...
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
    {
      key: "txHashBurn",
      label: t("admin_coupon.redemption_table.tx_burn"),
      render: (record) =>
        record.txHashBurn ? (
          <span
            className="cursor-help rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600"
            title={record.txHashBurn}
          >
            {record.txHashBurn.substring(0, 10)}...
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
    {
      key: "createdAt",
      label: t("admin_coupon.redemption_table.created_at"),
      render: (record) => (
        <span className="text-xs text-gray-500">
          {formatDate(record.createdAt, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("admin_coupon.redemption_table.actions"),
      align: "right",
      render: (record) => (
        <div className="flex justify-end gap-2">
          {record.status === COUPON_STATUS.USED && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetCoupon(record.id);
              }}
              title={t("admin_coupon.redemption_table.reset")}
              className="flex items-center gap-1 rounded border border-orange-200 bg-orange-50/50 px-2.5 py-1 text-xs font-semibold text-orange-600 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50"
            >
              <Key size={12} className="shrink-0" />
              <span>{t("admin_coupon.redemption_table.reset")}</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  const columns: IDataTableColumn<ICouponCampaignData>[] = [
    {
      key: "title",
      label: t("admin_coupon.table.title"),
      render: (record) => (
        <span
          className="max-w-[200px] truncate text-sm font-medium text-gray-900"
          title={record.title}
        >
          {record.title}
        </span>
      ),
    },
    {
      key: "metadataHash",
      label: "Content Hash",
      render: (record) => (
        <div className="flex flex-col">
          <span
            className="max-w-[200px] truncate text-sm font-medium text-gray-900"
            title={record.metadataHash}
          >
            {record.metadataHash.substring(0, 10)}...
          </span>
        </div>
      ),
    },
    {
      key: "claimCode",
      label: t("admin_coupon.table.claim_code"),
      render: (record) =>
        record.claimCode ? (
          <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-600">
            {record.claimCode}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Airdrop Only</span>
        ),
    },
    {
      key: "redemptionDeadline",
      label: t("admin_coupon.table.redemption_deadline"),
      render: (record) => (
        <span className="text-xs text-gray-500">
          {formatDate(record.redemptionDeadline, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      key: "usageDeadline",
      label: t("admin_coupon.table.usage_deadline"),
      render: (record) => (
        <span className="text-xs text-gray-500">
          {formatDate(record.usageDeadline, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      key: "claims",
      label: t("admin_coupon.table.claims"),
      align: "right",
      render: (record) => (
        <div className="flex flex-col text-right text-sm">
          <span className="font-bold text-gray-900">
            {record.claimsCount}{" "}
            <span className="font-normal text-gray-400">
              / {record.maxClaims === 0 ? "∞" : record.maxClaims}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "transferable",
      label: t("admin_coupon.table.transferable"),
      render: (record) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
            record.isTransferable
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {record.isTransferable ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (record) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAirdropCampaignId(record.id);
              setIsAirdropModalOpen(true);
            }}
            title="Airdrop"
            className="rounded p-1.5 text-gray-400 hover:bg-orange-100 hover:text-orange-600"
          >
            <Send size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal(record);
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.id);
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminPageHeader
            icon={Tag}
            title={t("admin_coupon.title")}
            subtitle={t("admin_coupon.subtitle")}
          />
          {activeTab === "campaigns" && (
            <button
              onClick={() => handleOpenModal()}
              className="animate-in fade-in flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white duration-200 hover:bg-orange-500 sm:w-auto"
            >
              <Plus size={18} />
              {t("admin_coupon.create")}
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Info: (20260525 - Luphia) Tabs Header */}
          <div className="flex items-center gap-1 border-b border-gray-100 bg-gray-50/50 p-2">
            <button
              onClick={() => {
                setActiveTab("campaigns");
                setPage(1);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 md:flex-none ${
                activeTab === "campaigns"
                  ? "bg-white text-orange-600 shadow-sm ring-1 ring-gray-100"
                  : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-700"
              }`}
            >
              <Tag className="h-4 w-4" />
              {t("admin_coupon.tabs.campaigns")}
            </button>
            <button
              onClick={() => {
                setActiveTab("redemptions");
                setRedemptionPage(1);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 md:flex-none ${
                activeTab === "redemptions"
                  ? "bg-white text-orange-600 shadow-sm ring-1 ring-gray-100"
                  : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-700"
              }`}
            >
              <Key className="h-4 w-4" />
              {t("admin_coupon.tabs.redemptions")}
            </button>
          </div>

          {/* Info: (20260525 - Luphia) Redemptions Filters Panel */}
          {activeTab === "redemptions" && (
            <div className="animate-in slide-in-from-top-2 flex flex-col gap-3 border-b border-gray-100 bg-gray-50/50 p-4 duration-200 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                <input
                  aria-label={t(
                    "admin_coupon.redemption_table.search_placeholder",
                  )}
                  type="text"
                  placeholder={t(
                    "admin_coupon.redemption_table.search_placeholder",
                  )}
                  value={redemptionSearch}
                  onChange={(e) => {
                    setRedemptionSearch(e.target.value);
                    setRedemptionPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-4 pl-9 text-sm transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                />
              </div>
              <div className="w-full sm:w-64">
                <select
                  aria-label={t("admin_coupon.redemption_table.all_campaigns")}
                  value={selectedCampaignId || ""}
                  onChange={(e) => {
                    setSelectedCampaignId(e.target.value || undefined);
                    setRedemptionPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                >
                  <option value="">
                    {t("admin_coupon.redemption_table.all_campaigns")}
                  </option>
                  {allCampaignsForFilter.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === "campaigns" ? (
            <DataTable<ICouponCampaignData>
              columns={columns}
              data={campaigns}
              loading={loading}
              pagination={pagination}
              onPageChange={setPage}
              emptyStateText={t("common.no_data")}
              rowKey={(record) => record.id}
            />
          ) : (
            <DataTable<IRedemptionRecordData>
              columns={redemptionColumns}
              data={redemptions}
              loading={redemptionLoading}
              pagination={redemptionPagination}
              onPageChange={setRedemptionPage}
              emptyStateText={t("common.no_data")}
              rowKey={(record) => record.id}
            />
          )}
        </div>
      </div>

      <CouponModal
        isOpen={isModalOpen}
        editingCampaign={editingCampaign}
        formData={formData}
        setFormData={setFormData}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        cancelText={confirmState.cancelText}
        confirmText={confirmState.confirmText}
      />

      <AirdropModal
        isOpen={isAirdropModalOpen}
        onClose={() => setIsAirdropModalOpen(false)}
        campaignId={airdropCampaignId}
        onSuccess={fetchCampaigns}
      />
    </div>
  );
}
