"use client";

import { useState, useEffect, MouseEvent } from "react";

import Link from "next/link";
import { Book, Users, UserCircle2, Plus, Pencil } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { IAccountBook } from "@/interfaces/account_book";
import { useTranslation } from "@/i18n/i18n_context";
import { CURRENCY, RULE } from "@/constants/accounts";
import { CountryCode } from "@/constants/enums";
import { ESG_INDUSTRY_BENCHMARKS } from "@/constants/esg_industry_benchmarks";
import ConfirmModal from "@/components/common/confirm_modal";

export default function UserMainPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<IAccountBook[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uriQuery, setUriQuery] = useState<string>("");

  // Info: (20260321 - Luphia) Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBook, setEditingBook] = useState<IAccountBook | null>(null);

  // Info: (20260321 - Luphia) Form states
  const [formName, setFormName] = useState("");
  const [formCountry, setFormCountry] = useState<string>(CountryCode.TW);
  const [formCurrency, setFormCurrency] = useState(CURRENCY.TW);
  const [formStartYear, setFormStartYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [formRule, setFormRule] = useState(RULE.T_IFRS);
  const [formTeamId, setFormTeamId] = useState("");
  const [formEnterpriseId, setFormEnterpriseId] = useState("");
  const [formEsgIndustryId, setFormEsgIndustryId] = useState<string>("");
  const [formParValue, setFormParValue] = useState<number>(10);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const showAlert = (message: string, title = t("common.notification")) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      isConfirm: false,
    });
  };

  const fetchAccountBooks = async () => {
    try {
      const token = localStorage.getItem("dewt");
      if (!token) return;

      const res = await fetch("/api/v1/user/account_book", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.payload || []);
      }
    } catch (err) {
      console.error("Failed to fetch account books", err);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("dewt");
      if (!token) return;

      const res = await fetch("/api/v1/user/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setTeams(json.payload || []);
        if (json.payload?.length > 0) {
          setFormTeamId(json.payload[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch teams", err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get("uri_query");
      if (query) setUriQuery(query);

      await Promise.all([fetchAccountBooks(), fetchTeams()]);
      setLoading(false);
    };
    initData();
  }, []);

  const openCreateModal = () => {
    setEditingBook(null);
    setFormName("New Account Book"); // Info: (20260321 - Luphia) Default as requested by user
    setFormCountry(CountryCode.TW);
    setFormCurrency(CURRENCY.TW);
    setFormStartYear(new Date().getFullYear());
    setFormRule(RULE.T_IFRS);
    setFormEnterpriseId("");
    setFormEsgIndustryId("");
    setFormParValue(10);
    if (teams.length > 0) setFormTeamId(teams[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (e: MouseEvent, book: IAccountBook) => {
    e.preventDefault();
    setEditingBook(book);
    setFormName(book.name);
    setFormCountry(book.country);
    setFormCurrency(book.currency);
    setFormStartYear(
      book.createdAt
        ? new Date(book.createdAt).getFullYear()
        : new Date().getFullYear(),
    );
    setFormRule(book.rule);
    setFormEnterpriseId(book.enterpriseId || "");
    setFormEsgIndustryId(book.esgIndustryId?.toString() || "");
    setFormParValue(book.parValue || 10);
    setFormTeamId(book.teamId || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("dewt");
      const url = editingBook
        ? `/api/v1/user/account_book/${editingBook.id}`
        : "/api/v1/user/account_book";

      const method = editingBook ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName,
          country: formCountry,
          currency: formCurrency,
          startYear: formStartYear,
          rule: formRule,
          teamId: formTeamId,
          enterpriseId: formEnterpriseId || null,
          esgIndustryId: formEsgIndustryId ? Number(formEsgIndustryId) : null,
          parValue: formParValue,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        await fetchAccountBooks();
      } else {
        showAlert(json.message || "Error occurred");
      }
    } catch (err) {
      console.error(err);
      showAlert("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="size-8 shrink-0 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const allAccountBooks = data;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t("account_book_selection.title")}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {t("account_book_selection.subtitle")}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
          >
            <Plus className="mr-2 size-4 shrink-0" />
            {t("account_book_selection.create_button")}
          </button>
        </div>

        {allAccountBooks.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <Book className="mx-auto size-12 shrink-0 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {t("account_book_selection.empty_title")}
            </h3>
            <p className="mt-2 text-gray-500">
              {t("account_book_selection.empty_desc")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allAccountBooks.map((ab) => (
              <Link
                key={ab.id}
                href={`/user/account_book/${ab.id}${uriQuery || "/dashboard"}`}
                className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-orange-500 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="rounded-lg bg-orange-50 p-2 transition-colors group-hover:bg-orange-100">
                      <Book className="size-6 shrink-0 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 transition-colors group-hover:text-orange-600">
                        {ab.name}
                      </h3>
                      <p className="mt-1 flex items-center text-sm text-gray-500">
                        <Users className="mr-1 size-4 shrink-0" />
                        {ab.teamName}
                      </p>
                    </div>
                  </div>
                  {ab.userRole === "OWNER" && (
                    <button
                      onClick={(e) => openEditModal(e, ab)}
                      className="z-10 rounded-lg p-2 text-gray-400 transition-colors hover:bg-orange-50 hover:text-orange-600"
                      title={t("account_book_selection.edit_button")}
                      aria-label={t("account_book_selection.edit_button")}
                    >
                      <Pencil className="size-4 shrink-0" />
                    </button>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <UserCircle2 className="mr-1 size-4 shrink-0 text-gray-400" />
                    <span>
                      {t("account_book_selection.role")}: {ab.userRole}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {ab.currency} • {ab.rule}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
              <h3 className="mb-4 text-lg leading-6 font-medium text-gray-900">
                {editingBook
                  ? t("account_book_selection.form_edit_title")
                  : t("account_book_selection.form_create_title")}
              </h3>

              <form action={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="form_name"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t("account_book_selection.form_name")}
                  </label>
                  <input
                    id="form_name"
                    aria-label={t("account_book_selection.form_name")}
                    required
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="form_start_year"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t("account_book_selection.form_start_year")}
                  </label>
                  <input
                    id="form_start_year"
                    aria-label={t("account_book_selection.form_start_year")}
                    required
                    type="number"
                    min="1990"
                    max="2050"
                    value={formStartYear}
                    onChange={(e) => setFormStartYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="form_par_value"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t("account_book_selection.form_par_value")}
                  </label>
                  <input
                    id="form_par_value"
                    aria-label={t("account_book_selection.form_par_value")}
                    required
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formParValue}
                    onChange={(e) => setFormParValue(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  />
                </div>

                {!editingBook && (
                  <div>
                    <label
                      htmlFor="form_team"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t("account_book_selection.form_team")}
                    </label>
                    <select
                      id="form_team"
                      required
                      value={formTeamId}
                      onChange={(e) => setFormTeamId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="form_enterprise_id"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t("account_book_selection.form_enterprise_id")}
                  </label>
                  <input
                    id="form_enterprise_id"
                    aria-label={t("account_book_selection.form_enterprise_id")}
                    type="text"
                    value={formEnterpriseId}
                    onChange={(e) => setFormEnterpriseId(e.target.value)}
                    placeholder="12345678"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="form_esg_industry"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t("account_book_selection.form_esg_industry")}
                  </label>
                  <select
                    id="form_esg_industry"
                    value={formEsgIndustryId}
                    onChange={(e) => setFormEsgIndustryId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  >
                    <option value="">---</option>
                    {ESG_INDUSTRY_BENCHMARKS.map((i) => (
                      <option key={i.id} value={i.id}>
                        {t(i.industryName)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="form_country"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t("account_book_selection.form_country")}
                    </label>
                    <select
                      id="form_country"
                      required
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    >
                      {Object.entries(CountryCode).map(([key, val]) => (
                        <option key={key} value={val as string}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="form_currency"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t("account_book_selection.form_currency")}
                    </label>
                    <select
                      id="form_currency"
                      required
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    >
                      {Object.entries(CURRENCY).map(([key, val]) => (
                        <option key={key} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="form_rule"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {t("account_book_selection.form_rule")}
                  </label>
                  <select
                    id="form_rule"
                    required
                    value={formRule}
                    onChange={(e) => setFormRule(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  >
                    {Object.entries(RULE).map(([key, val]) => (
                      <option key={key} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? t("common.loading")
                      : t("account_book_selection.submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Dialog>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={
          confirmModal.isConfirm ? t("common.confirm") : t("common.ok")
        }
        cancelText={confirmModal.isConfirm ? t("common.cancel") : undefined}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
}
