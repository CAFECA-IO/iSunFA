'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, Users, UserCircle2, Plus, Pencil } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { IAccountBook } from '@/services/account_book.service';
import { useTranslation } from '@/i18n/i18n_context';
import { COUNTRY, CURRENCY, RULE } from '@/constants/accounts';

export default function UserMainPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<IAccountBook[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Info: (20260321 - Luphia) Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBook, setEditingBook] = useState<IAccountBook | null>(null);

  // Info: (20260321 - Luphia) Form states
  const [formName, setFormName] = useState('');
  const [formCountry, setFormCountry] = useState(COUNTRY.TW);
  const [formCurrency, setFormCurrency] = useState(CURRENCY.TW);
  const [formRule, setFormRule] = useState(RULE.T_IFRS);
  const [formTeamId, setFormTeamId] = useState('');
  const [formEnterpriseId, setFormEnterpriseId] = useState('');

  const fetchAccountBooks = async () => {
    try {
      const token = localStorage.getItem('dewt');
      if (!token) return;

      const res = await fetch('/api/v1/user/account_book', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.payload || []);
      }
    } catch (err) {
      console.error('Failed to fetch account books', err);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('dewt');
      if (!token) return;

      const res = await fetch('/api/v1/user/team', {
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
      console.error('Failed to fetch teams', err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      await Promise.all([fetchAccountBooks(), fetchTeams()]);
      setLoading(false);
    };
    initData();
  }, []);

  const openCreateModal = () => {
    setEditingBook(null);
    setFormName('New Account Book'); // Info: (20260321 - Luphia) Default as requested by user
    setFormCountry(COUNTRY.TW);
    setFormCurrency(CURRENCY.TW);
    setFormRule(RULE.T_IFRS);
    setFormEnterpriseId('');
    if (teams.length > 0) setFormTeamId(teams[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, book: IAccountBook) => {
    e.preventDefault();
    setEditingBook(book);
    setFormName(book.name);
    setFormCountry(book.country);
    setFormCurrency(book.currency);
    setFormRule(book.rule);
    setFormEnterpriseId(book.enterpriseId || '');
    setFormTeamId(book.teamId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('dewt');
      const url = editingBook
        ? `/api/v1/user/account_book/${editingBook.id}`
        : '/api/v1/user/account_book';

      const method = editingBook ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName,
          country: formCountry,
          currency: formCurrency,
          rule: formRule,
          teamId: formTeamId,
          enterpriseId: formEnterpriseId || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        await fetchAccountBooks();
      } else {
        alert(json.message || 'Error occurred');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const allAccountBooks = data;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('account_book_selection.title')}</h1>
            <p className="mt-2 text-sm text-gray-600">
              {t('account_book_selection.subtitle')}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('account_book_selection.create_button')}
          </button>
        </div>

        {allAccountBooks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Book className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t('account_book_selection.empty_title')}</h3>
            <p className="mt-2 text-gray-500">
              {t('account_book_selection.empty_desc')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allAccountBooks.map((ab) => (
              <Link
                key={ab.id}
                href={`/user/account_book/${ab.id}/dashboard`}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-orange-500 transition-all duration-200 group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                      <Book className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                        {ab.name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <Users className="w-4 h-4 mr-1" />
                        {ab.teamName}
                      </p>
                    </div>
                  </div>
                  {ab.userRole === 'OWNER' && (
                    <button
                      onClick={(e) => openEditModal(e, ab)}
                      className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors z-10"
                      title={t('account_book_selection.edit_button')}
                      aria-label={t('account_book_selection.edit_button')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <UserCircle2 className="w-4 h-4 mr-1 text-gray-400" />
                    <span>{t('account_book_selection.role')}: {ab.userRole}</span>
                  </div>
                  <div className="text-gray-400 text-xs">
                    {ab.currency} • {ab.rule}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {editingBook ? t('account_book_selection.form_edit_title') : t('account_book_selection.form_create_title')}
              </h3>

              <form action={handleSubmit} className="space-y-4">
                <div>
                <label htmlFor="form_name" className="block text-sm font-medium text-gray-700 mb-1">{t('account_book_selection.form_name')}</label>
                <input
                  id="form_name"
                  aria-label={t('account_book_selection.form_name')}
                  required
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
                </div>

                {!editingBook && (
                <div>
                  <label htmlFor="form_team" className="block text-sm font-medium text-gray-700 mb-1">{t('account_book_selection.form_team')}</label>
                  <select
                    id="form_team"
                      required
                      value={formTeamId}
                      onChange={(e) => setFormTeamId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                <label htmlFor="form_enterprise_id" className="block text-sm font-medium text-gray-700 mb-1">{t('account_book_selection.form_enterprise_id')}</label>
                <input
                  id="form_enterprise_id"
                  aria-label={t('account_book_selection.form_enterprise_id')}
                  type="text"
                  value={formEnterpriseId}
                  onChange={(e) => setFormEnterpriseId(e.target.value)}
                  placeholder="12345678"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
                </div>

                <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form_country" className="block text-sm font-medium text-gray-700 mb-1">{t('account_book_selection.form_country')}</label>
                  <select
                    id="form_country"
                      required
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white"
                    >
                      {Object.entries(COUNTRY).map(([key, val]) => (
                        <option key={key} value={val}>{key}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                  <label htmlFor="form_currency" className="block text-sm font-medium text-gray-700 mb-1">{t('account_book_selection.form_currency')}</label>
                  <select
                    id="form_currency"
                      required
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white"
                    >
                      {Object.entries(CURRENCY).map(([key, val]) => (
                        <option key={key} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                <label htmlFor="form_rule" className="block text-sm font-medium text-gray-700 mb-1">{t('account_book_selection.form_rule')}</label>
                <select
                  id="form_rule"
                    required
                    value={formRule}
                    onChange={(e) => setFormRule(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white"
                  >
                    {Object.entries(RULE).map(([key, val]) => (
                      <option key={key} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    {t('account_book_selection.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
                  >
                    {isSubmitting ? t('common.loading') : t('account_book_selection.submit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
