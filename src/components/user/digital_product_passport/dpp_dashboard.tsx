"use client";

import { useTranslation } from "@/i18n/i18n_context";
import { useParams, useRouter } from "next/navigation";
import { FileText, PlusCircle, Factory, PackageOpen } from "lucide-react";
import ConfirmModal from "@/components/common/confirm_modal";
import { useState } from "react";

export default function DppDashboard() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const accountBookId = params.account_book_id as string;

  const [isAlertOpen, setIsAlertOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("digital_product_passport.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("digital_product_passport.description")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Info: (20260513 - Luphia) SKU Definition Card */}
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              router.push(
                `/user/account_book/${accountBookId}/digital_product_passport/sku/create`,
              );
            }
          }}
          onClick={() =>
            router.push(
              `/user/account_book/${accountBookId}/digital_product_passport/sku/create`,
            )
          }
          className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-100">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t("digital_product_passport.define_sku")}
              </h2>
              <p className="text-sm text-gray-500">
                {t("digital_product_passport.define_sku_desc")}
              </p>
            </div>
          </div>
          <div className="flex items-center text-sm font-semibold text-blue-600">
            <PlusCircle className="mr-2 h-4 w-4" />{" "}
            {t("digital_product_passport.create_sku")}
          </div>
        </div>

        {/* Info: (20260513 - Luphia) Batch Production Card */}
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsAlertOpen(true);
            }
          }}
          onClick={() => {
            setIsAlertOpen(true);
          }}
          className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
              <Factory className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t("digital_product_passport.batch_production")}
              </h2>
              <p className="text-sm text-gray-500">
                {t("digital_product_passport.batch_production_desc")}
              </p>
            </div>
          </div>
          <div className="flex items-center text-sm font-semibold text-emerald-600">
            <PackageOpen className="mr-2 h-4 w-4" />{" "}
            {t("digital_product_passport.issue_batch")}
          </div>
        </div>
      </div>

      {/* Info: (20260513 - Luphia) Recent SKUs / Batches list can go below */}
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">
          {t("digital_product_passport.recent_skus")}
        </h3>
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
          {t("digital_product_passport.no_recent_skus")}
        </div>
      </div>

      <ConfirmModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        title={t("common.notification")}
        message={t("digital_product_passport.select_sku_for_batch")}
      />
    </div>
  );
}
