import { TrendingDown, TrendingUp, AlertTriangle, Filter, Bell } from 'lucide-react';

export default function DeepReviewSlide6() {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      {/* Info: (20260130 - Luphia) Container 1280x720 */}
      <div className="w-[1280px] h-[720px] bg-white relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-gray-200">
        {/* Info: (20260130 - Luphia) Background Gradients */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl pointer-events-none" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[70rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20"
            style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
        </div>

        {/* Info: (20260130 - Luphia) Header */}
        <div className="absolute top-12 left-16 z-20">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            DeepReview <span className="text-orange-600">商品管理</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-4 rounded-full"></div>
        </div>

        {/* Info: (20260130 - Luphia) Browser Window Mockup */}
        <div className="z-10 mt-16 w-[1000px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transform transition-transform hover:scale-[1.01] duration-500">
          {/* Info: (20260130 - Luphia) Browser Toolbar */}
          <div className="h-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 flex items-center px-4 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div>
            </div>
            <div className="ml-4 flex-1 bg-white h-7 rounded-md border border-gray-200 flex items-center px-3 text-xs text-gray-400 font-medium">
              https://isunfa.com/user/portfolio
            </div>
          </div>

          {/* Info: (20260130 - Luphia) App Content Mockup */}
          <div className="flex h-[450px]">
            {/* Info: (20260130 - Luphia) Left: Sidebar (Filters) */}
            <div className="w-64 border-r border-gray-100 p-4 bg-gray-50/50 flex flex-col">
              <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold text-sm">
                <Filter size={14} />
                議題篩選
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">正面影響 Positive</div>
                  <div className="flex items-center gap-2 p-2 bg-white border border-green-100 rounded-lg cursor-pointer hover:bg-green-50/50 transition-colors">
                    <div className="w-3 h-3 rounded border border-gray-300 bg-green-500"></div>
                    <span className="text-xs font-medium text-gray-700">#AI_革命</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">中性/關注 Neutral</div>
                  <div className="flex items-center gap-2 p-2 bg-white border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-50/50 transition-colors shadow-sm">
                    <div className="w-3 h-3 rounded border border-gray-300 bg-blue-500"></div>
                    <span className="text-xs font-medium text-gray-700">#鈣鈦礦光伏革命</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-50/50 transition-colors shadow-sm">
                    <div className="w-3 h-3 rounded border border-gray-300 bg-blue-500"></div>
                    <span className="text-xs font-medium text-gray-700">#半導體優勢</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-50/50 transition-colors shadow-sm">
                    <div className="w-3 h-3 rounded border border-gray-300 bg-blue-500"></div>
                    <span className="text-xs font-medium text-gray-700">#地緣政治</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">負面/風險 Negative</div>
                  <div className="flex items-center gap-2 p-2 bg-white border border-red-100 rounded-lg cursor-pointer hover:bg-red-50/50 transition-colors shadow-sm ring-1 ring-orange-200">
                    <div className="w-3 h-3 rounded border border-gray-300 bg-orange-500"></div>
                    <span className="text-xs font-medium text-gray-700">#白銀通膨</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white border border-red-100 rounded-lg cursor-pointer hover:bg-red-50/50 transition-colors shadow-sm ring-1 ring-orange-200">
                    <div className="w-3 h-3 rounded border border-gray-300 bg-orange-500"></div>
                    <span className="text-xs font-medium text-gray-700">#科技泡沫</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20260130 - Luphia) Right: Main Content */}
            <div className="flex-1 bg-white flex flex-col overflow-hidden">
              {/* Info: (20260130 - Luphia) Toolbar / Period Switcher */}
              <div className="h-12 border-b border-gray-100 flex items-center justify-between px-6">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  {['日報', '週報', '月報', '季報', '年報'].map((period) => (
                    <button
                      key={period}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${period === '月報'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-gray-400 font-mono">
                  System Date: 2026.01.29
                </div>
              </div>

              {/* Info: (20260130 - Luphia) Product List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                {/* Info: (20260130 - Luphia) Group 1: 豊存股 (Sorted: NVDA first) */}
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                    豐存股 (Stock Savings)
                  </h3>
                  <div className="space-y-2">
                    <ProductRow
                      name="NVDA"
                      value="192.51"
                      change="+0.9%"
                      positiveTags={['#AI_龍頭']}
                      negativeTags={['#科技泡沫', '#白銀通膨']}
                      neutralTags={['#鈣鈦礦光伏革命']}
                      alertLevel="critical"
                      alertMessage="High Risk: Tech Bubble & Silver"
                    />
                    <ProductRow
                      name="元大台灣50 (0050)"
                      value="73.75"
                      change="+13.64%"
                      positiveTags={[]}
                      negativeTags={[]}
                      neutralTags={['#半導體優勢']}
                    />
                    <ProductRow
                      name="Vanguard 全球股票 ETF (VT)"
                      value="145.36"
                      change="+2.29%"
                      positiveTags={['#全球分散']}
                      negativeTags={['#通膨']}
                      neutralTags={[]}
                    />
                  </div>
                </div>

                {/* Info: (20260130 - Luphia) Group 2: 基金投資 (Sorted: Tech Fund first) */}
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    基金投資 (Fund Investment)
                  </h3>
                  <div className="space-y-2">
                    <ProductRow
                      name="永豐領航科技基金"
                      value="109.20"
                      change="-3.2%"
                      positiveTags={['#創新科技']}
                      negativeTags={['#科技波動']}
                      neutralTags={['#鈣鈦礦光伏革命']}
                      alertLevel="warning"
                      alertMessage="Monitor: Volatility"
                    />
                    <ProductRow
                      name="永豐新興市場企業債券基金"
                      value="10.36"
                      change="-1.1%"
                      positiveTags={['#高票息']}
                      negativeTags={['#匯率風險']}
                      neutralTags={[]}
                    />
                    <ProductRow
                      name="永豐永豐基金"
                      value="113.77"
                      change="+2.44%"
                      positiveTags={['#穩健收益']}
                      negativeTags={[]}
                      neutralTags={[]}
                    />
                  </div>
                </div>

                {/* Info: (20260130 - Luphia) Group 3: 智能理財 (No alerts, default order) */}
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-teal-500 rounded-full"></span>
                    智能理財 (Robo-Advisor)
                  </h3>
                  <div className="space-y-2">
                    <ProductRow
                      name="Vanguard 整體股市 ETF (VTI)"
                      value="342.29"
                      change="+1.44%"
                      positiveTags={['#美國成長']}
                      negativeTags={[]}
                      neutralTags={[]}
                    />
                    <ProductRow
                      name="Vanguard 開發市場股 ETF (VEA)"
                      value="66.34"
                      change="+5.06%"
                      positiveTags={[]}
                      negativeTags={['#歐洲放緩']}
                      neutralTags={[]}
                    />
                    <ProductRow
                      name="iShares 短期國債 ETF (SHV)"
                      value="110.41"
                      change="+0.3%"
                      positiveTags={['#避險資產']}
                      negativeTags={[]}
                      neutralTags={[]}
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Info: (20260130 - Luphia) Footer */}
        <div className="absolute bottom-4 w-full px-16 flex justify-between text-gray-400 text-xs tracking-widest uppercase font-medium">
          <div>Confidential</div>
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
            2026 CAFECA Fintech
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductRow({
  name,
  value,
  change,
  positiveTags,
  negativeTags,
  neutralTags,
  alertLevel,
  alertMessage
}: {
  name: string;
  value: string;
  change: string;
  positiveTags: string[];
  negativeTags: string[];
  neutralTags: string[];
  alertLevel?: 'warning' | 'critical';
  alertMessage?: string;
}) {
  const isPositive = change.startsWith('+');
  const isCritical = alertLevel === 'critical';
  const isWarning = alertLevel === 'warning';

  return (
    <div className={`
            flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md
            ${isCritical ? 'bg-red-50 border-red-200 shadow-sm ring-1 ring-red-100' : ''}
            ${isWarning ? 'bg-orange-50 border-orange-200' : ''}
            ${!alertLevel ? 'bg-white border-gray-100 hover:border-gray-300' : ''}
        `}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold text-gray-800">{name}</div>
          {isCritical && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold border border-red-200 animate-pulse">
              <AlertTriangle size={10} />
              {alertMessage || 'ACTION REQUIRED'}
            </div>
          )}
          {isWarning && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[9px] font-bold border border-orange-200">
              <Bell size={10} />
              {alertMessage || 'Monitor'}
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-1.5 flex-wrap">
          {/* Info: (20260130 - Luphia) Tags */}
          {neutralTags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">
              {tag}
            </span>
          ))}
          {positiveTags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">
              {tag}
            </span>
          ))}
          {negativeTags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-mono font-bold text-gray-900">${value}</div>
        <div className={`text-xs font-bold flex items-center justify-end gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {change}
        </div>
      </div>
    </div>
  )
}
