'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { CATEGORIES, PERIOD_TYPES, getPeriodDateRange } from '@/components/user/analysis/utils';

export default function HistorySection() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Info: (20260120 - Antigravity) Mock History Data with Processing Support
  const mockHistory = useMemo(() => Array.from({ length: 12 }).map((_, i) => {
    const pType = PERIOD_TYPES[i % PERIOD_TYPES.length];
    const year = 2025 - Math.floor(i / 5);
    let val: string | number = '';

    // Info: (20260120 - Luphia) Simulate period values
    if (pType === 'monthly') val = (i % 12) + 1;
    if (pType === 'seasonly') val = `S${(i % 4) + 1}`;
    if (pType === 'weekly') val = `W${(i % 50) + 1}`;
    if (pType === 'yearly') val = year;
    if (pType === 'daily') val = '2025-01-20';

    const { start, end } = getPeriodDateRange(pType, year, val);
    const dateRange = start === end ? start : `${start} ~ ${end}`;

    return {
      id: `report-${i}`,
      generatedAt: new Date((new Date()).getTime() - i * 86400000 * 2).toISOString().split('T')[0],
      category: CATEGORIES[i % CATEGORIES.length],
      periodType: pType,
      period: dateRange,
      status: i === 0 ? 'processing' : (i === 4 ? 'failed' : 'completed'),
    };
  }), []);

  const totalPages = Math.ceil(mockHistory.length / itemsPerPage);
  const currentData = mockHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Info: (20260120 - Luphia) Helper to render status badge
  const renderStatus = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <Loader2 className="h-3 w-3 animate-spin" /> {t('analysis.history.status_types.processing')}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
            <X className="h-3 w-3" /> {t('analysis.history.status_types.failed')}
          </span>
        );
      case 'completed':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            <Check className="h-3 w-3" /> {t('analysis.history.status_types.completed')}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{t('analysis.history.title')}</h2>

      <div className="overflow-x-auto">
        <div className="overflow-x-auto">
          {/* Info: (20260120 - Luphia) Desktop Table View */}
          <table className="hidden sm:table min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('analysis.history.generated_at')}</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('analysis.history.type')}</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('analysis.history.period')}</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('analysis.history.status')}</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t('analysis.history.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentData.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.generatedAt}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                    {t(`analysis.categories.${item.category}`)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 mr-2">
                      {t(`analysis.time_units.${item.periodType}`)}
                    </span>
                    {item.period}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600">
                    {renderStatus(item.status)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <button
                      className="text-orange-600 hover:text-orange-900 font-medium mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={item.status !== 'completed'}
                    >
                      {t('analysis.history.view')}
                    </button>
                    <button
                      className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={item.status !== 'completed'}
                    >
                      {t('analysis.history.download')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Info: (20260120 - Luphia) Mobile Card View */}
          <div className="space-y-4 sm:hidden">
            {currentData.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{t(`analysis.categories.${item.category}`)}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
                        {t(`analysis.time_units.${item.periodType}`)}
                      </span>
                      <span className="text-sm text-gray-500">{item.period}</span>
                    </div>
                  </div>
                  {renderStatus(item.status)}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                  <span>{item.generatedAt}</span>
                  <div className="flex gap-3">
                    <button
                      className="text-orange-600 font-medium disabled:opacity-50"
                      disabled={item.status !== 'completed'}
                    >
                      {t('analysis.history.view')}
                    </button>
                    <button
                      className="text-gray-600 disabled:opacity-50"
                      disabled={item.status !== 'completed'}
                    >
                      {t('analysis.history.download')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info: (20260120 - Luphia) Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('common.pagination.prev')}
          </button>
          <span className="text-sm text-gray-600">
            {t('common.pagination.page_info', { current: currentPage, total: totalPages })}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('common.pagination.next')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
