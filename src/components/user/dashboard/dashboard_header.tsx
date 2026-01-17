import { useTranslation } from '@/i18n/i18n_context';
import { Switch } from '@headlessui/react';
import { Activity, RefreshCw } from 'lucide-react';
import { TimeUnit } from '@/hooks/use_dashboard_data';

interface IDashboardHeaderProps {
  timeUnit: TimeUnit;
  setTimeUnit: (unit: TimeUnit) => void;
  refresh: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (auto: boolean) => void;
  loading: boolean;
}

export const DashboardHeader = ({ timeUnit, setTimeUnit, refresh, autoRefresh, setAutoRefresh, loading }: IDashboardHeaderProps) => {
  const { t } = useTranslation();
  const timeUnits: TimeUnit[] = ['24h', '7d', '30d', '3m', '1y'];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      {/* Info: (20260118 - Luphia) Mobile Top Row: Title + Refresh Controls */}
      <div className="flex justify-between items-center w-full sm:w-auto">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-600" />
          {t('dashboard.title')}
        </h2>

        {/* Info: (20260118 - Luphia) Mobile Refresh Controls */}
        <div className="flex items-center gap-3 sm:hidden">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              className={`${autoRefresh ? 'bg-orange-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
            >
              <span className={`${autoRefresh ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </Switch>
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">{t('dashboard.auto_refresh')}</span>
          </div>
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.refresh') || 'Refresh'}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info: (20260118 - Luphia) Desktop Controls + Time Selector (Always visible, full width on mobile) */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {/* Info: (20260118 - Luphia) Desktop Refresh Controls */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              className={`${autoRefresh ? 'bg-orange-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
            >
              <span className={`${autoRefresh ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </Switch>
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">{t('dashboard.auto_refresh')}</span>
          </div>
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.refresh') || 'Refresh'}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="h-6 w-px bg-gray-300 mx-1" />
        </div>

        {/* Info: (20260118 - Luphia) Time Selector */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg shadow-sm overflow-x-auto max-w-full no-scrollbar flex-1 sm:flex-none justify-between sm:justify-start">
          {timeUnits.map((unit) => (
            <button
              key={unit}
              onClick={() => setTimeUnit(unit)}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap text-center ${timeUnit === unit ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              {t(`dashboard.time_units.${unit}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
