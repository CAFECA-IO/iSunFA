"use client";

import React, { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import LegalModal from "@/components/common/legal_modal";

interface ISolutionApplicationFormProps {
  planId: string;
  planName: string;
  theme?: "emerald" | "blue";
}

export default function SolutionApplicationForm({
  planId,
  planName,
  theme = "blue",
}: ISolutionApplicationFormProps) {
  const { t } = useTranslation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [legalDoc, setLegalDoc] = useState<
    "terms_of_service" | "privacy_policy" | null
  >(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        taxId: formData.get("taxId"),
        companyName: formData.get("companyName"),
        address: formData.get("address"),
        contactPerson: formData.get("contactPerson"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        message: formData.get("message"),
      };

      const response = await fetch(`/api/v1/solution/${planId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit application");
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("[SolutionApplicationForm Error]:", error);
      alert("Submission failed. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-2xl ring-1 ring-gray-200 sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="mt-6 text-2xl font-bold text-gray-900">
          {t("solutions.success_title")}
        </h3>
        <p className="mt-4 text-gray-600">{t("solutions.success_desc")}</p>
        <button
          onClick={() => setIsSubmitted(false)}
          className="mt-8 cursor-pointer text-sm font-semibold text-orange-600 hover:text-orange-500"
        >
          {t("solutions.submit_another")}
        </button>
      </div>
    );
  }

  const themeClasses = {
    emerald:
      "bg-emerald-600 hover:bg-emerald-500 focus-visible:outline-emerald-600",
    blue: "bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-600",
  };

  return (
    <>
      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white text-left shadow-2xl ring-1 ring-gray-200">
        <div
          className={`px-6 py-8 sm:px-10 ${theme === "emerald" ? "bg-emerald-950" : "bg-blue-950"}`}
        >
          <h3 className="text-xl font-bold text-white">
            {t("solutions.form_title")}
          </h3>
          <p className="mt-2 text-sm text-gray-300">
            {t("solutions.form_current_plan")}{" "}
            <span className="font-semibold text-white">{planName}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-8 sm:px-10">
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="taxId"
                className="block text-sm leading-6 font-semibold text-gray-900"
              >
                {t("solutions.tax_id")}
              </label>
              <div className="mt-2.5">
                <input
                  required
                  type="text"
                  name="taxId"
                  id="taxId"
                  placeholder={t("solutions.tax_id_placeholder")}
                  className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm leading-6 font-semibold text-gray-900"
              >
                {t("solutions.company_name")}
              </label>
              <div className="mt-2.5">
                <input
                  required
                  type="text"
                  name="companyName"
                  id="companyName"
                  placeholder={t("solutions.company_name_placeholder")}
                  className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="address"
                className="block text-sm leading-6 font-semibold text-gray-900"
              >
                {t("solutions.company_address")}
              </label>
              <div className="mt-2.5">
                <input
                  required
                  type="text"
                  name="address"
                  id="address"
                  className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="contactPerson"
                className="block text-sm leading-6 font-semibold text-gray-900"
              >
                {t("solutions.contact_person")}
              </label>
              <div className="mt-2.5">
                <input
                  required
                  type="text"
                  name="contactPerson"
                  id="contactPerson"
                  className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm leading-6 font-semibold text-gray-900"
              >
                {t("solutions.contact_phone")}
              </label>
              <div className="mt-2.5">
                <input
                  required
                  type="tel"
                  name="phone"
                  id="phone"
                  className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="email"
                className="block text-sm leading-6 font-semibold text-gray-900"
              >
                {t("solutions.email")}
              </label>
              <div className="mt-2.5">
                <input
                  required
                  type="email"
                  name="email"
                  id="email"
                  className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="message"
                className="block text-sm leading-6 font-semibold text-gray-900"
              >
                {t("solutions.message")}
              </label>
              <div className="mt-2.5">
                <textarea
                  name="message"
                  id="message"
                  rows={4}
                  className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-orange-600 focus:ring-inset sm:text-sm sm:leading-6"
                  defaultValue={""}
                />
              </div>
            </div>
          </div>
          <div className="mt-10">
            <button
              type="submit"
              disabled={isLoading}
              className={`block w-full cursor-pointer rounded-md px-3.5 py-3 text-center text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${themeClasses[theme]}`}
            >
              {isLoading ? (
                t("solutions.submitting")
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {t("solutions.submit_application")}{" "}
                  <Send className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-gray-500">
            {t("solutions.tos_prefix")}
            <button
              type="button"
              className="cursor-pointer font-semibold text-orange-600 underline decoration-transparent transition-all hover:text-orange-500 hover:decoration-orange-500"
              onClick={() => setLegalDoc("terms_of_service")}
            >
              {t("solutions.tos_link")}
            </button>
            {t("solutions.and")}
            <button
              type="button"
              className="cursor-pointer font-semibold text-orange-600 underline decoration-transparent transition-all hover:text-orange-500 hover:decoration-orange-500"
              onClick={() => setLegalDoc("privacy_policy")}
            >
              {t("solutions.privacy_link")}
            </button>
            {t("solutions.tos_suffix")}
          </p>
        </form>
      </div>

      <LegalModal
        isOpen={!!legalDoc}
        onClose={() => setLegalDoc(null)}
        documentType={legalDoc}
      />
    </>
  );
}
