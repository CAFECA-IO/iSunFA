'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, Users, UserCircle2 } from 'lucide-react';
import { IAccountBook } from '@/services/account_book.service';
import { useTranslation } from '@/i18n/i18n_context';

export default function UserMainPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<IAccountBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountBooks = async () => {
      try {
        const token = localStorage.getItem('dewt');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/v1/user/account_book', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        console.log(json);
        if (json.success) {
          setData(json.payload || []);
        }
      } catch (err) {
        console.error('Failed to fetch account books', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccountBooks();
  }, []);

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
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('account_book_selection.title')}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('account_book_selection.subtitle')}
          </p>
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
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-orange-500 transition-all duration-200 group"
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
    </div>
  );
}
