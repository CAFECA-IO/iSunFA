'use client';

import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { Truck, Ship, Plane, MapPin, Leaf, ArrowRight, Loader2, Weight, Activity } from 'lucide-react';

type Segment = { mode: string; from: string; to: string; estimatedKm: number; emissions: number; emissionsUnit: string; thumbnailUrl: string; coefficient: number; coefficientUnit: string; coefficientSource: string; };
type ResultType = { startPoint: string; endPoint: string; totalWeightTonnes: number; totalEmissions: number; thumbnailUrl: string; segments: Segment[]; };

export default function TransportationCalculatorPage() {
  const [text, setText] = useState('');
  const [weight, setWeight] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateFootprint = async () => {
    if (!text) {
      setError('請輸入運輸路線描述');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/transportation_carbon_footprint_calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, weight }),
      });

      if (!response.ok) {
        throw new Error('計算失敗，請稍後再試。');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'land': return <Truck className="w-5 h-5 text-orange-600" />;
      case 'sea': return <Ship className="w-5 h-5 text-blue-600" />;
      case 'air': return <Plane className="w-5 h-5 text-purple-600" />;
      default: return <MapPin className="w-5 h-5 text-gray-400" />;
    }
  };

  const getModeName = (mode: string) => {
    switch (mode) {
      case 'land': return '陸運';
      case 'sea': return '海運';
      case 'air': return '空運';
      default: return mode;
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-white text-gray-900 font-sans selection:bg-orange-500/30 overflow-hidden relative isolate">
      <Head>
        <title>Transportation Carbon Footprint Calculator | iSunFA</title>
      </Head>


      {/* Info: (20260428 - Luphia) Background Gradients from Homepage */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 md:py-24 space-y-12 z-10">
        {/* Info: (20260428 - Luphia) Header Section */}
        <div className="text-center space-y-4 pt-10">
          <div className="inline-flex items-center justify-center p-3 bg-orange-50 rounded-2xl mb-4 shadow-sm border border-orange-100">
            <Leaf className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-orange-700 via-orange-500 to-amber-400 drop-shadow-sm pb-2">
            物流碳足跡
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
            透過 AI 智能分析運輸路線，自動分割陸運、海運與空運路段，並依據 IPCC 基準估算各區段里程與碳排放量。
          </p>
        </div>

        {/* Info: (20260428 - Luphia) Input Section */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3 space-y-2">
              <label htmlFor="route-description" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                運輸路線描述
              </label>
              <input
                id="route-description"
                aria-label="運輸路線描述"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="例如：從台北市公司運送貨物到美國紐約曼哈頓"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-gray-900 placeholder-gray-400 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="route-weight" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Weight className="w-4 h-4 text-orange-500" />
                貨物重量 (公噸)
              </label>
              <input
                id="route-weight"
                aria-label="貨物重量"
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-gray-900 shadow-sm"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={calculateFootprint}
              disabled={loading}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  分析與計算中...
                </>
              ) : (
                <>
                  <Leaf className="w-5 h-5" />
                  開始計算
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info: (20260428 - Luphia) Results Section */}
        <div className="transition-all duration-500 ease-in-out">
          {result && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Info: (20260428 - Luphia) Left Column: Summary & Map */}
              <div className="lg:col-span-1 space-y-8">
                {/* Info: (20260428 - Luphia) Total Emissions Card */}
                <div className="bg-white border border-gray-200 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-orange-200/60"></div>
                  <h3 className="text-gray-500 text-sm font-semibold mb-2 relative z-10">總碳排放量估算</h3>
                  <div className="flex items-end gap-2 relative z-10">
                    <span className="text-5xl font-extrabold text-gray-900">{result.totalEmissions.toLocaleString()}</span>
                    <span className="text-gray-500 mb-1 font-medium">kg CO₂e</span>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center text-sm relative z-10">
                    <span className="text-gray-500 font-medium">總重量</span>
                    <span className="text-gray-900 font-bold">{result.totalWeightTonnes} 公噸</span>
                  </div>
                </div>

                {/* Info: (20260428 - Luphia) Map Thumbnail */}
                <div className="bg-white border border-gray-200 rounded-3xl p-2 overflow-hidden shadow-lg group">
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                    {result.thumbnailUrl.includes('openstreetmap.org') ? (
                      <iframe
                        src={result.thumbnailUrl}
                        className="w-full h-full border-0 transition-opacity duration-500"
                        title="Route Map"
                        scrolling="no"
                      />
                    ) : (
                      <Image
                        src={result.thumbnailUrl}
                        alt="Route Map"
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        unoptimized={result.thumbnailUrl.includes('placehold.co')}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                        <MapPin className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[100px]" title={result.startPoint}>{result.startPoint}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white flex-shrink-0 mx-1 drop-shadow-md" />
                      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                        <MapPin className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-bold text-gray-800 truncate max-w-[100px]" title={result.endPoint}>{result.endPoint}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info: (20260428 - Luphia) Right Column: Segments List */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 h-full shadow-lg">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <Activity className="w-6 h-6 text-orange-500" />
                    路線區段分析
                  </h3>

                  <div className="space-y-4 relative">
                    {/* Info: (20260428 - Luphia) Connecting Line */}
                    <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-gray-100 hidden md:block"></div>

                    {result.segments.map((seg: Segment, idx: number) => (
                      <div
                        key={idx}
                        className="relative flex flex-col md:flex-row gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                      >
                        {/* Info: (20260428 - Luphia) Icon Node */}
                        <div className="hidden md:flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-sm border border-gray-200 z-10 shrink-0">
                          {getModeIcon(seg.mode)}
                        </div>

                        {/* Info: (20260428 - Luphia) Content */}
                        <div className="flex-1 bg-gray-50 md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border border-gray-200 md:border-transparent">
                          <div className="flex items-center gap-2 mb-2 md:hidden">
                            {getModeIcon(seg.mode)}
                            <span className="text-sm font-bold text-orange-600">{getModeName(seg.mode)}</span>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-800">
                                <span className="font-bold">{seg.from}</span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <span className="font-bold">{seg.to}</span>
                              </div>
                              <div className="text-sm text-gray-500 font-medium">
                                預估里程: <span className="text-gray-700">{seg.estimatedKm.toLocaleString()} KM</span>
                              </div>
                              <div className="text-sm text-gray-500 font-medium mt-1">
                                排放係數: <span className="text-gray-700 bg-orange-100 px-2 py-0.5 rounded-md text-xs">{seg.coefficient} {seg.coefficientUnit}</span>
                              </div>
                              {seg.coefficientSource && (
                                <div className="text-xs text-gray-400 mt-1 italic">
                                  資料來源: {seg.coefficientSource}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col md:items-end p-3 md:p-0 bg-white md:bg-transparent rounded-xl border md:border-none border-gray-200 shadow-sm md:shadow-none">
                              <span className="text-xs font-semibold text-gray-500 mb-1">碳排放量</span>
                              <span className="font-extrabold text-orange-600 text-lg">
                                {seg.emissions.toLocaleString()} <span className="text-xs font-medium text-gray-500">{seg.emissionsUnit}</span>
                              </span>
                            </div>
                          </div>

                          {/* Info: (20260428 - Luphia) Segment Map Thumbnail */}
                          {seg.thumbnailUrl && (
                            <div className="mt-4 rounded-xl overflow-hidden aspect-[21/9] bg-gray-100 border border-gray-200 relative group">
                              {seg.thumbnailUrl.includes('openstreetmap.org') ? (
                                <iframe
                                  src={seg.thumbnailUrl}
                                  className="w-full h-full border-0 transition-opacity duration-500"
                                  title={`Route Map ${idx}`}
                                  scrolling="no"
                                />
                              ) : (
                                <Image
                                  src={seg.thumbnailUrl}
                                  alt={`Route Map ${idx}`}
                                  fill
                                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                                  unoptimized={seg.thumbnailUrl.includes('placehold.co')}
                                />
                              )}
                              <div className="absolute inset-0 pointer-events-none"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </main>
  );
}
