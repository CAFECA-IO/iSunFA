"use client";

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import { request } from '@/lib/utils/request';
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles, X, Share2, Copy, Trash2, Eye, Download, RefreshCw } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { MarkdownContent } from '@/components/common/markdown_content';
import { downloadHtmlAsPdf } from '@/lib/utils/pdf';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/contexts/auth_context';
import LoginButton from '@/components/common/login_button';

interface IHistoryItem {
  id: string;
  generatedAt: string;
  category: string;
  periodType: string;
  period: string;
  status: string;
  reportId: string;
  country?: string;
  keyword?: string;
  tags?: string[];
  isExternal?: boolean;
  retryCount?: number;
  isShared?: boolean;
  isFinancialDataHidden?: boolean;
}

export default function HistorySection() {
  const { t } = useTranslation();
  const { user, loading: isAuthLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Info: (20260130 - Luphia) Report View Modal State
  const [selectedReport, setSelectedReport] = useState<{ id: string; content: string; type: string; keyword?: string; isExternal?: boolean } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [isSharing, setIsSharing] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [sharingReportId, setSharingReportId] = useState<string | null>(null);
  const [retryingReportId, setRetryingReportId] = useState<string | null>(null);

  const [isShareSettingsModalOpen, setIsShareSettingsModalOpen] = useState(false);
  const [hideFinancialData, setHideFinancialData] = useState(true);
  const [pendingShareReport, setPendingShareReport] = useState<{ id: string; category?: string } | null>(null);

  const [history, setHistory] = useState<IHistoryItem[]>([]);

  // Info: (20260311 - Tzuhan) Dynamically adjust items per page based on window height
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const calculateItemsPerPage = () => {
      const nonTableHeight = 500;
      const rowHeight = 80;

      const availableHeight = window.innerHeight - nonTableHeight;
      const calculatedItems = Math.max(5, Math.floor(availableHeight / rowHeight));
      setItemsPerPage(calculatedItems);
    };

    calculateItemsPerPage();
    window.addEventListener('resize', calculateItemsPerPage);
    return () => window.removeEventListener('resize', calculateItemsPerPage);
  }, []);

  // Info: (20260311 - Tzuhan) Sync current page if total pages become less than current page
  useEffect(() => {
    const totalPages = Math.ceil(history.length / itemsPerPage);
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [itemsPerPage, history.length, currentPage]);

  // Info: (20260130 - Luphia) Fetch history from API
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const result = await request<{ code: string; message: string; payload: IHistoryItem[] }>('/api/v1/user/analysis', {
        cache: 'no-store'
      });

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
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else if (!isAuthLoading) {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [t, user, isAuthLoading]);

  const handleRetryReport = async (item: IHistoryItem) => {
    try {
      setRetryingReportId(item.reportId);
      const result = await request<{ code: string; payload?: { retryCount: number } }>(`/api/v1/user/analysis/${item.reportId}/retry`, {
        method: 'POST'
      });

      if (result.code === 'SUCCESS') {
        const newRetryCount = result.payload?.retryCount || ((item.retryCount || 0) + 1);
        setHistory(prev => prev.map(h => h.id === item.id ? { ...h, status: 'pending', retryCount: newRetryCount } : h));
      } else {
        console.error('Failed to retry report');
      }
    } catch (err) {
      console.error('Retry error:', err);
    } finally {
      setRetryingReportId(null);
    }
  };

  const handleViewReport = async (item: IHistoryItem) => {
    try {
      setLoadingReport(true);
      const result = await request<{ code: string; payload: { id: string; result: unknown; type: string; isExternal?: boolean } }>(`/api/v1/user/analysis/${item.reportId}`);

      if (result.code === 'SUCCESS') {
        let content = '';
        let payloadResult = result.payload.result;

        if (typeof payloadResult === 'string') {
          try {
            const parsed = JSON.parse(payloadResult);
            if (typeof parsed === 'object' && parsed !== null) {
              payloadResult = parsed;
            }
          } catch { }
        }

        if (typeof payloadResult === 'string') {
          content = payloadResult;
        } else if (payloadResult && typeof payloadResult === 'object') {
          const resultObj = payloadResult as Record<string, unknown>;
          if (resultObj.answer) {
            content = resultObj.answer as string;
            if (resultObj.tags && Array.isArray(resultObj.tags) && resultObj.tags.length > 0) {
              content += `\n\n### 標籤\n` + (resultObj.tags as string[]).map(t => `- ${t}`).join('\n');
            }
          } else {
            const keys = Object.keys(resultObj).sort();
            content = keys.map(k => resultObj[k] as string).join('\n\n---\n\n');
          }
        }

        setSelectedReport({
          id: result.payload.id,
          content: content || 'No content available.',
          type: result.payload.type,
          keyword: item.keyword,
          isExternal: result.payload.isExternal
        });
        setIsModalOpen(true);
      } else {
        console.error('Failed to load report:', result);
      }
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const downloadCurrentPdf = async (reportType: string, keyword?: string) => {
    setIsDownloading(true);
    const el = document.getElementById('report-pdf-content');
    if (!el) {
      setIsDownloading(false);
      return;
    }

    const originalMaxHeight = el.style.maxHeight;
    const originalOverflow = el.style.overflowY;
    el.style.maxHeight = 'none';
    el.style.overflowY = 'visible';
    el.classList.remove('max-h-[70vh]', 'overflow-y-auto');

    try {
      const localizedType = t(`analysis.categories.${reportType.toLowerCase()}`);
      let companyName = keyword || '';
      if (companyName.includes('(')) {
        companyName = companyName.split('(')[0].trim();
      }

      let filenameStr = localizedType;
      if (companyName) {
        filenameStr += `-${companyName}`;
      }

      const filename = `${filenameStr}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`;
      await downloadHtmlAsPdf('report-pdf-content', filename);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      el.classList.add('max-h-[70vh]', 'overflow-y-auto');
      el.style.maxHeight = originalMaxHeight;
      el.style.overflowY = originalOverflow;
      setIsDownloading(false);
    }
  };

  const handleDownloadFromTable = async (item: IHistoryItem) => {
    if (!selectedReport || selectedReport.id !== item.id) {
      await handleViewReport(item);
    } else if (!isModalOpen) {
      setIsModalOpen(true);
    }
    setTimeout(() => {
      downloadCurrentPdf(item.category, item.keyword);
    }, 500);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  const handleShareClick = (reportId?: string, category?: string, isExternal?: boolean) => {
    const idToShare = reportId || selectedReport?.id;
    if (!idToShare) return;

    const historyItem = history.find(item => item.id === idToShare || item.reportId === idToShare);
    const cat = category || selectedReport?.type || historyItem?.category;
    const external = isExternal ?? selectedReport?.isExternal ?? historyItem?.isExternal;

    // Info: (20260416 - Tzuhan) Bypass privacy settings if already shared
    if (historyItem?.isShared) {
      executeShare(idToShare, historyItem.isFinancialDataHidden ?? true);
      return;
    }

    // Info: (20260416 - Tzuhan) Apply privacy settings to all internal reports, regardless of specific category
    if (!external) {
      setPendingShareReport({ id: idToShare, category: cat || '' });
      setHideFinancialData(true);
      setIsShareSettingsModalOpen(true);
    } else {
      executeShare(idToShare, false);
    }
  };

  const executeShare = async (idToShare: string, hideData: boolean) => {
    try {
      setSharingReportId(idToShare);
      setIsSharing(true);
      const result = await request<{ code: string; payload: { token: string } }>(
        `/api/v1/user/analysis/${idToShare}/share`,
        {
          method: 'POST',
          body: JSON.stringify({ hideFinancialData: hideData })
        }
      );

      if (result.code === 'SUCCESS' && result.payload?.token) {
        setShareToken(result.payload.token);
        setIsShareLinkModalOpen(true);
        setIsShareSettingsModalOpen(false);

        // Info: (20260416 - Tzuhan) Dynamically update the list UI to show the share badge
        setHistory(prev => prev.map(item =>
          item.id === idToShare || item.reportId === idToShare
            ? { ...item, isShared: true, isFinancialDataHidden: hideData }
            : item
        ));
      } else {
        console.error('Failed to generate share link');
      }
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeShare = async () => {
    const idToRevoke = sharingReportId || selectedReport?.id;
    if (!idToRevoke || !shareToken) return;
    try {
      setIsRevoking(true);
      const result = await request<{ code: string }>(
        `/api/v1/user/analysis/${idToRevoke}/share/${shareToken}/revoke`,
        { method: 'PATCH' }
      );

      if (result.code === 'SUCCESS') {
        setShareToken(null);
        setIsShareLinkModalOpen(false);

        // Info: (20260416 - Tzuhan) Dynamically update the list UI to remove the share badge
        setHistory(prev => prev.map(item =>
          item.id === idToRevoke || item.reportId === idToRevoke
            ? { ...item, isShared: false }
            : item
        ));
      }
    } catch (err) {
      console.error('Revoke error:', err);
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/report/${shareToken}`;
    await navigator.clipboard.writeText(url);
  };

  // Info: (20260414 - Tzuhan) 使用 useMemo 記憶化陣列運算，避免不必要的重新渲染計算
  const filteredHistory = useMemo(() => {
    return selectedTag
      ? history.filter(item => item.tags?.includes(selectedTag))
      : history;
  }, [history, selectedTag]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const currentData = useMemo(() => {
    return filteredHistory.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredHistory, currentPage, itemsPerPage]);

  const allTags = useMemo(() => {
    return Array.from(new Set(history.flatMap(item => item.tags || []))).sort();
  }, [history]);

  const renderStatus = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'processing':
      case 'paying':
      case 'pending':
      case 'uploading':
      case 'doing':
      case 'incomplete':
      case '未完成':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <Loader2 className="h-3 w-3 animate-spin" /> {status === 'incomplete' || status === '未完成' ? '未完成' : t('analysis.history.status_types.processing')}
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <Loader2 className="h-3 w-3 animate-spin" /> {t('analysis.history.status_types.paid')}
          </span>
        );
      case 'executing':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <Loader2 className="h-3 w-3 animate-spin" /> {t('analysis.history.status_types.executing')}
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

  if ((loading && isInitialLoad) || isAuthLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="bg-orange-50 p-4 rounded-full mb-4">
          <Sparkles className="h-8 w-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {t('analysis.login_to_generate')}
        </h3>
        <LoginButton label={t('analysis.login_to_generate')} />
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

  const getTagColorClass = (tagStr: string, isSelected: boolean) => {
    const colors = [
      {
        selected: 'bg-blue-600 text-white shadow-sm ring-1 ring-inset ring-blue-700/20',
        unselected: 'bg-blue-50 text-blue-700 hover:bg-blue-100 ring-1 ring-inset ring-blue-700/10'
      },
      {
        selected: 'bg-emerald-600 text-white shadow-sm ring-1 ring-inset ring-emerald-700/20',
        unselected: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-700/10'
      },
      {
        selected: 'bg-violet-600 text-white shadow-sm ring-1 ring-inset ring-violet-700/20',
        unselected: 'bg-violet-50 text-violet-700 hover:bg-violet-100 ring-1 ring-inset ring-violet-700/10'
      },
      {
        selected: 'bg-amber-600 text-white shadow-sm ring-1 ring-inset ring-amber-700/20',
        unselected: 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-inset ring-amber-700/10'
      },
      {
        selected: 'bg-rose-600 text-white shadow-sm ring-1 ring-inset ring-rose-700/20',
        unselected: 'bg-rose-50 text-rose-700 hover:bg-rose-100 ring-1 ring-inset ring-rose-700/10'
      },
    ];

    let hash = 0;
    for (let i = 0; i < tagStr.length; i++) {
      hash = tagStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;

    return isSelected ? colors[colorIndex].selected : colors[colorIndex].unselected;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900 shrink-0">{t('analysis.history.title')}</h2>
          <button
            type="button"
            onClick={fetchHistory}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors disabled:opacity-50"
            title={t('common.refresh') || 'Refresh'}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center w-full min-w-0 mt-2">
            <div className="flex items-center gap-3 shrink-0 pr-4 border-r border-gray-200">
              <span className="text-sm font-medium text-gray-500">{t('common.filter')}</span>
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedTag === null ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All
              </button>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pl-4 pb-0 flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {allTags.map(tag => {
                const isSelected = selectedTag === tag;
                const baseClasses = "shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none";
                const colorClasses = getTagColorClass(tag, isSelected);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`${baseClasses} ${colorClasses}`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span>{t(`analysis.categories.${item.category.toLowerCase()}`)}</span>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${item.isExternal ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'}`}>
                            {item.isExternal ? t('analysis.external_analysis') : t('analysis.internal_analysis')}
                          </span>
                          {item.isShared && (
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${item.isExternal
                              ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                              : item.isFinancialDataHidden
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                              }`}>
                              {item.isExternal
                                ? t('analysis.history.badges.external_link')
                                : item.isFinancialDataHidden
                                  ? t('analysis.history.badges.hidden_privacy')
                                  : t('analysis.history.badges.public_data')}
                            </span>
                          )}
                        </div>
                        {(item.country || item.keyword) && (
                          <div className="flex items-center gap-2">
                            {item.country && (
                              <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                {t(`analysis.countries.${item.country}`)}
                              </span>
                            )}
                            {item.keyword && (
                              <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/20 max-w-[120px] truncate" title={item.keyword}>
                                {item.keyword}
                              </span>
                            )}
                          </div>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {item.tags.map((tag, idx) => (
                              <span key={idx} className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getTagColorClass(tag, false)}`}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 mr-2">
                        {item.periodType && item.periodType !== 'unknown' ? t(`analysis.time_units.${item.periodType.toLowerCase()}`) : '-'}
                      </span>
                      {item.period}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600">
                      {renderStatus(item.status)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-3">
                        {['failed', 'error'].includes(item.status.toLowerCase()) ? (
                          (item.retryCount || 0) >= 3 ? (
                            <span className="text-red-600 text-xs font-bold border border-red-200 bg-red-50 px-2 py-1 rounded-md">
                              {t('analysis.history.contact_admin') || '聯絡系統管理員'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50 flex items-center gap-1 transition-colors group text-xs border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md"
                              disabled={retryingReportId === item.reportId}
                              onClick={() => handleRetryReport(item)}
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${retryingReportId === item.reportId ? 'animate-spin' : ''}`} />
                              {t('analysis.history.retry') || '重試'} ({(item.retryCount || 0)}/3)
                            </button>
                          )
                        ) : (
                          <>
                            <button
                              type="button"
                              className="text-orange-600 hover:text-orange-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors group"
                              disabled={!['completed', 'done', 'success'].includes(item.status.toLowerCase())}
                              onClick={() => handleViewReport(item)}
                              title={t('analysis.history.view')}
                            >
                              {loadingReport && selectedReport?.id === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                              <span className="sr-only">{t('analysis.history.view')}</span>
                            </button>
                            <button
                              type="button"
                              className="text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors group"
                              disabled={!['completed', 'done', 'success'].includes(item.status.toLowerCase()) || isDownloading}
                              onClick={() => handleDownloadFromTable(item)}
                              title={t('analysis.history.download')}
                            >
                              {isDownloading && selectedReport?.id === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                              <span className="sr-only">{t('analysis.history.download')}</span>
                            </button>
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors group"
                              onClick={() => handleShareClick(item.reportId, item.category, item.isExternal)}
                              title={t('common.share')}
                            >
                              {isSharing && sharingReportId === item.reportId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                              <span className="sr-only">{t('common.share')}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-4 sm:hidden">
              {currentData.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{t(`analysis.categories.${item.category.toLowerCase()}`)}</h3>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${item.isExternal ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'}`}>
                            {item.isExternal ? t('analysis.external_analysis') : t('analysis.internal_analysis')}
                          </span>
                          {item.isShared && (
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${item.isExternal
                              ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                              : item.isFinancialDataHidden
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                              }`}>
                              {item.isExternal
                                ? t('analysis.history.badges.external_link')
                                : item.isFinancialDataHidden
                                  ? t('analysis.history.badges.hidden_privacy')
                                  : t('analysis.history.badges.public_data')}
                            </span>
                          )}
                        </div>
                        {(item.country || item.keyword) && (
                          <div className="flex items-center gap-2">
                            {item.country && (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {t(`analysis.countries.${item.country}`)}
                              </span>
                            )}
                            {item.keyword && (
                              <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 max-w-[120px] truncate" title={item.keyword}>
                                {item.keyword}
                              </span>
                            )}
                          </div>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {item.tags.map((tag, idx) => (
                              <span key={idx} className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getTagColorClass(tag, false)}`}>
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
                          {item.periodType && item.periodType !== 'unknown' ? t(`analysis.time_units.${item.periodType.toLowerCase()}`) : '-'}
                        </span>
                        <span className="text-sm text-gray-500 wrap-break-word">{item.period}</span>
                      </div>
                    </div>
                    {renderStatus(item.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                    <span>{item.generatedAt}</span>
                    <div className="flex gap-4">
                      {['failed', 'error'].includes(item.status.toLowerCase()) ? (
                        (item.retryCount || 0) >= 3 ? (
                          <span className="text-red-600 text-[10px] font-bold border border-red-200 bg-red-50 px-2 py-1 rounded-md max-w-[120px] truncate">
                            {t('analysis.history.contact_admin') || '聯絡系統管理員'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-red-500 font-medium disabled:opacity-50 flex items-center gap-1 text-[10px] border border-red-200 bg-red-50 px-2 py-1 rounded-md"
                            disabled={retryingReportId === item.reportId}
                            onClick={() => handleRetryReport(item)}
                          >
                            <RefreshCw className={`h-3 w-3 ${retryingReportId === item.reportId ? 'animate-spin' : ''}`} />
                            {t('analysis.history.retry') || '重試'} ({(item.retryCount || 0)}/3)
                          </button>
                        )
                      ) : (
                        <>
                          <button
                            type="button"
                            className="text-orange-600 font-medium disabled:opacity-50 flex items-center gap-1 transition-colors group"
                            disabled={!['completed', 'done', 'success'].includes(item.status.toLowerCase())}
                            onClick={() => handleViewReport(item)}
                            title={t('analysis.history.view')}
                          >
                            {loadingReport && selectedReport?.id === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                          </button>
                          <button
                            type="button"
                            className="text-gray-600 font-medium disabled:opacity-50 flex items-center gap-1 transition-colors group"
                            disabled={!['completed', 'done', 'success'].includes(item.status.toLowerCase()) || isDownloading}
                            onClick={() => handleDownloadFromTable(item)}
                            title={t('analysis.history.download')}
                          >
                            {isDownloading && selectedReport?.id === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                          </button>
                          <button
                            type="button"
                            className="text-blue-600 font-medium disabled:opacity-50 flex items-center gap-1 transition-colors group"
                            onClick={() => handleShareClick(item.reportId, item.category, item.isExternal)}
                            title={t('common.share')}
                          >
                            {isSharing && sharingReportId === item.reportId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
          <button
            type="button"
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
            type="button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('common.pagination.next')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

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
                    <div className="flex items-center gap-2">
                      <span>{selectedReport ? t(`analysis.categories.${selectedReport.type.toLowerCase()}`) : 'Report'}</span>
                      {selectedReport && (
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${selectedReport.isExternal ? 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'}`}>
                          {selectedReport.isExternal ? t('analysis.external_analysis') : t('analysis.internal_analysis')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 transition-colors"
                        onClick={() => handleShareClick()}
                        disabled={isSharing || !selectedReport}
                      >
                        {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                        {t('common.share')}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-orange-100 px-4 py-2 text-sm font-medium text-orange-900 hover:bg-orange-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50"
                        onClick={() => selectedReport && downloadCurrentPdf(selectedReport.type, selectedReport.keyword)}
                        disabled={isDownloading || !selectedReport}
                      >
                        {isDownloading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {t('analysis.history.download')}
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        onClick={closeModal}
                      >
                        {t('common.close')}
                      </button>
                    </div>
                  </DialogTitle>
                  <div id="report-pdf-content" className="mt-2 text-sm text-gray-500 max-h-[70vh] overflow-y-auto prose prose-sm max-w-none bg-white p-2">
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

      <Transition appear show={isShareSettingsModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setIsShareSettingsModalOpen(false)}>
          <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </TransitionChild>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle as="h3" className="text-lg font-bold leading-6 text-gray-900 mb-4 flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-blue-600" />
                    {t('analysis.share_settings.title')}
                  </DialogTitle>

                  <div className="mt-2 space-y-4">
                    <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
                      <div className="flex">
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">{t('analysis.share_settings.privacy_warning_title')}</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>{t('analysis.share_settings.privacy_warning_desc')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      { }
                      <label htmlFor="hideDataTrue" className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${hideFinancialData === true ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          id="hideDataTrue"
                          aria-label="Hide Financial Data"
                          type="radio"
                          name="hideFinancialData"
                          checked={hideFinancialData === true}
                          onChange={() => setHideFinancialData(true)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="block text-sm font-semibold text-gray-900">{t('analysis.share_settings.hide_data_title')}</span>
                          <span className="block text-xs text-gray-500 mt-1">{t('analysis.share_settings.hide_data_desc')}</span>
                        </div>
                      </label>

                      { }
                      <label htmlFor="hideDataFalse" className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${hideFinancialData === false ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input
                          id="hideDataFalse"
                          aria-label="Show Financial Data"
                          type="radio"
                          name="hideFinancialData"
                          checked={hideFinancialData === false}
                          onChange={() => setHideFinancialData(false)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="block text-sm font-semibold text-gray-900">{t('analysis.share_settings.show_data_title')}</span>
                          <span className="block text-xs text-gray-500 mt-1">{t('analysis.share_settings.show_data_desc')}</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                      onClick={() => setIsShareSettingsModalOpen(false)}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50 items-center"
                      onClick={() => pendingShareReport && executeShare(pendingShareReport.id, hideFinancialData)}
                      disabled={isSharing}
                    >
                      {isSharing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t('analysis.share_settings.confirm')}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>      <Transition appear show={isShareLinkModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setIsShareLinkModalOpen(false)}>
          <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </TransitionChild>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle as="h3" className="text-lg font-bold leading-6 text-gray-900 mb-2 flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-blue-600" />
                    {t('analysis.share.modal_title')}
                  </DialogTitle>

                  <div className="mt-2">
                    <p
                      className="text-sm text-gray-500 mb-4"
                      dangerouslySetInnerHTML={{ __html: t('analysis.share.modal_desc') }}
                    />

                    <div className="flex justify-center mb-6 mt-4">
                      {shareToken && (
                        <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm inline-block">
                          <QRCodeSVG
                            value={`${window.location.origin}/share/report/${shareToken}`}
                            size={160}
                            level="M"
                            className="w-full h-auto"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <input
                        aria-label="Share link"
                        readOnly
                        value={shareToken ? `${window.location.origin}/share/report/${shareToken}` : ''}
                        className="flex-1 bg-transparent border-none text-sm text-gray-600 focus:ring-0 px-2 outline-none"
                      />
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="flex items-center gap-1 bg-white border border-gray-200 shadow-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0"
                      >
                        <Copy className="h-4 w-4" /> {t('analysis.share.copy')}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      onClick={handleRevokeShare}
                      disabled={isRevoking}
                    >
                      {isRevoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {t('analysis.share.revoke')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                      onClick={() => setIsShareLinkModalOpen(false)}
                    >
                      {t('analysis.share.done')}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
