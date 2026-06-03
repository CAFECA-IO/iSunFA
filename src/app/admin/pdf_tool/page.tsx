"use client";

import { useState } from "react";
import AdminPageHeader from "@/components/admin/common/admin_page_header";
import { FileText } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import ConfirmModal from "@/components/common/confirm_modal";
import PdfEditor from "@/components/pdf_tool/pdf_editor";

export default function AdminPdfEditorPage() {
  const { t } = useTranslation();
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminPageHeader
          icon={FileText}
          title={t("admin_mission_board.pdf_editor.title")!}
          subtitle={t("admin_mission_board.pdf_editor.subtitle")!}
        />

        <PdfEditor setErrorModal={setErrorModal} />
      </div>

      <ConfirmModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "" })}
        title={t("common.notification")!}
        message={errorModal.message}
        confirmText={t("common.ok")!}
      />
    </div>
  );
}
