import { useTranslation } from '@/i18n/i18n_context';
import { Globe, Leaf } from 'lucide-react';
import { GasType } from '@/hooks/use_dashboard_data';

interface IGHGEmissionsCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentData: any;
  gasType: GasType;
  setGasType: (type: GasType) => void;
}

export const GHGEmissionsCard = ({ currentData, gasType, setGasType }: IGHGEmissionsCardProps) => {
  const { t } = useTranslation();
  const isEco = currentData.metrics.isTop10Percent;

  return (
    <div className={`
      col-span-1 md:col-span-2 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col transition-colors duration-500
      ${isEco ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-gray-200'}
    `}>
      {/* Info: (20260118 - Luphia) Decorative Watermark */}
      {isEco && (
        <Leaf className="absolute -top-10 -right-10 w-64 h-64 text-emerald-100/50 pointer-events-none -rotate-12" />
      )}

      <div className="relative z-10 p-6 flex flex-col gap-6 h-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isEco ? 'bg-emerald-100' : 'bg-emerald-50'}`}>
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">{t('dashboard.ghg_emissions')}</h3>
          </div>

          {/* Info: (20260118 - Luphia) Gas Type Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(['co2', 'ch4', 'n2o', 'f_gases'] as const).map((gas) => (
              <button
                key={gas}
                onClick={() => setGasType(gas)}
                className={`
                        px-3 py-1 text-[10px] font-bold rounded-md transition-all
                        ${gasType === gas ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}
                      `}
              >
                {t(`dashboard.gas_types.${gas}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Info: (20260118 - Luphia) Metrics Panel - Full Width */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center flex-1">
          {/* Info: (20260118 - Luphia) Left Side: Summary & Scopes */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Info: (20260118 - Luphia) Total Emissions Highlight */}
              <div className="col-span-2 bg-gray-50 rounded-lg border border-gray-100 relative overflow-hidden h-32">
                {/* Info: (20260118 - Luphia) Chart Background */}
                <div className="absolute bottom-0 left-0 right-0 h-[60%] z-0 opacity-40 pointer-events-none flex items-end">
                  {(() => {
                    const data = currentData.ghgData;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const maxVal = Math.max(...data.map((d: any) => d.total));

                    return (
                      <svg width="100%" height="100%" preserveAspectRatio="none">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {data.map((d: any, i: number) => {
                          const count = data.length;
                          const barGap = 30; // Info: (20260118 - Luphia) Increased gap
                          const slotWidth = 100 / count;
                          const barWidth = slotWidth * (1 - barGap / 100);
                          const x = i * slotWidth + (slotWidth - barWidth) / 2;

                          // Info: (20260118 - Luphia) Scale values to percentage of height
                          const h1 = (d.scope1 / maxVal) * 100;
                          const h2 = (d.scope2 / maxVal) * 100;
                          const h3 = (d.scope3 / maxVal) * 100;

                          // Info: (20260118 - Luphia) Stack from bottom up
                          const y1 = 100 - h1;
                          const y2 = y1 - h2;
                          const y3 = y2 - h3;

                          return (
                            <g key={i}>
                              {/* Info: (20260118 - Luphia) Scope 3 (Top) */}
                              <rect
                                x={`${x}%`}
                                y={`${y3}%`}
                                width={`${barWidth}%`}
                                height={`${h3}%`}
                                fill="#fef08a"
                                rx="2"
                              />
                              {/* Info: (20260118 - Luphia) Scope 2 (Middle) */}
                              <rect
                                x={`${x}%`}
                                y={`${y2}%`}
                                width={`${barWidth}%`}
                                height={`${h2}%`}
                                fill="#fed7aa"
                              />
                              {/* Info: (20260118 - Luphia) Scope 1 (Bottom) */}
                              <rect
                                x={`${x}%`}
                                y={`${y1}%`}
                                width={`${barWidth}%`}
                                height={`${h1}%`}
                                fill="#fecaca"
                                rx="2"
                              />
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>

                <div className="relative z-10 p-4">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">{t('dashboard.total_emissions')}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">{currentData.metrics.carbonTotal}</p>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{currentData.metrics.carbonTrend}</span>
                  </div>
                </div>
              </div>

              {/* Info: (20260118 - Luphia) Scopes Grid - Compact */}
              <div className="col-span-2 grid grid-cols-3 gap-2">
                {/* Info: (20260118 - Luphia) Scope 1 */}
                <div className="bg-red-50/50 rounded-lg p-2 border border-red-50 text-center">
                  <p className="text-[10px] text-gray-500 font-medium mb-1">{t('dashboard.scope_1')}</p>
                  <p className="text-sm font-bold text-gray-900">{currentData.metrics.scope1Current}</p>
                  <span className={`text-[10px] font-bold ${currentData.metrics.scope1TrendVal > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {currentData.metrics.scope1Trend}
                  </span>
                </div>

                {/* Info: (20260118 - Luphia) Scope 2 */}
                <div className="bg-orange-50/50 rounded-lg p-2 border border-orange-50 text-center">
                  <p className="text-[10px] text-gray-500 font-medium mb-1">{t('dashboard.scope_2')}</p>
                  <p className="text-sm font-bold text-gray-900">{currentData.metrics.scope2Current}</p>
                  <span className={`text-[10px] font-bold ${currentData.metrics.scope2TrendVal > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {currentData.metrics.scope2Trend}
                  </span>
                </div>

                {/* Info: (20260118 - Luphia) Scope 3 */}
                <div className="bg-orange-50/30 rounded-lg p-2 border border-orange-50 text-center">
                  <p className="text-[10px] text-gray-500 font-medium mb-1">{t('dashboard.scope_3')}</p>
                  <p className="text-sm font-bold text-gray-900">{currentData.metrics.scope3Current}</p>
                  <span className={`text-[10px] font-bold ${currentData.metrics.scope3TrendVal > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {currentData.metrics.scope3Trend}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info: (20260118 - Luphia) Right Side: Goal Achievement */}
          <div className="space-y-6 lg:pl-8 lg:border-l border-gray-100">

            {/* Info: (20260118 - Luphia) Emissions per Revenue */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-gray-900">{t('dashboard.emissions_per_revenue')}</p>
              </div>
              <div>
                <span className="text-3xl font-bold text-gray-900">{currentData.metrics.emissionsIntensity}</span>
                <span className="text-3xl font-bold text-gray-900">{currentData.metrics.emissionsIntensity}</span>
                <span className="text-xs text-gray-400 ml-1">
                  {gasType === 'co2' ? 'tCO2e' :
                    gasType === 'ch4' ? 'kgCH4e' :
                      gasType === 'n2o' ? 'kgN2Oe' : 'kgCO2e'} / $1k Revenue
                </span>
              </div>

            </div>

            {/* Info: (20260118 - Luphia) Reduction Goal */}
            <div className="space-y-3 pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-gray-900">{t('dashboard.goal_achievement')}</p>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {t(`dashboard.goal_status.${currentData.metrics.goalStatus}` as any)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-500">Progress</span>
                  <span className="font-bold text-gray-900">{currentData.metrics.goalProgress}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${currentData.metrics.goalProgress}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 text-right">Target: {currentData.metrics.goalTarget}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
