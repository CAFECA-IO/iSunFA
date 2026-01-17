'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth_context';
import { useTranslation } from '@/i18n/i18n_context';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  CreditCard
} from 'lucide-react';

type TimeRange = '24h' | '7d' | '30d' | '3m' | '1y';

export default function Dashboard() {
  const { loading } = useAuth();
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  // Info: (20260117 - Luphia) Mock Data for different time ranges
  const MOCK_DATA = {
    '24h': { revenue: 1200, expenses: 400, profit: 800, revenueTrend: 2.5, expensesTrend: -1.2, profitTrend: 4.8 },
    '7d': { revenue: 15400, expenses: 8200, profit: 7200, revenueTrend: 12.4, expensesTrend: 5.1, profitTrend: 18.2 },
    '30d': { revenue: 120400, expenses: 84200, profit: 36200, revenueTrend: 12.0, expensesTrend: 4.0, profitTrend: 24.0 },
    '3m': { revenue: 380000, expenses: 240000, profit: 140000, revenueTrend: 8.5, expensesTrend: 2.5, profitTrend: 15.0 },
    '1y': { revenue: 1520000, expenses: 980000, profit: 540000, revenueTrend: 22.0, expensesTrend: 12.0, profitTrend: 35.0 },
  };

  const currentData = MOCK_DATA[timeRange];
  const timeRanges: TimeRange[] = ['24h', '7d', '30d', '3m', '1y'];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Info: (20260117 - Luphia) Header - Time Range Selector Only */}
      <div className="flex justify-end mb-8">
        <div className="flex items-center gap-1 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${timeRange === range
                  ? 'bg-gray-900 text-white shadow-md transform scale-105'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {t(`dashboard.time_ranges.${range}` as any)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Info: (20260117 - Luphia) Available Funds Hero Card */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-10 text-white shadow-2xl ring-1 ring-white/10">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div>
              <div className="flex items-center gap-3 text-gray-300 mb-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-lg tracking-wide">{t('dashboard.available_funds')}</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold tracking-tighter mb-4 text-white drop-shadow-sm">
                $1,250,420<span className="text-3xl md:text-4xl text-gray-400 font-normal">.00</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium">
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full ring-1 ring-emerald-500/20 backdrop-blur-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12.5%</span>
                </div>
                <span className="text-gray-400">{t('dashboard.vs_last_month')}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md transition-all text-sm font-semibold border border-white/10 hover:border-white/20">
                Add Funds
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-xl text-white transition-all text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5">
                Transfer
              </button>
            </div>
          </div>

          {/* Info: (20260117 - Luphia) Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] -translate-y-24 translate-x-24 pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px] translate-y-24 -translate-x-24 pointer-events-none mix-blend-screen" />
        </div>

        {/* Info: (20260117 - Luphia) Stats Grid */}

        {/* Info: (20260117 - Luphia) Revenue */}
        <div className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-gray-50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="w-7 h-7 text-gray-700" />
            </div>
            <span className={`flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${currentData.revenueTrend >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
              {currentData.revenueTrend >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1.5" /> : <ArrowDownRight className="w-4 h-4 mr-1.5" />}
              {Math.abs(currentData.revenueTrend)}%
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">{t('dashboard.revenue')}</h3>
          <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">${currentData.revenue.toLocaleString()}</p>
        </div>

        {/* Info: (20260117 - Luphia) Expenses */}
        <div className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-gray-50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <CreditCard className="w-7 h-7 text-gray-700" />
            </div>
            <span className={`flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${currentData.expensesTrend <= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
              {currentData.expensesTrend <= 0 ? <ArrowDownRight className="w-4 h-4 mr-1.5" /> : <ArrowUpRight className="w-4 h-4 mr-1.5" />}
              {Math.abs(currentData.expensesTrend)}%
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">{t('dashboard.expenses')}</h3>
          <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">${currentData.expenses.toLocaleString()}</p>
        </div>

        {/* Info: (20260117 - Luphia) Net Profit */}
        <div className="group bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-gray-50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <PieChart className="w-7 h-7 text-gray-700" />
            </div>
            <span className={`flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${currentData.profitTrend >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
              {currentData.profitTrend >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1.5" /> : <ArrowDownRight className="w-4 h-4 mr-1.5" />}
              {Math.abs(currentData.profitTrend)}%
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">{t('dashboard.net_profit')}</h3>
          <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">${currentData.profit.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
