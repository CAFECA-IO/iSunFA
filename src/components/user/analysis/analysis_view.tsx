'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import { Dialog } from '@headlessui/react';
import { Check, Calendar, Coins, Globe, Info } from 'lucide-react';
import { request } from '@/lib/utils/request';
import PaymentConfirmModal from '@/components/common/payment_confirm_modal';
import SuccessNotification from '@/components/common/success_notification';
import HistorySection from '@/components/user/analysis/history_section';
import { getAnalysisCost, IAnalysisParams } from '@/lib/analysis/pricing';
import { useOrderTransaction, IOrderPayload } from '@/hooks/use_order_transaction';
import { getPeriodDateRange } from '@/lib/analysis/period';
import { INTERNAL_CATEGORIES, EXTERNAL_CATEGORIES, COUNTRIES, PERIOD_TYPES, ANALYSIS_CATEGORY } from '@/constants/analysis';
import { type AnalysisCategory, type AnalysisPeriod, ANALYSIS_PERIOD } from '@/constants/analysis';
import { ANALYSIS_ADDON_COSTS } from '@/constants/price';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ORDER_TYPE } from '@/constants/status';

// Info: (20260419 - Luphia) 靜態常數外提，避免每次 Render 重複建立 ---
const SEASONS = ['S1', 'S2', 'S3', 'S4'];
const MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
const WEEKS = Array.from({ length: 53 }, (_, i) => `W${i + 1}`);

type TabType = 'internal' | 'external' | 'history';

export default function AnalysisView() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Info: (20260419 - Luphia) 狀態管理
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams.get('tab') as TabType;
    return ['internal', 'external', 'history'].includes(tabParam) ? tabParam : 'internal';
  });

  const [category, setCategory] = useState<string>(INTERNAL_CATEGORIES[0]);
  const [periodType, setPeriodType] = useState<string>(PERIOD_TYPES[2]);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState<string>('');

  const [selectedCountry, setSelectedCountry] = useState<string>('tw');
  const [keyword, setKeyword] = useState<string>('');

  // Info: (20260419 - Luphia) 將加購項目狀態整合為單一物件
  const [addons, setAddons] = useState({
    bookkeeper: false,
    cpa: false,
    thirdParty: false
  });

  const [accountBooks, setAccountBooks] = useState<Array<{ id: string, name: string, enterpriseId?: string }>>([]);
  const [internalCompanyName, setInternalCompanyName] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<{ taxId: string, name: string } | null>(null);
  const [companySuggestions, setCompanySuggestions] = useState<{ taxId: string, name: string }[]>([]);

  const [uiState, setUiState] = useState({
    isSearchingCompany: false,
    showCompanyDropdown: false,
    isTaxIdModalOpen: false,
    isPaymentModalOpen: false,
    isLoading: false,
    showSuccessNotification: false,
    isUpdatingTaxId: false
  });

  const [pendingAccountBook, setPendingAccountBook] = useState<{ id: string, name: string } | null>(null);
  const [taxIdInput, setTaxIdInput] = useState('');

  const { workflowStatus, txHash, resetTransaction, executeOrderTransaction, errorMessage, setErrorMessage } = useOrderTransaction();

  // Info: (20260419 - Luphia) 衍生變數 (Derived States)
  const currentCategories = activeTab === 'internal' ? INTERNAL_CATEGORIES : EXTERNAL_CATEGORIES;
  const isInternalCompanyAnalysis = activeTab === 'internal';
  const isExternalCarbonAnalysis = activeTab === 'external' && ['CARBON_HEALTH_CHECK', 'NET_ZERO_EMISSIONS'].includes(category);
  const needsCompanyInput = isInternalCompanyAnalysis || isExternalCarbonAnalysis;
  const isDaily = periodType === ANALYSIS_PERIOD.DAILY;
  const country = activeTab === 'external' ? selectedCountry : undefined;

  const data: IAnalysisParams = useMemo(() => ({
    category: category as AnalysisCategory,
    periodType: periodType as AnalysisPeriod,
    periodValue: periodType === ANALYSIS_PERIOD.YEARLY ? String(selectedYear) : String(selectedPeriodValue),
    year: selectedYear,
  }), [category, periodType, selectedPeriodValue, selectedYear]);

  const calculatedCost = useMemo(() => getAnalysisCost(data), [data]);

  const extraCost = useMemo(() => {
    if (!isInternalCompanyAnalysis) return 0;
    let cost = 0;
    if (addons.bookkeeper) cost += ANALYSIS_ADDON_COSTS.BOOKKEEPER;
    if (addons.cpa) cost += ANALYSIS_ADDON_COSTS.CPA;
    if (addons.thirdParty) cost += ANALYSIS_ADDON_COSTS.THIRD_PARTY;
    return cost;
  }, [isInternalCompanyAnalysis, addons]);

  const finalCost = useMemo(() => calculatedCost + extraCost, [calculatedCost, extraCost]);

  // Info: (20260419 - Luphia) 副作用 (Effects)

  // Info: (20260419 - Luphia) URL Tab 同步
  useEffect(() => {
    const currentTabParam = searchParams.get('tab');
    if (currentTabParam !== activeTab) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', activeTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeTab, pathname, router, searchParams]);

  // Info: (20260419 - Luphia) 切換 Tab 時重置分類
  useEffect(() => {
    setCategory(currentCategories[0]);
  }, [activeTab, currentCategories]);

  // Info: (20260419 - Luphia) 取得 Account Books (加入 isMounted 防止 Memory Leak)
  useEffect(() => {
    let isMounted = true;
    request<{ payload: Array<{ id: string, name: string, enterpriseId?: string }> }>('/api/v1/user/account_book')
      .then(res => {
        if (isMounted && res?.payload) setAccountBooks(res.payload);
      })
      .catch(console.error);
    return () => { isMounted = false; };
  }, []);

  // Info: (20260419 - Luphia) 公司搜尋 Debounce
  useEffect(() => {
    if (!isExternalCarbonAnalysis || internalCompanyName.length < 2) {
      setCompanySuggestions([]);
      setUiState(prev => ({ ...prev, showCompanyDropdown: false }));
      return;
    }

    if (selectedCompany && `${selectedCompany.name} (${selectedCompany.taxId})` === internalCompanyName) {
      return;
    }

    const timer = setTimeout(async () => {
      setUiState(prev => ({ ...prev, isSearchingCompany: true }));
      try {
        const res = await request<{ payload: { taxId: string, name: string }[] }>(`/api/v1/company/lookup?query=${encodeURIComponent(internalCompanyName)}`);
        if (res?.payload) {
          setCompanySuggestions(res.payload);
          setUiState(prev => ({ ...prev, showCompanyDropdown: true }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setUiState(prev => ({ ...prev, isSearchingCompany: false }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [internalCompanyName, isExternalCarbonAnalysis, selectedCompany]);

  // Info: (20260419 - Luphia) 防止碳盤查選擇日/週/月
  useEffect(() => {
    if (needsCompanyInput && ([ANALYSIS_PERIOD.MONTHLY, ANALYSIS_PERIOD.WEEKLY, ANALYSIS_PERIOD.DAILY] as string[]).includes(periodType)) {
      setPeriodType(ANALYSIS_PERIOD.YEARLY);
      setSelectedPeriodValue('');
    }
  }, [needsCompanyInput, periodType]);


  // Info: (20260419 - Luphia) 處理函式 (Handlers)
  const handleGenerate = () => {
    setUiState(prev => ({ ...prev, isPaymentModalOpen: true }));
    resetTransaction();
  };

  const handleAnalysisWorkflow = async () => {
    setUiState(prev => ({ ...prev, isLoading: true }));

    const derivedKeyword = (activeTab === 'external' && !isExternalCarbonAnalysis && category !== 'market_trends')
      ? keyword : (needsCompanyInput ? internalCompanyName : undefined);

    const payloadItems = [
      { name: t(`analysis.categories.${category.toLowerCase()}`) || category, unitPrice: calculatedCost, quantity: 1 }
    ];

    if (isInternalCompanyAnalysis) {
      if (addons.bookkeeper) payloadItems.push({ name: "Addon: Bookkeeper Visa", unitPrice: ANALYSIS_ADDON_COSTS.BOOKKEEPER, quantity: 1 });
      if (addons.cpa) payloadItems.push({ name: "Addon: CPA Visa", unitPrice: ANALYSIS_ADDON_COSTS.CPA, quantity: 1 });
      if (addons.thirdParty) payloadItems.push({ name: "Addon: Third Party Visa", unitPrice: ANALYSIS_ADDON_COSTS.THIRD_PARTY, quantity: 1 });
    }

    const payload: IOrderPayload = {
      type: ORDER_TYPE.ANALYSIS,
      data: {
        category: data.category,
        periodType: data.periodType,
        year: data.year,
        periodValue: data.periodValue,
        country,
        keyword: derivedKeyword,
        isExternal: activeTab === 'external',
      },
      items: payloadItems
    };

    const success = await executeOrderTransaction(payload, finalCost, async () => {
      setTimeout(() => {
        setUiState(prev => ({ ...prev, isPaymentModalOpen: false, showSuccessNotification: true }));
        setActiveTab('history');
      }, 2000);
    });

    if (!success && errorMessage === "Payment or Analysis failed") {
      setErrorMessage(t('auth_modal.failed'));
    }

    setUiState(prev => ({ ...prev, isLoading: false }));
  };

  const handleUpdateTaxId = async () => {
    if (!taxIdInput || !pendingAccountBook) return;
    setUiState(prev => ({ ...prev, isUpdatingTaxId: true }));
    try {
      const res = await request(`/api/v1/user/account_book/${pendingAccountBook.id}`, {
        method: 'PUT',
        body: JSON.stringify({ enterpriseId: taxIdInput }),
      });
      if (res) {
        setAccountBooks(prev => prev.map(ab => ab.id === pendingAccountBook.id ? { ...ab, enterpriseId: taxIdInput } : ab));
        setSelectedCompany({ taxId: taxIdInput, name: pendingAccountBook.name });
        setInternalCompanyName(`${pendingAccountBook.name} (${taxIdInput})`);
        setUiState(prev => ({ ...prev, isTaxIdModalOpen: false }));
        setTaxIdInput('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUiState(prev => ({ ...prev, isUpdatingTaxId: false }));
    }
  };

  // Info: (20260419 - Luphia) 畫面渲染輔助
  const simplePeriodString = useMemo(() => {
    const periodVal = periodType === ANALYSIS_PERIOD.YEARLY ? selectedYear.toString() : selectedPeriodValue;
    if (periodType === ANALYSIS_PERIOD.DAILY && !periodVal) return '';

    const { start, end } = getPeriodDateRange(periodType, selectedYear, periodVal);
    if (!start || !end) return '';
    return start === end ? start : `${start} ~ ${end}`;
  }, [periodType, selectedYear, selectedPeriodValue]);

  const renderPeriodOptions = useCallback(() => {
    const buttonClass = (isActive: boolean) => `
      text-sm font-medium rounded-lg transition-all border flex items-center justify-center
      ${isActive ? 'bg-orange-50 border-orange-200 text-orange-700 ring-1 ring-orange-200'
        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'}
    `;

    switch (periodType) {
      case ANALYSIS_PERIOD.YEARLY: return null;
      case ANALYSIS_PERIOD.SEASONLY:
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SEASONS.map((season) => (
              <button key={season} onClick={() => setSelectedPeriodValue(season)} className={`py-3 ${buttonClass(selectedPeriodValue === season)}`}>
                {season}
              </button>
            ))}
          </div>
        );
      case ANALYSIS_PERIOD.MONTHLY:
        return (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {MONTHS.map((month) => (
              <button key={month} onClick={() => setSelectedPeriodValue(month)} className={`h-10 ${buttonClass(selectedPeriodValue === month)}`}>
                {month}
              </button>
            ))}
          </div>
        );
      case ANALYSIS_PERIOD.WEEKLY:
        return (
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-1">
            {WEEKS.map((week) => (
              <button key={week} onClick={() => setSelectedPeriodValue(week)} className={`h-9 text-xs ${buttonClass(selectedPeriodValue === week)}`}>
                {week}
              </button>
            ))}
          </div>
        );
      case ANALYSIS_PERIOD.DAILY: {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() - 2);
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(baseDate);
          d.setDate(baseDate.getDate() - i);
          return { label: `${d.getMonth() + 1}/${d.getDate()}`, value: d.toISOString().split('T')[0] };
        });

        return (
          <div className="flex flex-wrap gap-2">
            {last7Days.map((dateItem) => (
              <button key={dateItem.value} onClick={() => setSelectedPeriodValue(dateItem.value)}
                className={`px-4 py-2 ${buttonClass(selectedPeriodValue === dateItem.value).replace('bg-orange-50 border-orange-200 text-orange-700 ring-1 ring-orange-200', 'bg-orange-600 text-white border-orange-600 shadow-sm')}`}>
                {dateItem.label}
              </button>
            ))}
          </div>
        );
      }
      default: return null;
    }
  }, [periodType, selectedPeriodValue]);

  const renderAddonsCheckbox = (key: keyof typeof addons, labelKey: string, cost: number) => {
    const isChecked = addons[key];
    return (
      <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-200' : 'border-gray-200 hover:bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <input
            aria-label={t(labelKey)}
            type="checkbox"
            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
            checked={isChecked}
            onChange={() => setAddons(prev => ({ ...prev, [key]: !prev[key] }))}
          />
          <span className={`text-sm font-medium ${isChecked ? 'text-orange-900' : 'text-gray-700'}`}>
            {t(labelKey)}
          </span>
        </div>
        <span className="text-sm font-bold text-gray-500 flex items-center gap-1">
          +{cost} <Coins className="h-4 w-4" />
        </span>
      </label>
    );
  };

  return (
    <div className="space-y-6">
      {/* Info: (20260419 - Luphia) Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('analysis.title')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('analysis.desc')}</p>
      </div>

      {/* Info: (20260419 - Luphia) Tabs */}
      <div className="flex justify-center">
        <div className="flex rounded-lg bg-gray-100 p-1">
          {(['internal', 'external', 'history'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab ? 'bg-white shadow-sm' : 'hover:bg-gray-50'} rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200`}
            >
              {t(`analysis.${tab}_${tab === 'history' ? 'reports' : 'analysis'}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Info: (20260419 - Luphia) Main Content */}
      {activeTab !== 'history' && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 min-h-[400px]">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-6">

              {/* Info: (20260419 - Luphia) 1. Period Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t('analysis.period_type')}</label>
                <div className="flex flex-wrap gap-2">
                  {PERIOD_TYPES.filter(type => !(needsCompanyInput && ([ANALYSIS_PERIOD.MONTHLY, ANALYSIS_PERIOD.WEEKLY, ANALYSIS_PERIOD.DAILY] as string[]).includes(type))).map((type) => (
                    <button key={type} onClick={() => { setPeriodType(type); setSelectedPeriodValue(''); }}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all border ${periodType === type ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {t(`analysis.time_units.${type.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info: (20260419 - Luphia) 2. Year Selection */}
              {!isDaily && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t('analysis.select_year')}</label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: currentYear - 2020 + 1 }, (_, i) => currentYear - i).map((year) => (
                      <button key={year} onClick={() => setSelectedYear(year)}
                        className={`min-w-[4rem] px-3 py-2 text-sm font-medium rounded-lg transition-all border ${selectedYear === year ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Info: (20260419 - Luphia) 3. Specific Period Selection */}
              {periodType !== ANALYSIS_PERIOD.YEARLY && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t('analysis.select_period')}</label>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {renderPeriodOptions()}
                  </div>
                </div>
              )}

              {/* Info: (20260419 - Luphia) Country Selection */}
              {activeTab === 'external' && !isExternalCarbonAnalysis && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700">{t('analysis.country')}</label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.map((code) => (
                      <button key={code} onClick={() => setSelectedCountry(code)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border flex items-center gap-2 ${selectedCountry === code ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                        <Globe className="h-4 w-4" /> {t(`analysis.countries.${code}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Info: (20260419 - Luphia) Category Selection */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700">{t('analysis.category')}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {currentCategories.map((cat) => (
                    <button key={cat} onClick={() => setCategory(cat)}
                      className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 ${category === cat ? 'border-orange-600 bg-orange-50 text-orange-900 ring-1 ring-orange-600' : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50 text-gray-700'}`}>
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold text-sm">{t(`analysis.categories.${cat.toLowerCase()}`)}</span>
                        {category === cat && <Check className="h-4 w-4 text-orange-600" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info: (20260419 - Luphia) Internal Company Dropdown */}
              {isInternalCompanyAnalysis && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <select
                    className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    value={accountBooks.find(b => internalCompanyName.startsWith(b.name))?.id || ""}
                    onChange={(e) => {
                      const ab = accountBooks.find(b => b.id === e.target.value);
                      if (ab) {
                        setInternalCompanyName(ab.enterpriseId ? `${ab.name} (${ab.enterpriseId})` : ab.name);
                        if (ab.enterpriseId) {
                          setSelectedCompany({ taxId: ab.enterpriseId, name: ab.name });
                        } else {
                          setSelectedCompany(null);
                          setPendingAccountBook({ id: ab.id, name: ab.name });
                          setUiState(prev => ({ ...prev, isTaxIdModalOpen: true }));
                        }
                      }
                    }}
                  >
                    <option value="" disabled>-- {t('analysis.select_from_account_books') || '選擇帳本'} --</option>
                    {accountBooks.map(ab => <option key={ab.id} value={ab.id}>{ab.name} {ab.enterpriseId ? `(${ab.enterpriseId})` : ''}</option>)}
                  </select>
                </div>
              )}

              {/* Info: (20260419 - Luphia) External Carbon Company Input */}
              {isExternalCarbonAnalysis && (
                <div className="space-y-4 pt-4 border-t border-gray-100 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('analysis.company_input.label')}</label>
                  <div className="flex items-center">
                    <input
                      aria-label={t('analysis.company_input.label')}
                      type="text"
                      value={internalCompanyName}
                      onChange={(e) => { setSelectedCompany(null); setInternalCompanyName(e.target.value); }}
                      placeholder={t('analysis.company_input.placeholder')}
                      className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                    {uiState.isSearchingCompany && <span className="text-xs text-gray-500 ml-2">{t('analysis.company_input.searching')}</span>}
                  </div>

                  {uiState.showCompanyDropdown && companySuggestions.length > 0 && (
                    <div className="absolute z-10 w-full max-w-md mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                      {companySuggestions.map(c => (
                        <button key={c.taxId} type="button" onClick={() => {
                          setSelectedCompany(c);
                          setInternalCompanyName(`${c.name} (${c.taxId})`);
                          setUiState(prev => ({ ...prev, showCompanyDropdown: false }));
                        }} className="w-full text-left px-4 py-2 hover:bg-orange-50 text-sm text-gray-700 font-medium border-b border-gray-100 last:border-0">
                          {c.name} <span className="text-gray-400 font-normal">({c.taxId})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {uiState.showCompanyDropdown && companySuggestions.length === 0 && internalCompanyName.length >= 2 && !uiState.isSearchingCompany && (
                    <div className="absolute z-10 w-full max-w-md mt-1 bg-white p-3 rounded-md shadow-lg border border-gray-200"><p className="text-sm text-red-500">{t('analysis.company_input.not_found')}</p></div>
                  )}
                </div>
              )}

              {/* Info: (20260419 - Luphia) Keyword Input */}
              {activeTab === 'external' && !isExternalCarbonAnalysis && category !== 'market_trends' && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700">{t('analysis.keyword')}</label>
                    {['industry_development', 'irsc', 'financial_product_rating'].includes(category) && (
                      <div className="group relative">
                        <Info className="h-4 w-4 text-gray-400 hover:text-orange-500 cursor-help" />
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block w-[400px] bg-white text-gray-800 text-xs rounded-lg shadow-xl ring-1 ring-gray-900/5 p-4 z-50 overflow-y-auto max-h-[80vh]">
                          <p className="font-bold text-sm mb-2 text-orange-600">{t(`analysis.tooltips.${category === 'irsc' ? 'smart_enterprise_rating' : category}.title`)}</p>
                          <p className="mb-3 text-gray-600">{t(`analysis.tooltips.${category === 'irsc' ? 'smart_enterprise_rating' : category}.desc`)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input aria-label={t('analysis.keyword')} type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t('analysis.enter_keyword')} className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 relative z-10" />
                </div>
              )}
            </div>

            {/* Info: (20260419 - Luphia) Bottom Actions & Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                {(periodType === ANALYSIS_PERIOD.YEARLY || selectedPeriodValue !== '') && (
                  <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg border border-orange-100">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <div className="flex flex-col">
                      <span className="text-xs text-orange-600 font-medium mb-0.5">{t('analysis.period')}</span>
                      <span className="text-sm font-bold text-orange-900">{simplePeriodString}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <Coins className="h-4 w-4 text-gray-500" />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium mb-0.5">{t('analysis.confirm_cost')}</span>
                    <span className="text-sm font-bold text-gray-900">{finalCost}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={(periodType !== ANALYSIS_PERIOD.YEARLY && !selectedPeriodValue) || (activeTab === 'external' && !isExternalCarbonAnalysis && !selectedCountry) || (activeTab === 'external' && !isExternalCarbonAnalysis && category !== ANALYSIS_CATEGORY.MARKET_TRENDS && !keyword.trim()) || (needsCompanyInput && !selectedCompany)}
                className="w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed rounded-lg bg-orange-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 transition-colors"
              >
                {t('analysis.generate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info: (20260419 - Luphia) Payment Modal */}
      <PaymentConfirmModal
        isOpen={uiState.isPaymentModalOpen}
        onClose={() => {
          if (workflowStatus === 'error' || workflowStatus === 'payment_success') resetTransaction();
          setUiState(prev => ({ ...prev, isPaymentModalOpen: false }));
        }}
        onConfirm={handleAnalysisWorkflow}
        cost={finalCost}
        items={[
          { label: t('analysis.category'), value: t(`analysis.categories.${category.toLowerCase()}`) },
          ...(country ? [{ label: t('analysis.country'), value: t(`analysis.countries.${country}`) }] : []),
          ...(keyword && activeTab === 'external' && !isExternalCarbonAnalysis && category !== ANALYSIS_CATEGORY.MARKET_TRENDS ? [{ label: t('analysis.keyword'), value: keyword }] : []),
          ...(needsCompanyInput && internalCompanyName ? [{ label: t('analysis.company_input.label'), value: internalCompanyName }] : []),
          { label: t('analysis.period'), value: t('analysis.selected_period_desc', { value: periodType === ANALYSIS_PERIOD.YEARLY ? selectedYear : selectedPeriodValue, type: t(`analysis.time_units.${periodType.toLowerCase()}`) }) }
        ]}
        extraContent={isInternalCompanyAnalysis ? (
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm space-y-3 mt-4">
            <h4 className="text-sm font-bold text-gray-900">{t('analysis.addons_title', { defaultValue: '加購項目' })}</h4>
            <div className="space-y-2">
              {renderAddonsCheckbox('bookkeeper', 'analysis.addon_bookkeeper', ANALYSIS_ADDON_COSTS.BOOKKEEPER)}
              {renderAddonsCheckbox('cpa', 'analysis.addon_cpa', ANALYSIS_ADDON_COSTS.CPA)}
              {renderAddonsCheckbox('thirdParty', 'analysis.addon_third_party', ANALYSIS_ADDON_COSTS.THIRD_PARTY)}
            </div>
          </div>
        ) : undefined}
        isLoading={uiState.isLoading}
        status={workflowStatus}
        errorMessage={errorMessage}
        txHash={txHash}
      />

      {/* Info: (20260419 - Luphia) Success Notification */}
      <SuccessNotification
        show={uiState.showSuccessNotification}
        title={t('analysis.success.title')}
        message={(
          <div className="flex flex-col gap-2">
            <span>{t('analysis.success.message')}</span>
            {txHash && (
              <a href={`${process.env.NEXT_PUBLIC_BAIFA_EXPLORER || 'https://baifa.io'}/chain/isuncoin/txs/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline text-xs break-all">
                {t('analysis.success.view_tx')}: {txHash}
              </a>
            )}
          </div>
        )}
        onClose={() => setUiState(prev => ({ ...prev, showSuccessNotification: false }))}
        autoCloseDelay={10000}
      />

      {/* Info: (20260419 - Luphia) History Section */}
      {activeTab === 'history' && <HistorySection />}

      {/* Info: (20260419 - Luphia) Tax ID Edit Modal */}
      <Dialog open={uiState.isTaxIdModalOpen} onClose={() => !uiState.isUpdatingTaxId && setUiState(prev => ({ ...prev, isTaxIdModalOpen: false }))} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('account_book_selection.form_enterprise_id') || '統一編號 (Tax ID)'}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('analysis.company_input.missing_tax_id_desc', { name: pendingAccountBook?.name || '' })}</p>
              <div className="space-y-4">
                <input aria-label={t('account_book_selection.form_enterprise_id')} type="text" value={taxIdInput} onChange={(e) => setTaxIdInput(e.target.value)} placeholder="12345678" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 bg-white" />
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setUiState(prev => ({ ...prev, isTaxIdModalOpen: false }))} disabled={uiState.isUpdatingTaxId} className="px-4 py-2 text-sm font-medium text-gray-700 border rounded-lg hover:bg-gray-50">{t('common.cancel')}</button>
                  <button type="button" onClick={handleUpdateTaxId} disabled={uiState.isUpdatingTaxId || !taxIdInput} className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50">
                    {uiState.isUpdatingTaxId ? t('common.loading') : (t('common.confirm') || '確認')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
