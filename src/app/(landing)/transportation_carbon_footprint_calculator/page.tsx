'use client';

import { useState, useRef } from 'react';
import Head from 'next/head';
import { Truck, Ship, Plane, MapPin, Leaf, ArrowRight, Loader2, Weight, Activity, Settings2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import MapViewer from '@/components/map_viewer';
import { calculateLogisticsPlan } from '@/lib/actions/route';
import { ILogisticsPlan } from '@/interfaces/logistics';
import { parseSmartInput } from '@/lib/actions/smart';
// import * as htmlToImage from 'html-to-image';
// import { jsPDF } from 'jspdf';


type RouteType = 'sea' | 'air' | 'land';

interface ISegment {
    mode: string;
    from: string;
    to: string;
    estimatedDist?: number;
    distUnit?: string;
    emissions?: number;
    emissionsUnit: string;
    coefficient: number;
    coefficientUnit: string;
    coefficientSource: string;
    geometry?: GeoJSON.Geometry | null;
    isFallback?: boolean;
}

export default function ReportPage() {
    const [aiInput, setAiInput] = useState('從新北五股工業區運送 5000 公斤的晶片到德國柏林的倉儲中心');
    const [weightKg, setWeightKg] = useState<number | ''>('');
    const [isParsing, setIsParsing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<ILogisticsPlan | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Info: (20260430 - Tzuhan) 手動參數
    const [showManual, setShowManual] = useState(false);
    const [origin, setOrigin] = useState<{ lat: number | '', lng: number | '' }>({ lat: '', lng: '' });
    const [dest, setDest] = useState<{ lat: number | '', lng: number | '' }>({ lat: '', lng: '' });

    const [selectedRoutes, setSelectedRoutes] = useState<Set<RouteType>>(new Set(['sea', 'air']));
    const reportRef = useRef<HTMLDivElement>(null);

    // Info: (20260430 - Tzuhan) AI 魔術解析
    const handleAiParse = async () => {
        if (!aiInput.trim()) return;
        setIsParsing(true);
        setError(null);
        try {
            const data = await parseSmartInput(aiInput);
            if (data.origin) setOrigin(data.origin);
            if (data.dest) setDest(data.dest);
            if (data.weightKg) setWeightKg(data.weightKg);
            setShowManual(true); // Info: (20260430 - Tzuhan) 解析完展開讓用戶確認
        } catch (err) {
            setError(err instanceof Error ? err.message : 'AI 解析失敗');
        } finally {
            setIsParsing(false);
        }
    };

    // Info: (20260430 - Tzuhan) 開始產生報告
    const calculateFootprint = async () => {
        if (origin.lat === '' || origin.lng === '' || dest.lat === '' || dest.lng === '' || weightKg === '') {
            setError('請先完成 AI 解析或手動輸入完整經緯度與重量參數。');
            return;
        }
        setLoading(true);
        setError(null);
        setPlan(null);

        try {
            const result = await calculateLogisticsPlan(
                Number(origin.lat), Number(origin.lng),
                Number(dest.lat), Number(dest.lng),
                Number(weightKg)
            );
            setPlan(result);

            // Info: (20260430 - Tzuhan) 如果成功，根據結果自動調整勾選狀態
            const newSelected = new Set<RouteType>(['sea', 'air']);
            if (isLandValid(result)) {
                newSelected.add('land');
            }
            setSelectedRoutes(newSelected);
        } catch (err) {
            setError(err instanceof Error ? err.message : '分析失敗');
        } finally {
            setLoading(false);
        }
    };

    const toggleRoute = (route: RouteType) => {
        const newSelected = new Set(selectedRoutes);
        if (newSelected.has(route)) {
            newSelected.delete(route);
        } else {
            newSelected.add(route);
        }
        setSelectedRoutes(newSelected);
    };

    // const handleDownloadPDF = async () => {
    //     if (!reportRef.current) return;
    //     try {
    //         // Info: (20260430 - Tzuhan) 小提示：等待 500ms 確保所有地圖都已經飛梭完成再截圖
    //         await new Promise(resolve => setTimeout(resolve, 500));
    //         const imgData = await htmlToImage.toPng(reportRef.current, {
    //             quality: 1,
    //             backgroundColor: '#ffffff',
    //             pixelRatio: 2
    //         });

    //         const pdf = new jsPDF('p', 'mm', 'a4');
    //         const pdfWidth = pdf.internal.pageSize.getWidth();
    //         const elWidth = reportRef.current.offsetWidth;
    //         const elHeight = reportRef.current.offsetHeight;
    //         const pdfHeight = (elHeight * pdfWidth) / elWidth;

    //         pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    //         pdf.save('iSunFA_Logistics_Carbon_Report.pdf');
    //     } catch (err) {
    //         console.error("Failed to generate PDF", err);
    //         alert("生成 PDF 失敗，錯誤訊息：" + (err instanceof Error ? err.message : '未知錯誤'));
    //     }
    // };

    const getModeIcon = (mode: string) => {
        switch (mode) {
            case 'land': return <Truck className="w-5 h-5 text-orange-600" />;
            case 'sea': return <Ship className="w-5 h-5 text-emerald-600" />;
            case 'air': return <Plane className="w-5 h-5 text-blue-600" />;
            default: return <MapPin className="w-5 h-5 text-gray-400" />;
        }
    };

    const getModeName = (mode: string) => {
        switch (mode) {
            case 'land': return '純陸運';
            case 'sea': return '海運';
            case 'air': return '空運';
            default: return mode;
        }
    };

    const renderPlanSection = (type: RouteType) => {
        if (!plan) return null;

        const isSea = type === 'sea';
        const isAir = type === 'air';
        const isLand = type === 'land';
        const seaPlan = plan.comparisonData.plans.sea_multimodal;
        const airPlan = plan.comparisonData.plans.air_multimodal;
        const landPlan = plan.comparisonData.plans.landOnly;

        let segments: ISegment[] = [];
        let mapFeatures: GeoJSON.Feature[] = [];
        let totalCo2e = 0;
        let titleName = '';
        let themeColor = '';
        let themeBg = '';

        if (isLand && landPlan?.success) {
            titleName = '純陸運專案';
            themeColor = 'text-orange-500';
            themeBg = 'bg-orange-100';
            totalCo2e = landPlan.co2eKg || 0;
            segments = [
                {
                    mode: 'land', from: '起點', to: '終點',
                    estimatedDist: landPlan.distanceKm ?? landPlan.distanceNm, distUnit: landPlan.distanceNm !== undefined ? 'NM' : 'KM', emissions: landPlan.co2eKg,
                    emissionsUnit: 'kg CO₂e', coefficient: 0.11289, coefficientUnit: 'kg CO₂e / t-km',
                    coefficientSource: 'UK DEFRA 2025 (HGV)', geometry: landPlan.geometry,
                    isFallback: landPlan.isFallback
                }
            ];
            mapFeatures = [{ type: 'Feature', properties: { color: '#F97316' }, geometry: landPlan.geometry as GeoJSON.Geometry }];
        } else if (isSea) {
            titleName = '海運專案';
            themeColor = 'text-emerald-500';
            themeBg = 'bg-emerald-100';
            totalCo2e = seaPlan.total_co2eKg || 0;
            segments = [
                {
                    mode: 'land', from: '起點', to: plan.exportPort?.name || '起運港口',
                    estimatedDist: seaPlan.land_origin_to_port?.distanceKm ?? seaPlan.land_origin_to_port?.distanceNm, distUnit: seaPlan.land_origin_to_port?.distanceNm !== undefined ? 'NM' : 'KM', emissions: seaPlan.land_origin_to_port?.co2eKg,
                    emissionsUnit: 'kg CO₂e', coefficient: 0.11289, coefficientUnit: 'kg CO₂e / t-km',
                    coefficientSource: 'UK DEFRA 2025 (HGV)', geometry: seaPlan.land_origin_to_port?.geometry,
                    isFallback: seaPlan.land_origin_to_port?.isFallback
                },
                {
                    mode: 'sea', from: plan.exportPort?.name || '起運港口', to: plan.importPort?.name || '目的港口',
                    estimatedDist: seaPlan.sea_port_to_port?.distanceKm ?? seaPlan.sea_port_to_port?.distanceNm, distUnit: seaPlan.sea_port_to_port?.distanceNm !== undefined ? 'NM' : 'KM', emissions: seaPlan.sea_port_to_port?.co2eKg,
                    emissionsUnit: 'kg CO₂e', coefficient: 0.01045, coefficientUnit: 'kg CO₂e / t-km',
                    coefficientSource: 'UK DEFRA 2025 (Container ship)', geometry: seaPlan.sea_port_to_port?.geometry
                },
                {
                    mode: 'land', from: plan.importPort?.name || '目的港口', to: '終點',
                    estimatedDist: seaPlan.land_port_to_dest?.distanceKm ?? seaPlan.land_port_to_dest?.distanceNm, distUnit: seaPlan.land_port_to_dest?.distanceNm !== undefined ? 'NM' : 'KM', emissions: seaPlan.land_port_to_dest?.co2eKg,
                    emissionsUnit: 'kg CO₂e', coefficient: 0.11289, coefficientUnit: 'kg CO₂e / t-km',
                    coefficientSource: 'UK DEFRA 2025 (HGV)', geometry: seaPlan.land_port_to_dest?.geometry,
                    isFallback: seaPlan.land_port_to_dest?.isFallback
                }
            ];
            mapFeatures = [
                { type: 'Feature', properties: { color: '#F97316' }, geometry: seaPlan.land_origin_to_port?.geometry as GeoJSON.Geometry },
                { type: 'Feature', properties: { color: '#059669' }, geometry: seaPlan.sea_port_to_port?.geometry as GeoJSON.Geometry },
                { type: 'Feature', properties: { color: '#F97316' }, geometry: seaPlan.land_port_to_dest?.geometry as GeoJSON.Geometry },
            ];
        } else if (isAir) {
            titleName = '空運專案';
            themeColor = 'text-blue-500';
            themeBg = 'bg-blue-100';
            totalCo2e = airPlan.total_co2eKg || 0;
            segments = [
                {
                    mode: 'land', from: '起點', to: plan.exportAirport?.name || '起運機場',
                    estimatedDist: airPlan.land_origin_to_airport?.distanceKm ?? airPlan.land_origin_to_airport?.distanceNm, distUnit: airPlan.land_origin_to_airport?.distanceNm !== undefined ? 'NM' : 'KM', emissions: airPlan.land_origin_to_airport?.co2eKg,
                    emissionsUnit: 'kg CO₂e', coefficient: 0.11289, coefficientUnit: 'kg CO₂e / t-km',
                    coefficientSource: 'UK DEFRA 2025 (HGV)', geometry: airPlan.land_origin_to_airport?.geometry,
                    isFallback: airPlan.land_origin_to_airport?.isFallback
                },
                {
                    mode: 'air', from: plan.exportAirport?.name || '起運機場', to: plan.importAirport?.name || '目的機場',
                    estimatedDist: airPlan.air_airport_to_airport?.distanceKm ?? airPlan.air_airport_to_airport?.distanceNm, distUnit: airPlan.air_airport_to_airport?.distanceNm !== undefined ? 'NM' : 'KM', emissions: airPlan.air_airport_to_airport?.co2eKg,
                    emissionsUnit: 'kg CO₂e', coefficient: 0.6023, coefficientUnit: 'kg CO₂e / t-km',
                    coefficientSource: 'UK DEFRA 2025 (Long-haul)', geometry: airPlan.air_airport_to_airport?.geometry
                },
                {
                    mode: 'land', from: plan.importAirport?.name || '目的機場', to: '終點',
                    estimatedDist: airPlan.land_airport_to_dest?.distanceKm ?? airPlan.land_airport_to_dest?.distanceNm, distUnit: airPlan.land_airport_to_dest?.distanceNm !== undefined ? 'NM' : 'KM', emissions: airPlan.land_airport_to_dest?.co2eKg,
                    emissionsUnit: 'kg CO₂e', coefficient: 0.11289, coefficientUnit: 'kg CO₂e / t-km',
                    coefficientSource: 'UK DEFRA 2025 (HGV)', geometry: airPlan.land_airport_to_dest?.geometry,
                    isFallback: airPlan.land_airport_to_dest?.isFallback
                }
            ];
            mapFeatures = [
                { type: 'Feature', properties: { color: '#F97316' }, geometry: airPlan.land_origin_to_airport?.geometry as GeoJSON.Geometry },
                { type: 'Feature', properties: { color: '#2563EB' }, geometry: airPlan.air_airport_to_airport?.geometry as GeoJSON.Geometry },
                { type: 'Feature', properties: { color: '#F97316' }, geometry: airPlan.land_airport_to_dest?.geometry as GeoJSON.Geometry },
            ];
        }

        if (segments.length === 0) return null; // Info: (20260430 - Tzuhan) 未成功解析該方案或不支持

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                {/* Left Column: Summary & Map & Coeffs */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                        <div className={`absolute top-0 right-0 w-32 h-32 ${themeBg} rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:scale-110`}></div>
                        <h3 className="text-gray-500 text-sm font-semibold mb-2 relative z-10">{titleName}總碳排放量估算</h3>
                        <div className="flex items-end gap-2 relative z-10">
                            <span className="text-4xl md:text-5xl font-extrabold text-gray-900">{totalCo2e?.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                            <span className="text-gray-500 mb-1 font-medium">kg CO₂e</span>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center text-sm relative z-10">
                            <span className="text-gray-500 font-medium">總重量</span>
                            <span className="text-gray-900 font-bold">{(Number(weightKg) / 1000).toLocaleString()} 公噸</span>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-3xl p-2 overflow-hidden shadow-lg group">
                        <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                            <MapViewer
                                routeGeojson={{
                                    type: 'FeatureCollection',
                                    features: mapFeatures.filter(f => f.geometry) as GeoJSON.Feature[]
                                }}
                                className="w-full h-full"
                                interactive={false}
                                fitBoundsPadding={40}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent pointer-events-none"></div>
                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                                <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                                    <MapPin className="w-3 h-3 text-orange-600" />
                                    <span className="text-[10px] font-bold text-gray-800 truncate max-w-[80px]" title="起點">起點</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-white flex-shrink-0 mx-1 drop-shadow-md" />
                                <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                                    <MapPin className="w-3 h-3 text-rose-600" />
                                    <span className="text-[10px] font-bold text-gray-800 truncate max-w-[80px]" title="終點">終點</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 碳排係數與公式揭露 */}
                    <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-orange-500" /> 碳排係數與公式揭露
                        </h4>
                        <div className="text-xs text-gray-600 space-y-3">
                            <p className="bg-white px-3 py-2 rounded-lg border border-orange-100 font-mono">
                                公式: 總里程(km) × (重量(kg)/1000) × 碳排係數
                            </p>
                            <ul className="space-y-2">
                                <li className="flex justify-between items-center border-b border-orange-200/50 pb-1">
                                    <span className="flex items-center gap-1"><Ship className="w-3 h-3 text-emerald-600" />海運</span>
                                    <span className="font-medium">0.01045 <span className="text-[10px] text-gray-400">kg CO2e / t-km</span></span>
                                </li>
                                <li className="flex justify-between items-center border-b border-orange-200/50 pb-1">
                                    <span className="flex items-center gap-1"><Plane className="w-3 h-3 text-blue-600" />空運</span>
                                    <span className="font-medium">0.6023 <span className="text-[10px] text-gray-400">kg CO2e / t-km</span></span>
                                </li>
                                <li className="flex justify-between items-center">
                                    <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-orange-600" />陸運</span>
                                    <span className="font-medium">0.11289 <span className="text-[10px] text-gray-400">kg CO2e / t-km</span></span>
                                </li>
                            </ul>
                            <div className="text-[10px] text-gray-400 mt-2 text-right">
                                資料來源: UK DEFRA 2025
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Segments List */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 h-full shadow-lg">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <Activity className={`w-6 h-6 ${themeColor}`} />
                            {titleName}區段分析
                        </h3>

                        <div className="space-y-4 relative">
                            <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-gray-100 hidden md:block"></div>

                            {segments.map((seg, idx) => (
                                <div key={idx} className="relative flex flex-col md:flex-row gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                                    <div className="hidden md:flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-sm border border-gray-200 z-10 shrink-0">
                                        {getModeIcon(seg.mode)}
                                    </div>

                                    <div className="flex-1 bg-gray-50 md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border border-gray-200 md:border-transparent">
                                        <div className="flex items-center gap-2 mb-2 md:hidden">
                                            {getModeIcon(seg.mode)}
                                            <span className={`text-sm font-bold ${seg.mode === 'sea' ? 'text-emerald-600' : seg.mode === 'air' ? 'text-blue-600' : 'text-orange-600'}`}>
                                                {getModeName(seg.mode)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1 flex-1 overflow-hidden">
                                                <div className="flex items-center gap-2 text-gray-800 text-sm">
                                                    <span className="font-bold truncate max-w-[150px]">{seg.from}</span>
                                                    <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                                                    <span className="font-bold truncate max-w-[150px]">{seg.to}</span>
                                                </div>
                                                <div className="text-sm text-gray-500 font-medium flex flex-wrap items-center gap-1">
                                                    預估里程: <span className="text-gray-700">{seg.estimatedDist?.toLocaleString(undefined, { maximumFractionDigits: 1 })} {seg.distUnit || 'KM'}</span>
                                                    {seg.isFallback && (
                                                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200" title="OSRM 解析超時或支援度不足，目前採用「大圓距離 × 蜿蜒係數 (Tortuosity Factor)」做為里程估算依據">
                                                            ⚠️ 蜿蜒估算 (API Timeout)
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 font-medium mt-1">
                                                    排放係數: <span className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md text-xs">{seg.coefficient} {seg.coefficientUnit}</span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1 italic">
                                                    資料來源: {seg.coefficientSource}
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:items-end p-3 md:p-0 bg-white md:bg-transparent rounded-xl border md:border-none border-gray-200 shadow-sm md:shadow-none shrink-0">
                                                <span className="text-xs font-semibold text-gray-500 mb-1">碳排放量</span>
                                                <span className={`font-extrabold text-lg ${seg.mode === 'sea' ? 'text-emerald-600' : seg.mode === 'air' ? 'text-blue-600' : 'text-orange-600'}`}>
                                                    {seg.emissions?.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-medium text-gray-500">{seg.emissionsUnit}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Segment Map Thumbnail */}
                                        {seg.geometry && (
                                            <div className="mt-4 rounded-xl overflow-hidden aspect-[21/9] bg-gray-100 border border-gray-200 relative group pointer-events-none">
                                                <div className="absolute inset-0 z-0">
                                                    <MapViewer
                                                        routeGeojson={{ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { color: seg.mode === 'sea' ? '#059669' : seg.mode === 'air' ? '#2563EB' : '#F97316' }, geometry: seg.geometry as GeoJSON.Geometry }] }}
                                                        className="w-full h-full"
                                                        interactive={false}
                                                        hideLabel={true}
                                                        fitBoundsPadding={20}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Info: (20260430 - Tzuhan) 判斷是否真的有純陸運 (如果只是起終點直線 fallback，coordinates.length 會是 2，代表無真實陸地路徑)
    const isLandValid = (p: ILogisticsPlan) => {
        const land = p.comparisonData?.plans?.landOnly;
        if (!land?.success) return false;
        if (land.geometry?.type === 'LineString' && land.geometry.coordinates.length <= 2) {
            return false;
        }
        return true;
    };

    const isLandAvailable = plan ? isLandValid(plan) : true;
    const isLocked = loading; // Info: (20260430 - Tzuhan) 只有在「運算中」才反灰，算完後重新開放輸入以便用戶微調再算一次

    return (
        <main
            className="flex min-h-screen flex-col bg-white text-gray-900 font-sans selection:bg-orange-500/30 overflow-hidden relative isolate select-none"
            onContextMenu={(e) => e.preventDefault()}
        >
            <Head>
                <title>iSunFA ESG Logistics Static Report</title>
            </Head>
            {/* Watermark for confidentiality */}
            <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center opacity-[0.02] overflow-hidden mix-blend-multiply">
                <div className="transform -rotate-45 text-[10vw] md:text-[7vw] lg:text-[5vw] xl:text-[6rem] font-black tracking-widest text-gray-900 whitespace-nowrap">
                    iSunFA CONFIDENTIAL
                </div>
            </div>

            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none" aria-hidden="true">
                <div
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                    style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
                />
            </div>

            <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 md:py-24 space-y-12 z-10 relative">

                {/* User Requested Header Design */}
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

                <div ref={reportRef} className="bg-transparent -mx-2 md:mx-0">
                    <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-orange-500" /> 參數配置與分析控制
                            </h2>
                            {/* plan && (
                                <button
                                    onClick={handleDownloadPDF}
                                    className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-xl font-semibold transition-all shadow-md flex items-center gap-2 transform hover:-translate-y-0.5 text-sm"
                                >
                                    <Download className="w-4 h-4" /> 匯出報告
                                </button>
                            ) */}
                        </div>

                        <div className="space-y-6">
                            {/* 第一列：語意輸入框 */}
                            <div className="flex flex-col md:flex-row gap-4">
                                    <label className="flex flex-col gap-2">
                                        <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-orange-500" /> 運輸路線描述
                                        </div>
                                        <input
                                            type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)}
                                            placeholder="例如：從台北市運送貨物到美國紐約"
                                            aria-label="運輸路線描述"
                                            disabled={isLocked || isParsing}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-gray-900 shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                                        />
                                    </label>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleAiParse} disabled={isLocked || isParsing || !aiInput.trim()}
                                        className="w-full md:w-auto px-6 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                        智能解析
                                    </button>
                                </div>
                            </div>

                            {/* 折疊式手動參數確認 */}
                            <div className="bg-gray-50/50 rounded-2xl overflow-hidden transition-all border border-gray-100 mt-2">
                                <button
                                    onClick={() => setShowManual(!showManual)}
                                    className="w-full px-6 py-3.5 flex justify-between items-center hover:bg-orange-50/50 transition-colors text-sm font-semibold text-gray-600 group"
                                >
                                    <span className="flex items-center gap-2 group-hover:text-orange-600 transition-colors"><Settings2 className="w-4 h-4" /> 進階參數手動配置 (可選)</span>
                                    {showManual ? <ChevronUp className="w-4 h-4 group-hover:text-orange-600 transition-colors" /> : <ChevronDown className="w-4 h-4 group-hover:text-orange-600 transition-colors" />}
                                </button>

                                {showManual && (
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 border-t border-gray-200/60 bg-white/60 backdrop-blur-sm">
                                        <label className="flex flex-col gap-1.5 cursor-pointer">
                                            <span className="text-xs font-bold text-gray-500 tracking-wider">起點緯度</span>
                                            <input type="number" step="any" aria-label="起點緯度" value={origin.lat} onChange={e => setOrigin({ ...origin, lat: e.target.value ? parseFloat(e.target.value) : '' })} disabled={isLocked} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-gray-100/80 disabled:text-gray-400 transition-all shadow-sm" />
                                        </label>
                                        <label className="flex flex-col gap-1.5 cursor-pointer">
                                            <span className="text-xs font-bold text-gray-500 tracking-wider">起點經度</span>
                                            <input type="number" step="any" aria-label="起點經度" value={origin.lng} onChange={e => setOrigin({ ...origin, lng: e.target.value ? parseFloat(e.target.value) : '' })} disabled={isLocked} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-gray-100/80 disabled:text-gray-400 transition-all shadow-sm" />
                                        </label>
                                        <label className="flex flex-col gap-1.5 cursor-pointer">
                                            <span className="text-xs font-bold text-gray-500 tracking-wider">終點緯度</span>
                                            <input type="number" step="any" aria-label="終點緯度" value={dest.lat} onChange={e => setDest({ ...dest, lat: e.target.value ? parseFloat(e.target.value) : '' })} disabled={isLocked} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-gray-100/80 disabled:text-gray-400 transition-all shadow-sm" />
                                        </label>
                                        <label className="flex flex-col gap-1.5 cursor-pointer">
                                            <span className="text-xs font-bold text-gray-500 tracking-wider">終點經度</span>
                                            <input type="number" step="any" aria-label="終點經度" value={dest.lng} onChange={e => setDest({ ...dest, lng: e.target.value ? parseFloat(e.target.value) : '' })} disabled={isLocked} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-gray-100/80 disabled:text-gray-400 transition-all shadow-sm" />
                                        </label>
                                        <label className="flex flex-col gap-1.5 cursor-pointer">
                                            <span className="text-xs font-bold text-orange-600 flex items-center gap-1 tracking-wider"><Weight className="w-3 h-3" /> 總重 (KG)</span>
                                            <input type="number" step="any" aria-label="總重" value={weightKg} onChange={e => setWeightKg(e.target.value ? parseFloat(e.target.value) : '')} disabled={isLocked} className="w-full bg-white border border-orange-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-orange-50/50 disabled:text-gray-400 transition-all shadow-sm" />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Layer Controls & Action (Beautiful UI) */}
                        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-100">
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => toggleRoute('land')}
                                    disabled={!plan || loading || !isLandAvailable}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border 
                                        ${(!!plan && !isLandAvailable) ? 'bg-gray-50 border-gray-200 text-gray-400 line-through cursor-not-allowed' :
                                            (!plan || loading) ? 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed' :
                                                selectedRoutes.has('land') ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' :
                                                    'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <Truck className="w-4 h-4" /> 純陸運方案
                                </button>
                                <button
                                    onClick={() => toggleRoute('sea')}
                                    disabled={!plan || loading}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border 
                                        ${(!plan || loading) ? 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed' :
                                            selectedRoutes.has('sea') ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' :
                                                'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <Ship className="w-4 h-4" /> 海運多式聯運
                                </button>
                                <button
                                    onClick={() => toggleRoute('air')}
                                    disabled={!plan || loading}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border 
                                        ${(!plan || loading) ? 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed' :
                                            selectedRoutes.has('air') ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' :
                                                'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <Plane className="w-4 h-4" /> 空運多式聯運
                                </button>
                            </div>

                            <button
                                onClick={calculateFootprint} disabled={loading || (origin.lat === '')}
                                className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-md transform hover:-translate-y-0.5 w-full md:w-auto justify-center"
                            >
                                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> 運算中...</> : <><Activity className="w-5 h-5" /> 產生分析報告</>}
                            </button>
                        </div>

                        {error && <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">{error}</div>}
                    </div>

                    <div className="transition-all duration-500 ease-in-out">
                        {plan ? (
                            <div className="flex flex-col gap-8 pb-12">
                                {selectedRoutes.has('land') && isLandAvailable && renderPlanSection('land')}
                                {selectedRoutes.has('land') && isLandAvailable && (selectedRoutes.has('sea') || selectedRoutes.has('air')) && <div className="w-full border-b-2 border-dashed border-gray-200 my-4"></div>}

                                {selectedRoutes.has('sea') && renderPlanSection('sea')}
                                {selectedRoutes.has('sea') && selectedRoutes.has('air') && <div className="w-full border-b-2 border-dashed border-gray-200 my-4"></div>}

                                {selectedRoutes.has('air') && renderPlanSection('air')}
                            </div>
                        ) : (
                            <div className="mt-12 text-center py-24 bg-gray-50 rounded-3xl border border-gray-100 border-dashed">
                                <Leaf className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-gray-500 font-medium">請進行智能解析並產生分析報告</h3>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}