import {
  X,
  User,
  Calendar,
  Hash,
  FileText,
  Mail,
  Phone,
  MapPin,
  Building,
  Activity,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";
import { formatDate } from "@/lib/utils/date";
import { HTTP_METHOD } from "@/constants/http";
import { APPLICATION_STATUS } from "@/constants/status";

interface IApplicationData {
  id: string;
  solutionId: string;
  taxId: string;
  companyName: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  message: string | null;
  status: string;
  createdAt: string;
}

interface IApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: IApplicationData | null;
  onStatusUpdate?: () => void;
}

export default function ApplicationDetailModal({
  isOpen,
  onClose,
  application,
  onStatusUpdate = () => {},
}: IApplicationDetailModalProps) {
  const { t } = useTranslation();
  const [updating, setUpdating] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  useEffect(() => {
    if (application) {
      setLocalStatus(application.status);
    }
  }, [application]);

  const currentStatus = localStatus || application?.status;

  const handleStatusChange = async (newStatus: string) => {
    if (!application || updating) return;
    setUpdating(true);
    try {
      await request(`/api/v1/admin/applications/${application.id}/status`, {
        method: HTTP_METHOD.PATCH,
        body: JSON.stringify({ status: newStatus }),
      });
      setLocalStatus(newStatus);
      onStatusUpdate?.();
    } catch (error) {
      console.error("[Status Update Error]:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">
            {t("application_management.detail.title") || "Application Details"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Info: (20260706 - Luphia) Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Hash size={14} />{" "}
                  {t("application_management.table.id") || "ID"}
                </label>
                <div className="rounded border border-gray-100 bg-gray-50 p-2 font-mono text-sm text-gray-700">
                  {application.id}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Calendar size={14} />{" "}
                  {t("application_management.table.date") || "Date"}
                </label>
                <div className="text-sm text-gray-700">
                  {formatDate(application.createdAt, "yyyy-MM-dd HH:mm:ss")}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Building size={14} />{" "}
                  {t("application_management.table.solution_id") ||
                    "Solution ID"}
                </label>
                <div className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {application.solutionId === "general"
                    ? t("solutions.general_consult")
                    : t(`solutions.title_${application.solutionId}`) ||
                      application.solutionId}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Activity size={14} />{" "}
                  {t("application_management.table.status") || "Status"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(APPLICATION_STATUS).map((key) => (
                    <button
                      key={key}
                      disabled={updating}
                      onClick={() => handleStatusChange(key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                        currentStatus === key
                          ? "bg-orange-50 text-orange-700 ring-1 ring-orange-700/20 ring-inset"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      } disabled:opacity-50`}
                    >
                      {t(`application_management.status.${key}`)}
                    </button>
                  ))}
                  {updating && (
                    <div className="ml-2 flex items-center">
                      <Loader2
                        className="animate-spin text-orange-500"
                        size={16}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info: (20260706 - Luphia) Company Info */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Building size={14} />{" "}
                  {t("application_management.table.company_name") || "Company"}
                </label>
                <div className="text-sm font-bold text-gray-900">
                  {application.companyName}
                </div>
                <div className="text-xs text-gray-400">
                  {t("application_management.table.tax_id") || "Tax ID"}:{" "}
                  {application.taxId}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <User size={14} />{" "}
                  {t("application_management.table.contact_person") ||
                    "Contact"}
                </label>
                <div className="text-sm text-gray-700">
                  {application.contactPerson}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Mail size={14} />{" "}
                  {t("application_management.table.email") || "Email"}
                </label>
                <div className="truncate text-sm text-gray-700">
                  {application.email}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  <Phone size={14} />{" "}
                  {t("application_management.table.phone") || "Phone"}
                </label>
                <div className="text-sm text-gray-700">{application.phone}</div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              <MapPin size={14} />{" "}
              {t("application_management.table.address") || "Address"}
            </label>
            <div className="text-sm text-gray-700">{application.address}</div>
          </div>

          <div className="mt-8">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              <FileText size={14} />{" "}
              {t("application_management.table.message") || "Message"}
            </label>
            <div className="rounded-lg bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-700 shadow-inner">
              {application.message ||
                t("application_management.detail.no_message") ||
                "No message"}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
