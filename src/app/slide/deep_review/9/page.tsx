'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  ArrowUpRight,
  Activity,
  Bell,
  Target,
  Zap,
  Tag,
  Briefcase,
  Users,
  Trophy,
  TrendingUp
} from 'lucide-react';

// Info: (20260131 - Luphia) Mock Data for Fund Flows (Subscription vs Redemption)
const FLOW_DATA = [
  { date: '1/25', sub: 1.2, red: -0.4 },
  { date: '1/26', sub: 0.8, red: -0.6 },
  { date: '1/27', sub: 1.5, red: -0.3 },
  { date: '1/28', sub: 2.1, red: -0.5 },
  { date: '1/29', sub: 1.8, red: -0.2 },
];

// Info: (20260131 - Luphia) Mock Data for Strategy Execution
const STRATEGY_LOG = [
  { date: '2026/01/28', action: '板塊輪動 (Sector Rotation)', detail: '減碼車用晶片 (5%)；增持邊緣運算 AI (5%)', type: 'rebalance' },
  { date: '2026/01/25', action: '流動性管理 (Liquidity)', detail: '因應贖回需求，提升現金部位至 4%', type: 'liquidity' },
];

const IMPACT_TAGS = [
  { tag: '#CES2026', score: 8.5, impact: 'positive', desc: 'AI Agent 產品優於預期' },
  { tag: '#地緣政治', score: -4.2, impact: 'negative', desc: '先進製程出口管制趨嚴' },
  { tag: '#殖利率曲線', score: 1.5, impact: 'neutral', desc: '美債 10Y 殖利率持穩，有利成長股' },
];

// Info: (20260131 - Luphia) Competitor Data
const COMPETITORS = [
  { name: '永豐領航科技', ticker: '00662', returnYTD: '+12.5%', fee: '0.75%', sharpe: '1.84', alpha: '+2.15', highlight: true },
  { name: '統一全球 AI', ticker: 'Benchmark A', returnYTD: '+8.2%', fee: '1.20%', sharpe: '1.45', alpha: '+0.85', highlight: false },
  { name: '安聯 AI 人工智慧', ticker: 'Benchmark B', returnYTD: '+9.8%', fee: '1.50%', sharpe: '1.62', alpha: '+1.20', highlight: false },
];

export default function DeepReviewSlide9() {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
      {/* Info: (20260131 - Luphia) Container */}
      <div className="w-[1280px] h-[720px] bg-white relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-gray-200">

        {/* Info: (20260131 - Luphia) Background Gradients */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl pointer-events-none" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[70rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20"
            style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} />
        </div>

        {/* Info: (20260131 - Luphia) Header */}
        <div className="absolute top-12 left-16 z-20">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            DeepReview <span className="text-orange-600">競品分析</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-4 rounded-full"></div>
        </div>

        {/* Info: (20260131 - Luphia) Browser Mockup Window */}
        <div className="z-10 mt-16 w-[1000px] h-[500px] bg-slate-50 rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transform transition-transform hover:scale-[1.005] duration-500">

          {/* Info: (20260131 - Luphia) Toolbar */}
          <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-2 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="ml-4 flex-1 bg-slate-100 h-7 rounded-md border border-slate-200 flex items-center justify-between px-3 text-xs text-gray-400 font-medium">
              <span>https://isunfa.com/fund/00662/dashboard</span>
              <Bell size={12} className="text-gray-400" />
            </div>
          </div>

          {/* Info: (20260131 - Luphia) Dashboard Content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Info: (20260131 - Luphia) 1. Top Info Bar */}
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Active Fund</span>
                  <h3 className="text-xl font-bold text-gray-900">永豐領航科技基金</h3>
                  <span className="text-gray-400 text-sm font-mono">(00662)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users size={12} />
                    經理人: <span className="font-bold text-gray-700">Sarah Chen</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Briefcase size={12} />
                    基金規模 (AUM): <span className="font-bold text-gray-900 text-sm">$52.4B TWD</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 font-mono">52.34</div>
                <div className="flex items-center gap-1 text-green-600 font-bold text-xs justify-end">
                  <ArrowUpRight size={14} />
                  <span>+1.2% Today</span>
                </div>
              </div>
            </div>

            {/* Info: (20260131 - Luphia) 2. Main Grid */}
            <div className="grid grid-cols-12 gap-4 mb-4">

              {/* Info: (20260131 - Luphia) Left: Fund Flows (Bar Chart) - Col 7 */}
              <div className="col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={12} /> 申購 / 贖回 (十億 TWD)
                  </div>
                  <div className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold">淨流入: +14 億</div>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={FLOW_DATA} stackOffset="sign">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="sub" name="申購" fill="#10b981" barSize={20} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="red" name="贖回" fill="#ef4444" barSize={20} radius={[0, 0, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Info: (20260131 - Luphia) Right: Competitor Analysis Table (Replacing Quant Metrics) - Col 5 */}
              <div className="col-span-5 bg-white rounded-xl border border-slate-200 p-0 shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Trophy size={12} /> 競品比較 (Competitor Analysis)
                  </div>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white text-[10px] text-gray-400 border-b border-gray-100">
                        <th className="py-2 pl-3 font-medium">基金項目</th>
                        <th className="py-2 px-1 font-medium text-right">YTD</th>
                        <th className="py-2 px-1 font-medium text-right">Sharp</th>
                        <th className="py-2 pr-3 font-medium text-right">費用</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPETITORS.map((comp, i) => (
                        <tr key={i} className={`text-xs border-b border-slate-50 last:border-0 ${comp.highlight ? 'bg-orange-50/50' : 'hover:bg-slate-50'}`}>
                          <td className="py-2 pl-3">
                            <div className={`font-bold ${comp.highlight ? 'text-orange-900' : 'text-gray-900'}`}>{comp.name}</div>
                            <div className="text-[9px] text-gray-400 font-mono scale-90 origin-left">{comp.ticker}</div>
                          </td>
                          <td className={`py-2 px-1 text-right font-bold ${comp.highlight ? 'text-orange-600' : 'text-green-600'}`}>{comp.returnYTD}</td>
                          <td className={`py-2 px-1 text-right font-mono ${comp.highlight ? 'text-orange-600 font-bold' : 'text-gray-600'}`}>{comp.sharpe}</td>
                          <td className="py-2 pr-3 text-right text-gray-500 font-mono">{comp.fee}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-2 bg-yellow-50 border-t border-yellow-100 text-[10px] text-yellow-800 flex items-start gap-1.5">
                  <TrendingUp size={10} className="mt-0.5 flex-shrink-0" />
                  <span>本基金 Alpha ({COMPETITORS[0].alpha}) 顯著優於競品平均，且費用率最低。</span>
                </div>
              </div>

            </div>

            {/* Info: (20260131 - Luphia) 3. Strategy & AI */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Info: (20260131 - Luphia) Strategy Log */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Target size={12} /> 執行策略 (Strategy)
                </div>
                <div className="space-y-3">
                  {STRATEGY_LOG.map((log, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="text-[10px] font-mono text-gray-400 mt-0.5">{log.date}</div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{log.action}</div>
                        <div className="text-xs text-gray-600 leading-tight mt-0.5">{log.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info: (20260131 - Luphia) AI Suggestions */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4 shadow-sm">
                <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap size={12} /> AI 決策建議
                </div>
                <div className="bg-white/60 p-3 rounded-lg border border-indigo-100 mb-2">
                  <div className="text-xs font-bold text-gray-900 mb-1">板塊權重調整建議</div>
                  <div className="text-xs text-gray-600 leading-relaxed">
                    建議 <span className="text-green-600 font-bold">增持邊緣運算 (Edge AI)</span> (+2%) 以捕捉 CES 需求。考量殖利率波動，建議透過期貨進行部分避險。
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20260131 - Luphia) 4. Impact Tags */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag size={12} /> 事件影響模擬 (Event Impact Simulator)
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {IMPACT_TAGS.map((item, i) => (
                  <div key={i} className="flex-shrink-0 bg-slate-50 border border-slate-100 rounded-lg p-3 min-w-[200px]">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-bold text-slate-700">{item.tag}</div>
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.impact === 'positive' ? 'bg-green-100 text-green-700' :
                        item.impact === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        Score: {item.score}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Info: (20260131 - Luphia) Footer */}
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
