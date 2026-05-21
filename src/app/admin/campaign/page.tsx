"use client";

import { useState, useEffect, useCallback } from "react";
import { request } from "@/lib/utils/request";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import { ICampaignData } from "@/components/admin/campaign/types";
import CampaignModal from "@/components/admin/campaign/campaign_modal";
import CampaignUsersModal from "@/components/admin/campaign/campaign_users_modal";
import ConfirmModal from "@/components/common/confirm_modal";
import { Trophy, Plus, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { formatDate } from "@/lib/utils/date";

export default function CampaignManagementPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const [loading, setLoading] = useState<boolean>(true);
  const [campaigns, setCampaigns] = useState<ICampaignData[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalElements: 0,
    totalPages: 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ICampaignData | null>(
    null,
  );

  const [selectedCampaignForUsers, setSelectedCampaignForUsers] =
    useState<ICampaignData | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    cancelText?: string;
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
  ) => {
    setConfirmState({ isOpen: true, title, message, onConfirm, cancelText });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    bonusPoints: "0",
    bonusModules: "",
    isActive: true,
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
          data: ICampaignData[];
          pagination: {
            page: number;
            limit: number;
            totalElements: number;
            totalPages: number;
          };
        };
      }>(`/api/v1/admin/campaign?${query.toString()}`);

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

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleOpenModal = (campaign?: ICampaignData) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        code: campaign.code,
        name: campaign.name,
        description: campaign.description || "",
        startDate: new Date(campaign.startDate).toISOString().slice(0, 16),
        endDate: new Date(campaign.endDate).toISOString().slice(0, 16),
        bonusPoints: String(campaign.bonusPoints),
        bonusModules: campaign.bonusModules.join(", "),
        isActive: campaign.isActive,
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        code: "",
        name: "",
        description: "",
        startDate: new Date().toISOString().slice(0, 16),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 16),
        bonusPoints: "0",
        bonusModules: "",
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        bonusModules: formData.bonusModules
          ? formData.bonusModules.split(",").map((s) => s.trim())
          : [],
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      if (editingCampaign) {
        await request(`/api/v1/admin/campaign/${editingCampaign.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await request(`/api/v1/admin/campaign`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchCampaigns();
    } catch (e) {
      console.error("Failed to save campaign", e);
      showConfirm(
        t("admin_campaign.error_occurred"),
        t("admin_campaign.save_failed"),
      );
    }
  };

  const handleDelete = (id: string) => {
    showConfirm(
      t("admin_campaign.delete_title"),
      t("admin_campaign.delete_confirm"),
      async () => {
        try {
          await request(`/api/v1/admin/campaign/${id}`, { method: "DELETE" });
          fetchCampaigns();
        } catch (e) {
          console.error("Failed to delete campaign", e);
          showConfirm(
            t("admin_campaign.error_occurred"),
            t("admin_campaign.delete_error"),
          );
        }
      },
      t("common.cancel"),
    );
  };

  const toggleStatus = async (campaign: ICampaignData) => {
    try {
      await request(`/api/v1/admin/campaign/${campaign.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !campaign.isActive }),
      });
      fetchCampaigns();
    } catch (e) {
      console.error("Failed to toggle campaign status", e);
    }
  };

  const columns: IDataTableColumn<ICampaignData>[] = [
    {
      key: "code",
      label: t("admin_campaign.table.code"),
      render: (record) => (
        <span className="rounded bg-orange-100 px-2 py-1 font-mono text-xs text-orange-600">
          {record.code}
        </span>
      ),
    },
    {
      key: "name",
      label: t("admin_campaign.table.name"),
      render: (record) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {record.name}
          </span>
          {record.description && (
            <span className="text-xs text-gray-500">{record.description}</span>
          )}
        </div>
      ),
    },
    {
      key: "duration",
      label: t("admin_campaign.table.duration"),
      render: (record) => (
        <div className="flex flex-col text-xs text-gray-500">
          <span>{formatDate(record.startDate, "yyyy-MM-dd")}</span>
          <span>~ {formatDate(record.endDate, "yyyy-MM-dd")}</span>
        </div>
      ),
    },
    {
      key: "rewards",
      label: t("admin_campaign.table.rewards"),
      render: (record) => (
        <div className="flex flex-col text-xs text-gray-600">
          <span>+{record.bonusPoints} pts</span>
          {record.bonusModules.length > 0 && (
            <span className="mt-1 text-[10px] text-gray-400">
              {record.bonusModules.join(", ")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "stats",
      label: t("admin_campaign.table.stats"),
      align: "right",
      render: (record) => (
        <div className="flex flex-col text-right">
          <span className="text-sm font-bold text-gray-900">
            {record.participantCount}
          </span>
          <span className="text-xs text-gray-500">
            {record.totalPointsIssued} pts
          </span>
        </div>
      ),
    },
    {
      key: "isActive",
      label: t("admin_campaign.table.status"),
      render: (record) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleStatus(record);
          }}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
            record.isActive
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {record.isActive ? "Active" : "Inactive"}
        </button>
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

  const handleRowClick = (record: ICampaignData) => {
    setSelectedCampaignForUsers(record);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminPageHeader
            icon={Trophy}
            title={t("admin_campaign.title")}
            subtitle={t("admin_campaign.subtitle")}
          />
          <button
            onClick={() => handleOpenModal()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 sm:w-auto"
          >
            <Plus size={18} />
            {t("admin_campaign.create")}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <DataTable<ICampaignData>
            columns={columns}
            data={campaigns}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            emptyStateText={t("common.no_data")}
            rowKey={(record) => record.id}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      <CampaignModal
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
      />

      <CampaignUsersModal
        isOpen={!!selectedCampaignForUsers}
        onClose={() => setSelectedCampaignForUsers(null)}
        campaignId={selectedCampaignForUsers?.id || null}
        campaignName={selectedCampaignForUsers?.name || ""}
      />
    </div>
  );
}
