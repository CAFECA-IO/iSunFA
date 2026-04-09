'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import { Dialog } from '@headlessui/react';
import { Check, Calendar, Coins, FileBarChart, Globe, Info } from 'lucide-react';
import { request } from '@/lib/utils/request';
import PaymentConfirmModal from '@/components/common/payment_confirm_modal';
import SuccessNotification from '@/components/common/success_notification';
import HistorySection from '@/components/user/analysis/history_section';
import { getAnalysisCost } from '@/lib/analysis/pricing';
import { useOrderTransaction, IOrderPayload } from '@/hooks/use_order_transaction';
import { getPeriodDateRange } from '@/lib/analysis/period';
import { INTERNAL_CATEGORIES, EXTERNAL_CATEGORIES, COUNTRIES, PERIOD_TYPES } from '@/constants/analysis';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function AnalysisView() {
  const { t } = useTranslation();

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<'internal' | 'external' | 'history'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'internal' || tabParam === 'external' || tabParam === 'history') {
      return tabParam as 'internal' | 'external' | 'history';
    }
    return 'internal';
  });

  useEffect(() => {
    const currentTabParam = searchParams.get('tab');
    if (currentTabParam !== activeTab) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', activeTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeTab, pathname, router, searchParams]);
  const [category, setCategory] = useState<string>(INTERNAL_CATEGORIES[0]);
  const [periodType, setPeriodType] = useState<string>(PERIOD_TYPES[2]);

  const currentCategories = activeTab === 'internal' ? INTERNAL_CATEGORIES : EXTERNAL_CATEGORIES;

  // Info: (20260120 - Luphia) Reset category when tab changes
  useEffect(() => {
    setCategory(currentCategories[0]);
  }, [activeTab, currentCategories]);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState<string>('');
  const { workflowStatus, txHash, resetTransaction, executeOrderTransaction, errorMessage, setErrorMessage } = useOrderTransaction();

  // Info: (20260120 - Luphia) External Analysis States
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  const [accountBooks, setAccountBooks] = useState<Array<{ id: string, name: string, enterpriseId?: string }>>([]);
  useEffect(() => {
    request<{ payload: Array<{ id: string, name: string, enterpriseId?: string }> }>('/api/v1/user/account_book')
      .then(res => {
        if (res?.payload) setAccountBooks(res.payload);
      })
      .catch(console.error);
  }, []);

  const [internalCompanyName, setInternalCompanyName] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<{ taxId: string, name: string } | null>(null);
  const [companySuggestions, setCompanySuggestions] = useState<{ taxId: string, name: string }[]>([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // Info: (20260409) Account Book Tax ID Modal states
  const [isTaxIdModalOpen, setIsTaxIdModalOpen] = useState(false);
  const [pendingAccountBook, setPendingAccountBook] = useState<{ id: string, name: string } | null>(null);
  const [taxIdInput, setTaxIdInput] = useState('');
  const [isUpdatingTaxId, setIsUpdatingTaxId] = useState(false);

  const isInternalCompanyAnalysis = activeTab === 'internal';
  const isExternalCarbonAnalysis = activeTab === 'external' && ['carbon_health_check', 'net_zero_emissions'].includes(category);
  const needsCompanyInput = isInternalCompanyAnalysis || isExternalCarbonAnalysis;

  useEffect(() => {
    if (!isExternalCarbonAnalysis || internalCompanyName.length < 2) {
      setCompanySuggestions([]);
      setShowCompanyDropdown(false);
      return;
    }

    if (selectedCompany && `${selectedCompany.name} (${selectedCompany.taxId})` === internalCompanyName) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCompany(true);
      try {
        const res = await request<{ payload: { taxId: string, name: string }[] }>('/api/v1/company/lookup?query=' + encodeURIComponent(internalCompanyName));
        if (res?.payload) {
          setCompanySuggestions(res.payload);
          setShowCompanyDropdown(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingCompany(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [internalCompanyName, isExternalCarbonAnalysis, selectedCompany]);

  // Info: (20260320 - Tzuhan) Prevent selecting daily/weekly/monthly for carbon analysis
  useEffect(() => {
    if (needsCompanyInput && ['monthly', 'weekly', 'daily'].includes(periodType)) {
      setPeriodType('yearly');
      setSelectedPeriodValue('');
    }
  }, [needsCompanyInput, periodType]);

  // Info: (20260128 - Luphia) Calculate dynamic cost
  const calculatedCost = useMemo(() => {
    return getAnalysisCost({
      category,
      periodType,
      periodValue: String(selectedPeriodValue),
      year: selectedYear,
    });
  }, [category, periodType, selectedPeriodValue, selectedYear]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Info: (20260128 - Luphia) Error Modal State
  // const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  // Info: (20260130 - Luphia) Success Notification State
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Info: (20260120 - Luphia) Generate specific period options based on type
  const renderPeriodOptions = () => {
    switch (periodType) {
      case 'yearly':
        /**
         * Info: (20260120 - Luphia)
         * No extra selection needed for yearly if year is selected, or maybe just reaffirm the year?
         * Actually usually "Yearly" analysis implies the whole year.
         * We can auto-select the period value as the year itself or just hide this step.
         * Let's assume selecting the YEAR is enough for Yearly analysis.
         */
        return null;

      case 'seasonly':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['S1', 'S2', 'S3', 'S4'].map((season) => (
              <button
                key={season}
                onClick={() => setSelectedPeriodValue(season)}
                className={`
                  px-4 py-3 rounded-lg text-sm font-medium transition-all border
                  ${selectedPeriodValue === season
                    ? 'bg-orange-50 border-orange-200 text-orange-700 ring-1 ring-orange-200'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {season}
              </button>
            ))}
          </div>
        );
      case 'monthly':
        return (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <button
                key={month}
                onClick={() => setSelectedPeriodValue(month.toString())}
                className={`
                  h-10 text-sm font-medium rounded-lg transition-all border
                  ${selectedPeriodValue === month.toString()
                    ? 'bg-orange-50 border-orange-200 text-orange-700 ring-1 ring-orange-200'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {month}
              </button>
            ))}
          </div>
        );
      case 'weekly':
        return (
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-1">
            {Array.from({ length: 53 }, (_, i) => i + 1).map((week) => (
              <button
                key={week}
                onClick={() => setSelectedPeriodValue(`W${week}`)}
                className={`
                  h-9 text-xs font-medium rounded block w-full transition-all border
                  ${selectedPeriodValue === `W${week}`
                    ? 'bg-orange-50 border-orange-200 text-orange-700 ring-1 ring-orange-200'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                W{week}
              </button>
            ))}
          </div>
        );
      case 'daily': {
        // Info: (20260120 - Luphia) Start from 48 hours (2 days) ago
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() - 2);

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(baseDate);
          d.setDate(baseDate.getDate() - i);
          return {
            label: `${d.getMonth() + 1}/${d.getDate()}`,
            value: d.toISOString().split('T')[0],
          };
        });

        return (
          <div className="flex flex-wrap gap-2">
            {last7Days.map((dateItem) => (
              <button
                key={dateItem.value}
                onClick={() => setSelectedPeriodValue(dateItem.value)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-all border
                  ${selectedPeriodValue === dateItem.value
                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                {dateItem.label}
              </button>
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Info: (20260120 - Luphia) Derived period string for display and modal
  const simplePeriodString = (() => {
    const periodVal = periodType === 'yearly' ? selectedYear.toString() : selectedPeriodValue;
    // Info: (20260120 - Luphia) For daily buttons, we might want to ensure selectedPeriodValue is set
    if (periodType === 'daily' && !periodVal) return '';

    const { start, end } = getPeriodDateRange(periodType, selectedYear, periodVal);
    if (!start || !end) return '';
    if (start === end) return start;
    return `${start} ~ ${end}`;
  })();

  const derivedKeyword = (activeTab === 'external' && !isExternalCarbonAnalysis && category !== 'market_trends')
    ? keyword
    : (needsCompanyInput ? internalCompanyName : undefined);

  // Info: (20260120 - Tzuhan) Open Payment Modal
  const handleGenerate = () => {
    setIsPaymentModalOpen(true);
    resetTransaction();
  };

  // Info: (20260209 - Tzuhan) Combined Analysis Workflow (Single Signature)
  const handleAnalysisWorkflow = async () => {
    setIsLoading(true);

    const payload: IOrderPayload = {
      category,
      periodType,
      year: selectedYear,
      periodValue: periodType === 'yearly' ? selectedYear.toString() : selectedPeriodValue,
      country,
      keyword: activeTab === 'external' && category !== 'market_trends' ? keyword : (needsCompanyInput ? internalCompanyName : undefined),
      isExternal: activeTab === 'external',
      items: [
        {
          name: t(`analysis.categories.${category}`) || category,
          unitPrice: calculatedCost,
          quantity: 1,
        }
      ]
    };

    const success = await executeOrderTransaction(payload, calculatedCost, async (authData) => {
      await request('/api/v1/user/analysis', {
        method: 'POST',
        body: JSON.stringify({
          category,
          periodType,
          year: selectedYear,
          periodValue: periodType === 'yearly' ? selectedYear.toString() : selectedPeriodValue,
          country,
          keyword: derivedKeyword, // Info: (20260209 - Tzuhan) derivedKeyword for the backend
          isExternal: activeTab === 'external',
          authentication: authData,
        }),
      });

      setTimeout(() => {
        setIsPaymentModalOpen(false);
        setActiveTab('history');
        setShowSuccessNotification(true);
      }, 2000);
    });

    if (!success && errorMessage === "Payment or Analysis failed") {
      setErrorMessage(t('auth_modal.failed'));
    }

    setIsLoading(false);
  };

  const isDaily = periodType === 'daily';
  const country = activeTab === 'external' ? selectedCountry : undefined;

  return (
    <div className="space-y-6">
      {/* Info: (20260120 - Luphia) Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('analysis.title')}</h1>
      </div>

      {/* Info: (20260120 - Luphia) Tabs */}
      <div className="flex justify-center">
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab('internal')}
            className={`${activeTab === 'internal' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
              } rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
          >
            {t('analysis.internal_analysis')}
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`${activeTab === 'external' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
              } rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
          >
            {t('analysis.external_analysis')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${activeTab === 'history' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
              } rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
          >
            {t('analysis.history_reports')}
          </button>
        </div>
      </div>

      {/* Info: (20260120 - Luphia) Main Content Form (Internal/External) */}
      {activeTab !== 'history' && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 min-h-[400px]">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-6">

              {/* Info: (20260120 - Luphia) 1. Period Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('analysis.period_type')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {PERIOD_TYPES.filter(type => !(needsCompanyInput && ['monthly', 'weekly', 'daily'].includes(type))).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setPeriodType(type);
                        setSelectedPeriodValue('');
                      }}
                      className={`
                      px-4 py-2 text-sm font-medium rounded-full transition-all border
                      ${periodType === type
                          ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }
                    `}
                    >
                      {t(`analysis.time_units.${type}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info: (20260120 - Luphia) 2. Year Selection (Conditional) */}
              {!isDaily && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('analysis.select_year')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: currentYear - 2020 + 1 }, (_, i) => currentYear - i).map((year) => (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`
                        min-w-[4rem] px-3 py-2 text-sm font-medium rounded-lg transition-all border
                        ${selectedYear === year
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }
                      `}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Info: (20260120 - Luphia) 3. Specific Period Selection */}
              {periodType !== 'yearly' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('analysis.select_period')}
                  </label>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {renderPeriodOptions()}
                  </div>
                </div>
              )}

              {/* Info: (20260120 - Luphia) External Analysis: Country Selection */}
              {activeTab === 'external' && !isExternalCarbonAnalysis && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('analysis.country')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.map((code) => (
                      <button
                        key={code}
                        onClick={() => setSelectedCountry(code)}
                        className={`
                        px-4 py-2 text-sm font-medium rounded-lg transition-all border flex items-center gap-2
                        ${selectedCountry === code
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }
                      `}
                      >
                        <Globe className="h-4 w-4" />
                        {t(`analysis.countries.${code}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Info: (20260120 - Luphia) Category Selection */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700">
                  {t('analysis.category')}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {currentCategories.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`
                        relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200
                        ${isSelected
                            ? 'border-orange-600 bg-orange-50 text-orange-900 ring-1 ring-orange-600'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50 text-gray-700'
                          }
                      `}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-semibold text-sm">{t(`analysis.categories.${cat}`)}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-orange-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Info: (20260320 - Tzuhan) Internal Analysis: Company Dropdown */}
              {isInternalCompanyAnalysis && (
                <div className="space-y-4 pt-4 border-t border-gray-100 relative">
                  <div className="space-y-2">
                    <select
                      className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      onChange={(e) => {
                        const ab = accountBooks.find(b => b.id === e.target.value);
                        if (ab) {
                          const combinedName = ab.enterpriseId ? `${ab.name} (${ab.enterpriseId})` : ab.name;
                          setInternalCompanyName(combinedName);
                          if (ab.enterpriseId) {
                            setSelectedCompany({ taxId: ab.enterpriseId, name: ab.name });
                          } else {
                            setSelectedCompany(null);
                            setPendingAccountBook({ id: ab.id, name: ab.name });
                            setIsTaxIdModalOpen(true);
                          }
                        }
                      }}
                      value={accountBooks.find(b => internalCompanyName.startsWith(b.name))?.id || ""}
                    >
                      <option value="" disabled>-- {t('analysis.select_from_account_books') || '選擇帳本'} --</option>
                      {accountBooks.map(ab => (
                        <option key={ab.id} value={ab.id}>
                          {ab.name} {ab.enterpriseId ? `(${ab.enterpriseId})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Info: (20260324 - Tzuhan) External Analysis: Carbon Analysis Company Input */}
              {isExternalCarbonAnalysis && (
                <div className="space-y-4 pt-4 border-t border-gray-100 relative">
                  <div className="space-y-2 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('analysis.company_input.label')}
                    </label>
                    <div className="flex items-center">
                      <input
                        id="internalCompanyName"
                        aria-label={t('analysis.company_input.label')}
                        type="text"
                        value={internalCompanyName}
                        onChange={(e) => {
                          setSelectedCompany(null);
                          setInternalCompanyName(e.target.value);
                        }}
                        placeholder={t('analysis.company_input.placeholder')}
                        className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      />
                      {isSearchingCompany && <span className="text-xs text-gray-500 ml-2">{t('analysis.company_input.searching')}</span>}
                    </div>

                    {showCompanyDropdown && companySuggestions.length > 0 && (
                      <div className="absolute z-10 w-full max-w-md mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                        {companySuggestions.map(c => (
                          <button
                            key={c.taxId}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 font-medium border-b border-gray-100 last:border-0"
                            onClick={() => {
                              setSelectedCompany(c);
                              setInternalCompanyName(`${c.name} (${c.taxId})`);
                              setShowCompanyDropdown(false);
                            }}
                          >
                            {c.name} <span className="text-gray-400 font-normal">({c.taxId})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showCompanyDropdown && companySuggestions.length === 0 && internalCompanyName.length >= 2 && !isSearchingCompany && (
                      <div className="absolute z-10 w-full max-w-md mt-1 bg-white rounded-md shadow-lg border border-gray-200 p-3">
                        <p className="text-sm text-red-500">{t('analysis.company_input.not_found')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Info: (20260120 - Luphia) External Analysis: Keyword Input (Move to after Category) */}
              {activeTab === 'external' && !isExternalCarbonAnalysis && category !== 'market_trends' && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('analysis.keyword')}
                    </label>
                    {['industry_development', 'irsc', 'financial_product_rating'].includes(category) && (
                      <div className="group relative">
                        <Info className="h-4 w-4 text-gray-400 hover:text-orange-500 cursor-help transition-colors" />
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block w-[400px] bg-white text-gray-800 text-xs rounded-lg shadow-xl ring-1 ring-gray-900/5 p-4 z-50 overflow-y-auto max-h-[80vh]">
                          <p className="font-bold text-sm mb-2 text-orange-600">{t(`analysis.tooltips.${category === 'irsc' ? 'smart_enterprise_rating' : category}.title`)}</p>
                          <p className="mb-3 text-gray-600">{t(`analysis.tooltips.${category === 'irsc' ? 'smart_enterprise_rating' : category}.desc`)}</p>

                          {category === 'industry_development' && (
                            <>
                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.industry_development.sectors_title')}</p>
                              <p className="mb-2 text-gray-600">{t('analysis.tooltips.industry_development.sectors_desc')}</p>

                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.industry_development.sub_title')}</p>
                              <p className="mb-2 text-gray-600">{t('analysis.tooltips.industry_development.sub_desc')}</p>

                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.industry_development.trends_title')}</p>
                              <p className="text-gray-600">{t('analysis.tooltips.industry_development.trends_desc')}</p>
                            </>
                          )}

                          {category === 'irsc' && (
                            <>
                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.smart_enterprise_rating.us_tickers_title')}</p>
                              <p className="mb-2 text-gray-600 whitespace-pre-line">{t('analysis.tooltips.smart_enterprise_rating.us_tickers_desc')}</p>

                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.smart_enterprise_rating.tw_tickers_title')}</p>
                              <p className="mb-2 text-gray-600 whitespace-pre-line">{t('analysis.tooltips.smart_enterprise_rating.tw_tickers_desc')}</p>

                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.smart_enterprise_rating.fuzzy_title')}</p>
                              <p className="mb-2 text-gray-600">{t('analysis.tooltips.smart_enterprise_rating.fuzzy_desc')}</p>

                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.smart_enterprise_rating.analyst_view_title')}</p>
                              <p className="text-gray-600">{t('analysis.tooltips.smart_enterprise_rating.analyst_view_desc')}</p>
                            </>
                          )}

                          {category === 'financial_product_rating' && (
                            <>
                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.financial_product_rating.etf_title')}</p>
                              <p className="mb-2 text-gray-600 whitespace-pre-line">{t('analysis.tooltips.financial_product_rating.etf_desc')}</p>

                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.financial_product_rating.mutual_funds_title')}</p>
                              <p className="mb-2 text-gray-600">{t('analysis.tooltips.financial_product_rating.mutual_funds_desc')}</p>

                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.financial_product_rating.bonds_title')}</p>
                              <p className="mb-2 text-gray-600">{t('analysis.tooltips.financial_product_rating.bonds_desc')}</p>

                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.financial_product_rating.derivatives_title')}</p>
                              <p className="mb-2 text-gray-600">{t('analysis.tooltips.financial_product_rating.derivatives_desc')}</p>

                              <p className="font-semibold text-gray-700">{t('analysis.tooltips.financial_product_rating.analyst_view_title')}</p>
                              <p className="text-gray-600">{t('analysis.tooltips.financial_product_rating.analyst_view_desc')}</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    aria-label={t('analysis.keyword')}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={t('analysis.enter_keyword')}
                    className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all relative z-10"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100">
              {/* Info: (20260120 - Luphia) Left Side: Summary Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                {/* Info: (20260120 - Luphia) Period Display */}
                {(periodType === 'yearly' || selectedPeriodValue !== '') && (
                  <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg border border-orange-100">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <div className="flex flex-col">
                      <span className="text-xs text-orange-600 font-medium leading-none mb-0.5">{t('analysis.period')}</span>
                      <span className="text-sm font-bold text-orange-900 leading-none">{simplePeriodString}</span>
                    </div>
                  </div>
                )}

                {/* Info: (20260120 - Luphia) Cost Display */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <Coins className="h-4 w-4 text-gray-500" />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium leading-none mb-0.5">{t('analysis.confirm_cost')}</span>
                    <span className="text-sm font-bold text-gray-900 leading-none">{calculatedCost}</span>
                  </div>
                </div>
              </div>

              {/* Info: (20260120 - Luphia) Right Side: Action */}
              <button
                onClick={handleGenerate}
                disabled={
                  (periodType !== 'yearly' && !selectedPeriodValue) ||
                  (activeTab === 'external' && !isExternalCarbonAnalysis && !selectedCountry) ||
                  (activeTab === 'external' && !isExternalCarbonAnalysis && category !== 'market_trends' && !keyword.trim()) ||
                  (needsCompanyInput && !selectedCompany)
                }
                className="w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed rounded-lg bg-orange-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 transition-colors"
              >
                {t('analysis.generate')}
              </button>
            </div>

            {/* Info: (20260120 - Luphia) Placeholder for results */}
            <div className="pt-8 text-center text-gray-500 flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-gray-100 rounded-lg">
              <FileBarChart className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm">{t('features.items.analysis.desc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info: (20260120 - Luphia) Payment Confirmation Modal */}
      <PaymentConfirmModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          if (workflowStatus === 'error' || workflowStatus === 'payment_success') {
            resetTransaction();
            setIsPaymentModalOpen(false);
          } else if (workflowStatus === 'idle') {
            setIsPaymentModalOpen(false);
          }
        }}
        onConfirm={handleAnalysisWorkflow}
        cost={calculatedCost}
        items={[
          { label: t('analysis.category'), value: t(`analysis.categories.${category}`) },
          ...(country ? [{ label: t('analysis.country'), value: t(`analysis.countries.${country}`) }] : []),
          ...(derivedKeyword ? [{ label: t('analysis.keyword'), value: derivedKeyword }] : []),
          {
            label: t('analysis.period'), value: t('analysis.selected_period_desc', {
              value: periodType === 'yearly' ? selectedYear : selectedPeriodValue,
              type: t(`analysis.time_units.${periodType}`)
            })
          }
        ]}
        isLoading={isLoading}
        status={workflowStatus}
        errorMessage={errorMessage}
        txHash={txHash}
      />

      {/* Info: (20260130 - Luphia) Success Notification */}
      <SuccessNotification
        show={showSuccessNotification}
        title={t('analysis.success.title')}
        message={(
          <div className="flex flex-col gap-2">
            <span>{t('analysis.success.message')}</span>
            {txHash && (
              <a
                href={`${process.env.NEXT_PUBLIC_BAIFA_EXPLORER || 'https://baifa.io'}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 underline text-xs break-all"
              >
                {t('analysis.success.view_tx')}: {txHash}
              </a>
            )}
          </div>
        )}
        onClose={() => setShowSuccessNotification(false)}
        autoCloseDelay={10000}
      />

      {/* Info: (20260120 - Luphia) History Section */}
      {activeTab === 'history' && (
        <HistorySection />
      )}

      {/* Info: (20260409 - Luphia) Tax ID Edit Modal */}
      <Dialog open={isTaxIdModalOpen} onClose={() => !isUpdatingTaxId && setIsTaxIdModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {t('account_book_selection.form_enterprise_id') || '統一編號 (Tax ID)'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {t('analysis.company_input.missing_tax_id_desc', { name: pendingAccountBook?.name || '' })}
              </p>
              <div className="space-y-4">
                <div>
                  <input
                    id="taxIdInput"
                    name="taxIdInput"
                    aria-label="Tax ID"
                    type="text"
                    value={taxIdInput}
                    onChange={(e) => setTaxIdInput(e.target.value)}
                    placeholder="12345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-gray-900 bg-white"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsTaxIdModalOpen(false)}
                    disabled={isUpdatingTaxId}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!taxIdInput) return;
                      setIsUpdatingTaxId(true);
                      try {
                        const res = await request(`/api/v1/user/account_book/${pendingAccountBook?.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ enterpriseId: taxIdInput }),
                        });
                        if (res) {
                          setAccountBooks(prev => prev.map(ab => ab.id === pendingAccountBook?.id ? { ...ab, enterpriseId: taxIdInput } : ab));
                          setSelectedCompany({ taxId: taxIdInput, name: pendingAccountBook!.name });
                          setInternalCompanyName(`${pendingAccountBook!.name} (${taxIdInput})`);
                          setIsTaxIdModalOpen(false);
                          setTaxIdInput('');
                        }
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsUpdatingTaxId(false);
                      }
                    }}
                    disabled={isUpdatingTaxId || !taxIdInput}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
                  >
                    {isUpdatingTaxId ? t('common.loading') : (t('common.confirm') || '確認')}
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
