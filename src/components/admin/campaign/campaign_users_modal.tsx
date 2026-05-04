import { useState, useEffect, Fragment, useCallback } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, Users } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { formatDate } from "@/lib/utils/date";

interface IUserRegistration {
  id: string;
  campaignId: string;
  userId: string;
  entityType: string;
  entityName: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    address: string;
  };
}

interface ICampaignUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string | null;
  campaignName: string;
}

export default function CampaignUsersModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
}: ICampaignUsersModalProps) {
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState<IUserRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalElements: 0,
    totalPages: 0,
  });

  const fetchUsers = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const res = await request<{
        payload: {
          data: IUserRegistration[];
          pagination: {
            page: number;
            limit: number;
            totalElements: number;
            totalPages: number;
          };
        };
      }>(
        `/api/v1/admin/campaign/${campaignId}/registrations?page=${page}&limit=15`,
      );

      if (res.payload) {
        setRegistrations(res.payload.data);
        setPagination(res.payload.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch campaign users:", error);
    } finally {
      setLoading(false);
    }
  }, [campaignId, page]);

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchUsers();
    }
  }, [isOpen, campaignId, fetchUsers]);

  const columns: IDataTableColumn<IUserRegistration>[] = [
    {
      key: "user",
      label: t("admin_campaign.users.table.user")!,
      render: (record) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {record.user.name || record.contactEmail || "Unknown User"}
          </span>
          <span className="max-w-[150px] truncate font-mono text-xs text-gray-500">
            {record.user.address}
          </span>
        </div>
      ),
    },
    {
      key: "entity",
      label: t("admin_campaign.users.table.entity")!,
      render: (record) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-900">
            {record.entityType === "company" ? "公司" : "個人"} -{" "}
            {record.entityName}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      label: t("admin_campaign.users.table.contact")!,
      render: (record) => (
        <div className="flex flex-col text-xs text-gray-500">
          <span>{record.contactEmail}</span>
          <span>{record.contactPhone}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: t("admin_campaign.users.table.date")!,
      render: (record) => (
        <span className="text-xs text-gray-500">
          {formatDate(record.createdAt, "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
  ];

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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle transition-all">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange-100 p-2 text-orange-600">
                      <Users size={20} />
                    </div>
                    <div>
                      <DialogTitle
                        as="h3"
                        className="text-lg leading-6 font-bold text-gray-900"
                      >
                        {t("admin_campaign.users.title")}
                      </DialogTitle>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {campaignName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="bg-gray-50 p-6">
                  <DataTable<IUserRegistration>
                    columns={columns}
                    data={registrations}
                    loading={loading}
                    pagination={pagination}
                    onPageChange={setPage}
                    emptyStateText={t("admin_campaign.users.table.no_data")}
                    rowKey={(record) => record.id}
                  />
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
