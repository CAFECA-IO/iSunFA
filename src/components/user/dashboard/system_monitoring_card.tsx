import { useTranslation } from '@/i18n/i18n_context';
import {
  FileCheck,
  AlertTriangle,
  Activity,
  CheckCircle,
  XCircle,
  Server,
  FileClock,
  FileText
} from 'lucide-react';

interface ISystemMonitoringCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentData: any;
}

export const SystemMonitoringCard = ({ currentData }: ISystemMonitoringCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="col-span-1 md:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg"><Activity className="w-5 h-5 text-indigo-600" /></div>
          <h4 className="text-sm font-bold text-gray-900">{t('dashboard.system_monitoring')}</h4>
        </div>
        <button className="text-xs font-bold text-indigo-700 hover:underline">Review</button>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2">
        {/* Info: (20260118 - Luphia) Section 1: Anomalies */}
        <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-gray-700">{t('dashboard.anomalies')}</span>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-3 w-3 mr-1 items-center justify-center">
                {currentData.metrics.anomaliesCritical > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${currentData.metrics.anomaliesCritical > 0 ? 'bg-red-500' : 'bg-gray-300'}`}></span>
              </span>
              <span className={`text-sm font-bold ${currentData.metrics.anomaliesCritical > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {currentData.metrics.anomaliesCritical}
              </span>
              <span className="text-[10px] text-gray-500">{t('dashboard.anomalies_critical')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-3 w-3 mr-1 items-center justify-center">
                {currentData.metrics.anomaliesWarning > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${currentData.metrics.anomaliesWarning > 0 ? 'bg-orange-500' : 'bg-gray-300'}`}></span>
              </span>
              <span className={`text-sm font-bold ${currentData.metrics.anomaliesWarning > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {currentData.metrics.anomaliesWarning}
              </span>
              <span className="text-[10px] text-gray-500">{t('dashboard.anomalies_warning')}</span>
            </div>
          </div>
        </div>

        {/* Info: (20260118 - Luphia) Section 2: Financial Health */}
        <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-50">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-gray-700">{t('dashboard.financial_health')}</span>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-gray-900">{currentData.metrics.healthCompliant}</span>
              <span className="text-[10px] text-gray-500">{t('dashboard.health_compliant')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-gray-900">{currentData.metrics.healthNonCompliant}</span>
              <span className="text-[10px] text-gray-500">{t('dashboard.health_non_compliant')}</span>
            </div>
          </div>
        </div>

        {/* Info: (20260118 - Luphia) Section 3: Pending & Applying */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2">
              <FileClock className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-gray-600">{t('dashboard.pending_approval')}</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{currentData.metrics.pendingCount}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-600">{t('dashboard.applying')}</span>
            </div>
            <span className="text-lg font-bold text-gray-900">{currentData.metrics.applyingCount}</span>
          </div>
        </div>

        {/* Info: (20260118 - Luphia) Section 4: System Integration */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('dashboard.system_integration')}</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {(currentData.metrics.systems || []).map((sys: { key: string; status: string }) => (
              <div key={sys.key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-xs font-bold text-gray-700">{t(`dashboard.systems.${sys.key}`)}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${sys.status === 'connected' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <span className={`text-xs font-medium ${sys.status === 'connected' ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {t(`dashboard.status_${sys.status}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
