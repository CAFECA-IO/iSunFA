import { Truck, Ship, Plane, MapPin, ArrowRight, Activity } from 'lucide-react';
import MapViewer, { IMapViewerRef } from '@/components/transportation_carbon_footprint_calculator/map_viewer';
import { ILogisticsPlan } from '@/interfaces/logistics';

export type RouteType = 'sea' | 'air' | 'land';

export interface ISegment {
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

interface IPlanSectionProps {
	type: RouteType;
	plan: ILogisticsPlan;
	weightKg: number | string;
	isExporting?: boolean;
	mapRef?: React.Ref<IMapViewerRef>;
}

interface ILegData {
	distanceKm?: number;
	co2eKg?: number;
	geometry?: GeoJSON.Geometry | null;
	isFallback?: boolean;
}

export function PlanSection({ type, plan, weightKg, isExporting = false, mapRef = null }: IPlanSectionProps) {
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

	const isSea = type === 'sea';
	const isAir = type === 'air';
	const isLand = type === 'land';
	const seaPlan = plan.comparisonData?.plans?.sea_multimodal;
	const airPlan = plan.comparisonData?.plans?.air_multimodal;
	const landPlan = plan.comparisonData?.plans?.landOnly;

	const segments: ISegment[] = [];
	const mapFeatures: GeoJSON.Feature[] = [];
	let totalCo2e = 0;
	let titleName = '';
	let themeColor = '';
	let themeBg = '';

	const addSegment = (mode: string, from: string, to: string, legData: ILegData, coefficient: number, coefficientSource: string, color: string) => {
		if (!legData) return;
		segments.push({
			mode, from, to,
			estimatedDist: legData.distanceKm,
			distUnit: 'KM',
			emissions: legData.co2eKg,
			emissionsUnit: 'kg CO₂e',
			coefficient,
			coefficientUnit: 'kg CO₂e / t-km',
			coefficientSource,
			geometry: legData.geometry,
			isFallback: legData.isFallback
		});
		if (legData.geometry) {
			mapFeatures.push({ type: 'Feature', properties: { color }, geometry: legData.geometry as GeoJSON.Geometry });
		}
	};

	if (isLand && landPlan?.success) {
		titleName = '純陸運專案';
		themeColor = 'text-orange-500';
		themeBg = 'bg-orange-100';
		totalCo2e = landPlan.co2eKg || 0;
		addSegment('land', '起點', '終點', landPlan, 0.11289, 'UK DEFRA 2025 (HGV)', '#F97316');
	} else if (isSea && seaPlan) {
		titleName = '海運專案';
		themeColor = 'text-emerald-500';
		themeBg = 'bg-emerald-100';
		totalCo2e = seaPlan.total_co2eKg || 0;
		const portOut = plan.exportPort?.name || '起運港口';
		const portIn = plan.importPort?.name || '目的港口';
		addSegment('land', '起點', portOut, seaPlan.land_origin_to_port, 0.11289, 'UK DEFRA 2025 (HGV)', '#F97316');
		addSegment('sea', portOut, portIn, seaPlan.sea_port_to_port, 0.01045, 'UK DEFRA 2025 (Container ship)', '#059669');
		addSegment('land', portIn, '終點', seaPlan.land_port_to_dest, 0.11289, 'UK DEFRA 2025 (HGV)', '#F97316');
	} else if (isAir && airPlan) {
		titleName = '空運專案';
		themeColor = 'text-blue-500';
		themeBg = 'bg-blue-100';
		totalCo2e = airPlan.total_co2eKg || 0;
		const airportOut = plan.exportAirport?.name || '起運機場';
		const airportIn = plan.importAirport?.name || '目的機場';
		addSegment('land', '起點', airportOut, airPlan.land_origin_to_airport, 0.11289, 'UK DEFRA 2025 (HGV)', '#F97316');
		addSegment('air', airportOut, airportIn, airPlan.air_airport_to_airport, 0.6023, 'UK DEFRA 2025 (Long-haul)', '#2563EB');
		addSegment('land', airportIn, '終點', airPlan.land_airport_to_dest, 0.11289, 'UK DEFRA 2025 (HGV)', '#F97316');
	}

	if (segments.length === 0) return null; // Info: (20260430 - Tzuhan) 未成功解析該方案或不支持

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
			{/* Info: (20260430 - Tzuhan) Left Column: Summary & Map & Coeffs */}
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
							ref={mapRef}
							routeGeojson={{
								type: 'FeatureCollection',
								features: mapFeatures.filter(f => f.geometry) as GeoJSON.Feature[]
							}}
							className="w-full h-full"
							interactive={false}
							fitBoundsPadding={40}
							showRouteMarkers={true}
							duration={isExporting ? 0 : 2500}
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent pointer-events-none"></div>
					</div>
				</div>

				{/* Info: (20260430 - Tzuhan) 碳排係數與公式揭露 */}
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

			{/* Info: (20260430 - Tzuhan) Right Column: Segments List */}
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

									{/* Info: (20260430 - Luphia) 移除了段落的 MapViewer 縮圖以避免 WebGL 上限導致的 Crash (Map Overload) */}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
