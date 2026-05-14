"use client";

import { useTranslation } from "@/i18n/i18n_context";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";

export default function BatchCreatePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const skuId = params.sku_id as string;
  const accountBookId = params.account_book_id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    batchNumber: "",
    manufactureDate: "",
    facilitySite: "",
    serialRange: "",
  });

  const handleSubmit = async () => {
    if (
      !formData.batchNumber ||
      !formData.manufactureDate ||
      !formData.facilitySite
    ) {
      alert(t("digital_product_passport.batch_creation.fill_required"));
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/user/dpp/sku/${skuId}/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert(t("digital_product_passport.batch_creation.success"));
        router.push(
          `/user/account_book/${accountBookId}/digital_product_passport`,
        );
      } else {
        alert(
          data.message || t("digital_product_passport.batch_creation.failed"),
        );
      }
    } catch (error) {
      console.error(error);
      alert(t("digital_product_passport.batch_creation.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("digital_product_passport.batch_creation.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("digital_product_passport.batch_creation.subtitle")}
            {skuId}
          </p>
        </div>
      </div>

      <div className="max-w-2xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <label
              htmlFor="batch_number"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              {t("digital_product_passport.batch_creation.batch_number")}
            </label>
            {}
            {}
            <input
              aria-label={t(
                "digital_product_passport.batch_creation.batch_number",
              )}
              id="batch_number"
              type="text"
              placeholder={t(
                "digital_product_passport.batch_creation.batch_number_ph",
              )}
              value={formData.batchNumber}
              onChange={(e) =>
                setFormData({ ...formData, batchNumber: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="manufacture_date"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              {t("digital_product_passport.batch_creation.manufacture_date")}
            </label>
            {}
            {}
            <input
              aria-label={t(
                "digital_product_passport.batch_creation.manufacture_date",
              )}
              id="manufacture_date"
              type="date"
              value={formData.manufactureDate}
              onChange={(e) =>
                setFormData({ ...formData, manufactureDate: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="facility_site"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              {t("digital_product_passport.batch_creation.facility_site")}
            </label>
            {}
            {}
            <input
              aria-label={t(
                "digital_product_passport.batch_creation.facility_site",
              )}
              id="facility_site"
              type="text"
              placeholder={t(
                "digital_product_passport.batch_creation.facility_site_ph",
              )}
              value={formData.facilitySite}
              onChange={(e) =>
                setFormData({ ...formData, facilitySite: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="serial_range"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              {t("digital_product_passport.batch_creation.serial_range")}
            </label>
            <input
              aria-label={t(
                "digital_product_passport.batch_creation.serial_range",
              )}
              id="serial_range"
              type="text"
              placeholder={t(
                "digital_product_passport.batch_creation.serial_range_ph",
              )}
              value={formData.serialRange}
              onChange={(e) =>
                setFormData({ ...formData, serialRange: e.target.value })
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {t("digital_product_passport.batch_creation.generate")}
          </button>
        </div>
      </div>
    </div>
  );
}
