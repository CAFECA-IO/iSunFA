'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Cpu, Sparkles, MessageSquare, Zap } from 'lucide-react';

// Info: (20260130 - Luphia) Common Capability Full Mark
const FULL_MARK = 100;

// Info: (20260130 - Luphia) Data structure suitable for Recharts Radar
const CAPABILITY_DATA = [
  { subject: '風險控制', system: 95, sentiment: 85, human1: 60, human2: 90, human3: 50, human4: 40, human5: 70, fullMark: FULL_MARK },
  { subject: '數據邏輯', system: 90, sentiment: 95, human1: 70, human2: 80, human3: 60, human4: 50, human5: 65, fullMark: FULL_MARK },
  { subject: '技術洞察', system: 85, sentiment: 40, human1: 65, human2: 30, human3: 50, human4: 95, human5: 80, fullMark: FULL_MARK },
  { subject: '法規遵循', system: 88, sentiment: 60, human1: 60, human2: 95, human3: 70, human4: 40, human5: 50, fullMark: FULL_MARK },
  { subject: '策略佈局', system: 70, sentiment: 50, human1: 90, human2: 60, human3: 85, human4: 70, human5: 85, fullMark: FULL_MARK },
  { subject: '市場敏感', system: 65, sentiment: 90, human1: 95, human2: 40, human3: 90, human4: 80, human5: 60, fullMark: FULL_MARK },
  { subject: '宏觀分析', system: 60, sentiment: 80, human1: 92, human2: 50, human3: 95, human4: 60, human5: 75, fullMark: FULL_MARK },
  { subject: 'ESG', system: 75, sentiment: 70, human1: 85, human2: 70, human3: 60, human4: 50, human5: 98, fullMark: FULL_MARK },
];

const MEMBERS = [
  // Info: (20260130 - Luphia) AI Members
  {
    id: 'system',
    name: 'Dr. Riska (AI)',
    role: '首席風險控管引擎',
    avatar: <Cpu size={20} className="text-white" />,
    color: 'bg-indigo-600',
    dataKey: 'system',
    tags: ['#風險模型', '#數據異常', '#合規檢測'],
    recentComment: {
      target: 'NVDA',
      summary: '偵測到估值泡沫信號，建議列入觀察名單。',
      sentiment: 'negative'
    }
  },
  {
    id: 'sentiment',
    name: 'Sentiment Bot (AI)',
    role: '市場情緒分析引擎',
    avatar: <Zap size={20} className="text-white" />,
    color: 'bg-violet-500',
    dataKey: 'sentiment',
    tags: ['#輿情分析', '#恐慌指數', '#社群熱度'],
    recentComment: {
      target: 'Crypto Market',
      summary: '社群情緒指數飆升至貪婪區間，需警惕回調。',
      sentiment: 'negative'
    }
  },
  // Info: (20260130 - Luphia) Human Members
  {
    id: 'human1',
    name: 'David Chen',
    role: '資深市場分析師',
    avatar: <div className="relative w-full h-full overflow-hidden rounded-full"><Image src="/avatars/human1.png" alt="David Chen" fill className="object-cover" /></div>,
    color: 'bg-orange-500',
    dataKey: 'human1',
    tags: ['#半導體', '#宏觀經濟', '#地緣政治'],
    recentComment: {
      target: '0050.TW',
      summary: '看好半導體週期復甦，建議增持。',
      sentiment: 'positive'
    }
  },
  {
    id: 'human2',
    name: 'Sarah Lin',
    role: '合規長',
    avatar: <div className="relative w-full h-full overflow-hidden rounded-full"><Image src="/avatars/human2.png" alt="Sarah Lin" fill className="object-cover" /></div>,
    color: 'bg-slate-600',
    dataKey: 'human2',
    tags: ['#法規變動', '#內控稽核', '#風險揭露'],
    recentComment: {
      target: 'High Yield Bonds',
      summary: '需重新檢視發行方信評變動，確保合規。',
      sentiment: 'negative'
    }
  },
  {
    id: 'human3',
    name: 'James Wu',
    role: '宏觀經濟學家',
    avatar: <div className="relative w-full h-full overflow-hidden rounded-full"><Image src="/avatars/human3.png" alt="James Wu" fill className="object-cover" /></div>,
    color: 'bg-blue-600',
    dataKey: 'human3',
    tags: ['#利率政策', '#匯率走勢', '#全球貿易'],
    recentComment: {
      target: 'US Treasury',
      summary: '預期降息循環啟動，有利長債佈局。',
      sentiment: 'positive'
    }
  },
  {
    id: 'human4',
    name: 'Emily Chang',
    role: '科技產業顧問',
    avatar: <div className="relative w-full h-full overflow-hidden rounded-full"><Image src="/avatars/human4.png" alt="Emily Chang" fill className="object-cover" /></div>,
    color: 'bg-cyan-500',
    dataKey: 'human4',
    tags: ['#AI應用', '#雲端運算', '#資安防護'],
    recentComment: {
      target: 'Cloud Sector',
      summary: '企業資本支出持續強勁，產業前景樂觀。',
      sentiment: 'positive'
    }
  },
  {
    id: 'human5',
    name: 'Michael Wang',
    role: 'ESG 策略長',
    avatar: <div className="relative w-full h-full overflow-hidden rounded-full"><Image src="/avatars/human5.png" alt="Michael Wang" fill className="object-cover" /></div>,
    color: 'bg-emerald-500',
    dataKey: 'human5',
    tags: ['#綠色金融', '#碳中和', '#公司治理'],
    recentComment: {
      target: 'Oil & Gas',
      summary: '轉型壓力增大，長期評價面臨下修風險。',
      sentiment: 'negative'
    }
  }
];

export default function DeepReviewSlide7() {
  const [selectedMemberId, setSelectedMemberId] = useState('system');
  const selectedMember = MEMBERS.find(m => m.id === selectedMemberId) || MEMBERS[0];

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
            DeepReview <span className="text-orange-600">委員設定</span>
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
              https://isunfa.com/admin/committee
            </div>
          </div>

          {/* Info: (20260130 - Luphia) App Content */}
          <div className="flex h-[450px]">
            {/* Info: (20260130 - Luphia) Left: Member List */}
            <div className="w-64 border-r border-gray-100 p-4 bg-gray-50/50 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Committee Members</div>
              {MEMBERS.map(member => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${selectedMemberId === member.id
                    ? 'bg-white shadow-md border border-orange-100 ring-1 ring-orange-200'
                    : 'hover:bg-gray-100 border border-transparent'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                    {member.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">{member.name}</div>
                    <div className="text-[9px] text-gray-500 truncate">{member.role}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Info: (20260130 - Luphia) Right: Main Detail */}
            <div className="flex-1 p-8 bg-white flex gap-8">
              {/* Info: (20260130 - Luphia) Detail Column 1: Radar Chart */}
              <div className="w-1/2 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg ${selectedMember.color}`}>
                    {selectedMember.avatar}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 leading-none">{selectedMember.name}</h3>
                    <p className="text-sm font-bold text-gray-500 mt-1">{selectedMember.role}</p>
                  </div>
                </div>

                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={CAPABILITY_DATA}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name={selectedMember.name}
                        dataKey={selectedMember.dataKey}
                        stroke={selectedMemberId.includes('system') || selectedMemberId === 'sentiment' ? '#4f46e5' : '#f97316'}
                        fill={selectedMemberId.includes('system') || selectedMemberId === 'sentiment' ? '#4f46e5' : '#f97316'}
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Info: (20260130 - Luphia) Detail Column 2: Stats & Comments */}
              <div className="w-1/2 space-y-6 pt-4">
                {/* Info: (20260130 - Luphia) Focus Issues */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Sparkles size={12} /> 關注議題 Focus Issues
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Info: (20260130 - Luphia) Recent Input */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-3">
                    <MessageSquare size={12} /> 近期參與商品管理發言
                  </div>
                  <div className="flex gap-3">
                    <div className={`w-1 rounded-full ${selectedMember.recentComment.sentiment === 'positive' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 mb-1">
                        {selectedMember.recentComment.target}
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${selectedMember.recentComment.sentiment === 'positive' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {selectedMember.recentComment.sentiment === 'positive' ? 'Positive' : 'Negative'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 leading-relaxed">
                        {selectedMember.recentComment.summary}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info: (20260130 - Luphia) Capability Summary Text */}
                <div className="text-xs text-gray-400 leading-relaxed italic border-t border-gray-100 pt-3">
                  * 該委員在 <span className="font-bold text-gray-600">
                    {selectedMember.dataKey === 'system' ? '風險控制與數據邏輯' :
                      selectedMember.dataKey === 'sentiment' ? '市場敏感與數據邏輯' :
                        selectedMember.dataKey === 'human1' ? '策略佈局與市場敏感' :
                          selectedMember.dataKey === 'human2' ? '法規遵循與風險控制' :
                            selectedMember.dataKey === 'human3' ? '宏觀分析與策略佈局' :
                              selectedMember.dataKey === 'human4' ? '技術洞察與產業分析' :
                                'ESG 與永續策略'}
                  </span> 方面表現卓越。
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
