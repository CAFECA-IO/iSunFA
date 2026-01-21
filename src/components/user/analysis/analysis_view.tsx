'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import { Check, Calendar, Coins, FileBarChart, Globe } from 'lucide-react';
import { request } from '@/lib/utils/request';
import { useAuth } from '@/contexts/auth_context';
import { INTERNAL_CATEGORIES, EXTERNAL_CATEGORIES, COUNTRIES, PERIOD_TYPES, COST_PER_GENERATION, getPeriodDateRange } from '@/components/user/analysis/utils';
import PaymentConfirmModal from '@/components/common/payment_confirm_modal';
import HistorySection from '@/components/user/analysis/history_section';

export default function AnalysisView() {
  const { t } = useTranslation();
  const { refreshAuth } = useAuth();

  const [activeTab, setActiveTab] = useState<'internal' | 'external' | 'history'>('internal');
  const [category, setCategory] = useState<string>(INTERNAL_CATEGORIES[0]);
  const [periodType, setPeriodType] = useState<string>(PERIOD_TYPES[2]);

  const currentCategories = activeTab === 'internal' ? INTERNAL_CATEGORIES : EXTERNAL_CATEGORIES;

  // Info: (20260120 - Luphia) Reset category when tab changes
  useEffect(() => {
    setCategory(currentCategories[0]);
  }, [activeTab, currentCategories]);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedPeriodValue, setSelectedPeriodValue] = useState<string | number>('');

  // Info: (20260120 - Luphia) External Analysis States
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
                onClick={() => setSelectedPeriodValue(month)}
                className={`
                  h-10 text-sm font-medium rounded-lg transition-all border
                  ${selectedPeriodValue === month
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
    const periodVal = periodType === 'yearly' ? selectedYear : selectedPeriodValue;
    // Info: (20260120 - Luphia) For daily buttons, we might want to ensure selectedPeriodValue is set
    if (periodType === 'daily' && !periodVal) return '';

    const { start, end } = getPeriodDateRange(periodType, selectedYear, periodVal);
    if (!start || !end) return '';
    if (start === end) return start;
    return `${start} ~ ${end}`;
  })();

  // Info: (20260120 - Antigravity) Open Payment Modal instead of direct generate
  const handleGenerate = () => {
    setIsPaymentModalOpen(true);
  };

  const handleConfirmGenerate = async () => {
    try {
      setIsLoading(true);
      await request('/api/v1/user/analysis', {
        method: 'POST',
        body: JSON.stringify({
          category,
          periodType,
          year: selectedYear,
          periodValue: periodType === 'yearly' ? selectedYear : selectedPeriodValue,
        }),
      });
      // Info: (20260120 - Luphia) Refresh user balance
      await refreshAuth();
    } catch (error) {
      console.error('Analysis generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDaily = periodType === 'daily';

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
                  {PERIOD_TYPES.map((type) => (
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
              {activeTab === 'external' && (
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

              {/* Info: (20260120 - Luphia) External Analysis: Keyword Input (Move to after Category) */}
              {activeTab === 'external' && category !== 'market_trends' && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('analysis.keyword')}
                  </label>
                  <input
                    type="text"
                    aria-label={t('analysis.keyword')}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={t('analysis.enter_keyword')}
                    className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
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
                    <span className="text-sm font-bold text-gray-900 leading-none">{COST_PER_GENERATION}</span>
                  </div>
                </div>
              </div>

              {/* Info: (20260120 - Luphia) Right Side: Action */}
              <button
                onClick={handleGenerate}
                disabled={
                  (periodType !== 'yearly' && !selectedPeriodValue) ||
                  (activeTab === 'external' && !selectedCountry) ||
                  (activeTab === 'external' && category !== 'market_trends' && !keyword.trim())
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
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handleConfirmGenerate}
        cost={COST_PER_GENERATION}
        analysisType={t(`analysis.categories.${category}`)}
        period={simplePeriodString}
        country={activeTab === 'external' ? selectedCountry : undefined}
        keyword={activeTab === 'external' && category !== 'market_trends' ? keyword : undefined}
        isLoading={isLoading}
      />

      {/* Info: (20260120 - Luphia) History Section */}
      {activeTab === 'history' && (
        <HistorySection />
      )}
    </div>
  );
}
