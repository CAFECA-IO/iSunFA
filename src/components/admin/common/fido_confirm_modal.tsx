import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface IFidoConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string | ReactNode;
  description?: string | ReactNode;
  children?: ReactNode;
  alertNode?: ReactNode;
  isProcessing?: boolean;
  disabled?: boolean;
  confirmText?: string | ReactNode;
  cancelText?: string | ReactNode;
  colorTheme?: "orange" | "gray" | "emerald" | "red";
}

const colorMap = {
  orange: "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500/20",
  gray: "bg-gray-900 hover:bg-gray-800 focus:ring-gray-900/20",
  emerald: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/20",
  red: "bg-red-600 hover:bg-red-700 focus:ring-red-500/20",
};

export default function FidoConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  children,
  alertNode,
  isProcessing = false,
  disabled = false,
  confirmText,
  cancelText,
  colorTheme = "orange",
}: IFidoConfirmModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
        <div className="p-6">
          <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>

          {description && (
            <p className="mb-6 text-sm text-gray-500">{description}</p>
          )}

          {children && (
            <div className="mb-6 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 font-mono text-sm inline-block w-full">
              {children}
            </div>
          )}

          {alertNode && <div className="mb-6">{alertNode}</div>}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              {cancelText || t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              disabled={isProcessing || disabled}
              onClick={onConfirm}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none transition-colors ${colorMap[colorTheme]}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.processing", { defaultValue: "Processing..." })}
                </>
              ) : (
                confirmText || t("common.confirm", { defaultValue: "Confirm via WebAuthn" })
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
