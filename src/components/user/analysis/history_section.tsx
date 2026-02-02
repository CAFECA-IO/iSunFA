'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import { request } from '@/lib/utils/request';
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles, X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { MarkdownContent } from '@/components/common/markdown_content';

interface IHistoryItem {
  id: string;
  generatedAt: string;
  category: string;
  periodType: string;
  period: string;
  status: string;
  reportId: string;
}

export default function HistorySection() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [history, setHistory] = useState<IHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Info: (20260130 - Luphia) Report View Modal State
  const [selectedReport, setSelectedReport] = useState<{ id: string; content: string; type: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // Info: (20260130 - Luphia) Fetch history from API
  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const result = await request<{ code: string; message: string; payload: IHistoryItem[] }>('/api/v1/user/analysis');

        if (result.code === 'SUCCESS') {
          setHistory(result.payload);
        } else {
          throw new Error(result.message || 'Failed to load history');
        }
      } catch (err) {
        console.error('History fetch error:', err);
        setError('Failed to load history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [t]);

  // Info: (20260130 - Luphia) Handle View Report
  const handleViewReport = async (item: IHistoryItem) => {
    try {
      setLoadingReport(true);
      // Info: (20260130 - Luphia) Fetch details
      const result = await request<{ code: string; payload: { id: string; result: string; type: string } }>(`/api/v1/user/analysis/${item.reportId}`);

      if (result.code === 'SUCCESS') {
        const content = typeof result.payload.result === 'string' ? result.payload.result : JSON.stringify(result.payload.result, null, 2);
        setSelectedReport({
          id: result.payload.id,
          content: content || 'No content available.',
          type: result.payload.type
        });
        setIsModalOpen(true);
      } else {
        // Info: (20260130 - Luphia) Handle error (maybe toast)
        console.error('Failed to load report:', result);
      }
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const currentData = history.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Info: (20260120 - Luphia) Helper to render status badge
  const renderStatus = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'processing':
      case 'pending':
      case 'doing':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <Loader2 className="h-3 w-3 animate-spin" /> {t('analysis.history.status_types.processing')}
          </span>
        );
      case 'failed':
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
            <X className="h-3 w-3" /> {t('analysis.history.status_types.failed')}
          </span>
        );
      case 'completed':
      case 'done':
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            <Check className="h-3 w-3" /> {t('analysis.history.status_types.completed')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
            <span>-</span> {status || 'Unknown'}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
        <div className="text-red-500 text-center text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{t('analysis.history.title')}</h2>

      <div className="overflow-x-auto">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="bg-orange-50 p-4 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t('analysis.history.empty_title') || 'No Analysis Yet'}
            </h3>
            <p className="text-gray-500 max-w-sm mb-6">
              {t('analysis.history.empty_description') || 'Start your journey by generating your first financial analysis report using our advanced AI tools.'}
            </p>
          </div>
        ) : (
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
                        {/* Info: (20260128 - Luphia) Handle unknown/missing periodType safely */}
                        {item.periodType && item.periodType !== 'unknown' ? t(`analysis.time_units.${item.periodType}`) : '-'}
                      </span>
                      {item.period}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600">
                      {renderStatus(item.status)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <button
                        className="text-orange-600 hover:text-orange-900 font-medium mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!['completed', 'done', 'success'].includes(item.status.toLowerCase())}
                        onClick={() => handleViewReport(item)}
                      >
                        {loadingReport && selectedReport?.id === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('analysis.history.view')}
                      </button>
                      <button
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!['completed', 'done', 'success'].includes(item.status.toLowerCase())}
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
                          {item.periodType && item.periodType !== 'unknown' ? t(`analysis.time_units.${item.periodType}`) : '-'}
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
                        disabled={!['completed', 'done', 'success'].includes(item.status.toLowerCase())}
                        onClick={() => handleViewReport(item)}
                      >
                        {loadingReport && selectedReport?.id === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('analysis.history.view')}
                      </button>
                      <button
                        className="text-gray-600 disabled:opacity-50"
                        disabled={!['completed', 'done', 'success'].includes(item.status.toLowerCase())}
                      >
                        {t('analysis.history.download')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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

      {/* Info: (20260130 - Luphia) Report Content Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center mb-4"
                  >
                    <span>{selectedReport ? t(`analysis.categories.${selectedReport.type}`) : 'Report'}</span>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={closeModal}
                    >
                      {t('common.close')}
                    </button>
                  </DialogTitle>
                  <div className="mt-2 text-sm text-gray-500 max-h-[70vh] overflow-y-auto prose prose-sm max-w-none">
                    {selectedReport && (
                      <MarkdownContent content={selectedReport.content} theme="light" />
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div >
  );
}
