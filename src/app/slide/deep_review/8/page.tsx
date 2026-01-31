'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Mic,
  Vote,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Cpu,
  Zap,
  Pause,
  ThumbsUp,
  ThumbsDown,
  Minus
} from 'lucide-react';

// Info: (20260130 - Luphia) Types
type MemberObj = {
  id: string;
  name: string;
  role: string;
  type: 'ai' | 'human';
  avatarSrc?: string; // Info: (20260130 - Luphia) for humans
  icon?: React.ReactNode; // Info: (20260130 - Luphia) for AI
  color: string;
  status: 'listening' | 'speaking' | 'thinking' | 'voting';
  vote?: 'approve' | 'reject' | 'abstain';
};

type AgendaItem = {
  id: string;
  title: string;
  status: 'done' | 'active' | 'pending';
  time: string;
};

type TranscriptItem = {
  id: string;
  speakerId: string;
  text: string;
  timestamp: string;
};

// Info: (20260130 - Luphia) Mock Data
const INITIAL_MEMBERS: MemberObj[] = [
  { id: 'system', name: 'Dr. Riska', role: 'Risk Engine', type: 'ai', icon: <Cpu size={18} className="text-white" />, color: 'bg-indigo-600', status: 'listening' },
  { id: 'sentiment', name: 'Sentiment Bot', role: 'Sentiment Analysis', type: 'ai', icon: <Zap size={18} className="text-white" />, color: 'bg-violet-500', status: 'listening' },
  { id: 'human1', name: 'David Chen', role: 'Analyst', type: 'human', avatarSrc: '/avatars/human1.png', color: 'bg-orange-500', status: 'listening' },
  { id: 'human2', name: 'Sarah Lin', role: 'Compliance', type: 'human', avatarSrc: '/avatars/human2.png', color: 'bg-slate-600', status: 'listening' },
  { id: 'human3', name: 'James Wu', role: 'Economist', type: 'human', avatarSrc: '/avatars/human3.png', color: 'bg-blue-600', status: 'listening' },
  { id: 'human4', name: 'Emily Chang', role: 'Tech', type: 'human', avatarSrc: '/avatars/human4.png', color: 'bg-cyan-500', status: 'speaking' },
  { id: 'human5', name: 'Michael Wang', role: 'ESG', type: 'human', avatarSrc: '/avatars/human5.png', color: 'bg-emerald-500', status: 'listening' },
];

const AGENDA: AgendaItem[] = [
  { id: '1', title: '週度績效回顧 (Weekly Performance Review)', status: 'done', time: '10:00 - 10:15' },
  { id: '2', title: '半導體產業風險評估 (Semiconductor Risk Assessment)', status: 'active', time: '10:15 - 10:45' },
  { id: '3', title: '投資組合再平衡表決 (Rebalance Voting)', status: 'pending', time: '10:45 - 11:00' },
];

const MOCK_TRANSCRIPT: TranscriptItem[] = [
  { id: '1', speakerId: 'system', text: '偵測到半導體板塊波動率上升 15%，建議檢視持倉風險。', timestamp: '10:15:02' },
  { id: '2', speakerId: 'human1', text: '雖然波動增加，但主要來自短期財報影響，基本面需求依然強勁。', timestamp: '10:15:45' },
  { id: '3', speakerId: 'human3', text: '同意 David。宏觀來看，降息預期將支撐成長股估值。', timestamp: '10:16:10' },
  { id: '4', speakerId: 'system', text: '風險提示：技術面指標顯示 RSI 過熱，回調機率 65%。', timestamp: '10:16:30' },
  { id: '5', speakerId: 'human4', text: '我們的技術團隊觀察到雲端資本支出並未放緩，這是長期利多。', timestamp: '10:17:05' },
];

export default function DeepReviewSlide8() {
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [transcript] = useState(MOCK_TRANSCRIPT);
  const [isVoting, setIsVoting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Info: (20260130 - Luphia) Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Info: (20260130 - Luphia) Simulate Live Transcript
  useEffect(() => {
    const interval = setInterval(() => {
      // Info: (20260130 - Luphia) Toggle speaking status randomly for demo
      setMembers(prev => prev.map(m => ({
        ...m,
        status: Math.random() > 0.8 ? 'speaking' : 'listening'
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleVote = () => {
    setIsVoting(true);
    // Info: (20260130 - Luphia) Simulate random votes
    const votes: ('approve' | 'reject' | 'abstain')[] = ['approve', 'approve', 'approve', 'reject', 'approve', 'abstain', 'approve'];
    setMembers(prev => prev.map((m, i) => ({ ...m, status: 'voting', vote: votes[i] })));
  };

  const handleSpeak = () => {
    setIsRecording(!isRecording);
  };

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
            DeepReview <span className="text-orange-600">策略會議</span>
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-amber-400 mt-4 rounded-full"></div>
        </div>

        {/* Info: (20260130 - Luphia) Browser Window Mockup */}
        <div className="z-10 mt-14 md:mt-16 w-full md:w-[1000px] h-full md:h-[500px] bg-white md:rounded-xl shadow-none md:shadow-2xl border-0 md:border border-gray-200 overflow-hidden flex flex-col transform transition-transform md:hover:scale-[1.005] duration-500">

          {/* Info: (20260130 - Luphia) Browser Toolbar (Desktop Only) */}
          <div className="h-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 hidden md:flex items-center px-4 gap-2 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div>
            </div>
            <div className="ml-4 flex-1 bg-white h-7 rounded-md border border-gray-200 flex items-center justify-between px-3 text-xs text-gray-400 font-medium">
              <span>https://isunfa.com/meeting/strategy/live</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  <span className="text-[10px] font-bold">LIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info: (20260130 - Luphia) Inner Content Layout (3-Column) */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

            {/* Info: (20260130 - Luphia) Left Sidebar: Participants & Agenda (Mobile: Top/Collapsed) */}
            <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col order-1 flex-shrink-0">
              {/* Info: (20260130 - Luphia) Participants */}
              <div className="p-3 md:p-4 border-b border-slate-100 flex-none bg-slate-50/50">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-3 flex items-center justify-between">
                  <span>Participants</span>
                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{members.length}</span>
                </div>
                {/* Info: (20260130 - Luphia) Horizontal Scroll on Mobile */}
                <div className="flex md:flex-wrap gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                  {members.map(member => (
                    <div key={member.id} className="group relative flex-shrink-0">
                      <div className={`relative w-[40px] h-[40px] md:w-[46px] md:h-[46px] rounded-full flex items-center justify-center shadow-sm overflow-hidden transition-transform ${member.type === 'human' ? 'hover:scale-105' : ''} ${member.color} ${member.status === 'speaking' ? 'ring-2 ring-green-400 ring-offset-2' : ''}`}>
                        {member.type === 'ai' ? member.icon : (
                          <Image src={member.avatarSrc!} alt={member.name} fill className="object-cover" />
                        )}
                        {member.status === 'speaking' && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-10"></div>
                        )}
                      </div>

                      {/* Info: (20260130 - Luphia) Tooltip Name (Visible on Hover) */}
                      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap z-20 pointer-events-none hidden md:block">
                        <div className="font-bold">{member.name}</div>
                        <div className="font-light text-slate-300">{member.role}</div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-4 border-transparent border-t-slate-800"></div>
                      </div>

                      {/* Info: (20260130 - Luphia) Vote Result */}
                      {isVoting && member.vote && (
                        <div className={`absolute -right-1 -top-1 p-1 rounded-full shadow-md z-30 ${member.vote === 'approve' ? 'bg-green-100 text-green-600' :
                          member.vote === 'reject' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {member.vote === 'approve' && <ThumbsUp size={10} />}
                          {member.vote === 'reject' && <ThumbsDown size={10} />}
                          {member.vote === 'abstain' && <Minus size={10} />}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Info: (20260130 - Luphia) Agenda - Hidden on small mobile? Or compact */}
              <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-200 hidden md:block flex-1 overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Agenda</div>
                <div className="space-y-0.5 relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200 -z-10"></div>
                  {AGENDA.map((item) => (
                    <div key={item.id} className={`flex gap-3 p-2 rounded-lg transition-colors ${item.status === 'active' ? 'bg-white shadow-sm border border-slate-200' : ''}`}>
                      <div className="mt-1">
                        {item.status === 'done' ? <CheckCircle2 size={16} className="text-green-500 bg-white" /> :
                          item.status === 'active' ? <Clock size={16} className="text-orange-500 bg-white" /> :
                            <Circle size={16} className="text-slate-300 bg-slate-50" />}
                      </div>
                      <div>
                        <div className={`text-xs font-bold leading-tight ${item.status === 'active' ? 'text-slate-900' : 'text-slate-500'}`}>{item.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Info: (20260130 - Luphia) Center Content: Transcript & Controls */}
            <div className="flex-1 flex flex-col bg-slate-50 relative min-w-0 order-2 md:order-2 h-[500px] md:h-auto">
              {/* Info: (20260130 - Luphia) Topic Header */}
              <div className="sticky md:absolute top-0 md:top-4 left-0 md:left-6 z-10 w-full md:w-auto p-2 md:p-0 bg-slate-50/90 md:bg-transparent backdrop-blur md:backdrop-filter-none border-b md:border-none border-slate-200">
                <div className="flex items-center gap-2 bg-white/90 md:bg-white/90 backdrop-blur border border-slate-200 shadow-sm px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 w-fit mx-auto md:mx-0">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  <span className="truncate max-w-[200px] md:max-w-none">Topic: Semiconductor Risk</span>
                </div>
              </div>

              {/* Info: (20260130 - Luphia) Transcript */}
              <div className="flex-1 p-4 md:p-6 pt-2 md:pt-16 overflow-y-auto custom-scrollbar space-y-4">
                <div className="flex items-center justify-center mb-6 opacity-60 mt-4 md:mt-0">
                  <div className="px-3 py-1 bg-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase">Today 10:00 AM</div>
                </div>
                {transcript.map(msg => {
                  const speaker = members.find(m => m.id === msg.speakerId);
                  const isAI = speaker?.type === 'ai';
                  const isMe = false;
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex flex-col max-w-[85%] md:max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-700">{speaker?.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{msg.timestamp}</span>
                        </div>
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${isAI ? 'bg-indigo-50 border border-indigo-100 text-indigo-900' : 'bg-white border border-slate-100 text-slate-800'}`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={transcriptEndRef} />
              </div>

              {/* Info: (20260130 - Luphia) Bottom Controls */}
              <div className="h-16 md:h-16 bg-white border-t border-slate-200 px-4 md:px-6 flex items-center justify-center gap-4 flex-shrink-0 z-20">
                <button onClick={handleSpeak} className={`w-10 h-10 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>
                  {isRecording ? <Pause size={18} fill="currentColor" /> : <Mic size={18} />}
                </button>
                <button onClick={handleVote} className="h-10 md:h-10 px-6 md:px-6 bg-slate-900 text-white rounded-full font-bold text-xs md:text-xs shadow-lg flex items-center gap-2">
                  <Vote size={14} />
                  <span>Vote</span>
                </button>
              </div>
            </div>

            {/* Info: (20260130 - Luphia) Right Sidebar: AI Summary (Mobile: Bottom) */}
            <div className="w-full md:w-72 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col p-4 md:p-6 order-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 md:mb-6">AI Insights</div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4 shadow-sm mb-4 md:mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-white rounded-lg text-orange-600 shadow-sm"><MessageSquare size={16} /></div>
                  <div className="text-xs font-bold text-orange-800 uppercase tracking-wider">Summary</div>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed font-medium">
                  目前討論集中於 <span className="text-orange-700 border-b border-orange-200 font-bold">短期財報波動</span> 與 <span className="text-orange-700 border-b border-orange-200 font-bold">長期雲端需求</span> 的背離。
                </div>
              </div>
              {/* Info: (20260130 - Luphia) Hide Metrics on mobile to save space? Or Keep */}
              <div className="space-y-4 block">
                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs font-medium text-slate-600">Sentiment</span><span className="text-xs font-bold text-green-600">Positive</span></div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-[70%]"></div></div>
                </div>

                <div className="p-3 border border-slate-100 rounded-xl bg-slate-50">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs font-medium text-slate-600">Consensus</span><span className="text-xs font-bold text-orange-600">Diverging</span></div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-orange-500 w-[45%]"></div></div>
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
