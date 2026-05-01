'use client';

import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Truck, Ship, Plane, Leaf, Loader2, Weight, Activity, Settings2, ChevronDown, ChevronUp, Sparkles, Download, MapPin, ArrowRight } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ILogisticsPlan } from '@/interfaces/logistics';
import { request } from '@/lib/utils/request';
import { PlanSection, RouteType } from '@/components/transportation_carbon_footprint_calculator/plan_section';
import type { IMapViewerRef } from '@/components/transportation_carbon_footprint_calculator/map_viewer';
import { ReportLayout } from '@/components/common/report_layout';
import DataTable, { IDataTableColumn } from '@/components/common/data_table';
import { useAuth } from "@/contexts/auth_context";
import LoginButton from "@/components/common/login_button";
import PaymentConfirmModal from "@/components/common/payment_confirm_modal";
import { useOrderTransaction, IOrderPayload } from "@/hooks/use_order_transaction";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import { ORDER_TYPE } from "@/constants/status";
import { ANALYSIS_BASE_COSTS } from '@/constants/price';
import { useTranslation } from "@/i18n/i18n_context";

interface IHistoryItem {
	id: string;
	generatedAt: string;
	status: string;
	category: string;
	origin?: { lat: number | ''; lng: number | '' };
	dest?: { lat: number | ''; lng: number | '' };
	weightKg?: number;
}

export default function ReportPage() {
	const { t } = useTranslation();
	const [aiInput, setAiInput] = useState(t("transportation_carbon_footprint_calculator.default_ai_input"));
	const [weightKg, setWeightKg] = useState<number | ''>('');
	const [isParsing, setIsParsing] = useState(false);
	const [loading, setLoading] = useState(false);
	const [isExporting, setIsExporting] = useState(false); // Info: (20260501 - Luphia) PDF 匯出狀態
	const [plan, setPlan] = useState<ILogisticsPlan | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [history, setHistory] = useState<IHistoryItem[]>([]);


	const { user } = useAuth();
	const { workflowStatus, resetTransaction, executeOrderTransaction } = useOrderTransaction();
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

	// Info: (20260430 - Tzuhan) 手動參數
	const [showManual, setShowManual] = useState(false);
	const [origin, setOrigin] = useState<{ lat: number | '', lng: number | '' }>({ lat: '', lng: '' });
	const [dest, setDest] = useState<{ lat: number | '', lng: number | '' }>({ lat: '', lng: '' });

	const [selectedRoutes, setSelectedRoutes] = useState<Set<RouteType>>(new Set(['land', 'sea', 'air']));
	const reportRef = useRef<HTMLDivElement>(null);
	const scrollTargetRef = useRef<HTMLDivElement>(null);
	const historyTableRef = useRef<HTMLDivElement>(null);
	// Info: (20260501 - Luphia) 建立各區段地圖的 Ref 供截圖使用
	const mapRefs = {
		land: useRef<IMapViewerRef>(null),
		sea: useRef<IMapViewerRef>(null),
		air: useRef<IMapViewerRef>(null)
	};

	// Info: (20260501 - Luphia) Fetch History
	const fetchHistory = async () => {
		try {
			const res = await request<{ payload: IHistoryItem[] }>('/api/v1/user/analysis');
			if (res && res.payload) {
				const transportHistory = res.payload.filter(item => item.category === ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT);
				setHistory(transportHistory);
			}
		} catch (e) {
			console.error("Failed to fetch history", e);
		}
	};

	// Info: (20260501 - Luphia) Fetch history on mount and when polling stops
	useEffect(() => {
		if (user) fetchHistory();
	}, [user]);

	const hasExecuting = history.some(item => item.status?.toUpperCase() !== 'COMPLETED' && item.status?.toUpperCase() !== 'FAILED');

	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (hasExecuting) {
			interval = setInterval(() => {
				fetchHistory();
			}, 10000);
		}
		return () => clearInterval(interval);
	}, [hasExecuting]);

	const calculateFootprint = async () => {
		setAiInput('');
		setOrigin({ lat: '', lng: '' });
		setDest({ lat: '', lng: '' });
		setWeightKg('');
		setShowManual(false);
		setPlan(null);
		setError(null);

		await fetchHistory();

		setTimeout(() => {
			if (historyTableRef.current) {
				historyTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}, 100);
	};

	const handleOpenPayment = async () => {
		if (!user) return;

		let currentOrigin = { ...origin };
		let currentDest = { ...dest };
		let currentWeight = weightKg;

		const hasManualParams = currentOrigin.lat !== '' && currentOrigin.lng !== '' &&
			currentDest.lat !== '' && currentDest.lng !== '' &&
			currentWeight !== '';

		if (!hasManualParams) {
			if (!aiInput.trim()) {
				setError('請輸入運輸路線描述，或展開進階設定手動輸入完整參數。');
				return;
			}
			setLoading(true);
			setIsParsing(true);
			setError(null);
			try {
				const resParse = await fetch('/api/v1/transportation_carbon_footprint_calculator', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'parse', text: aiInput })
				});

				if (!resParse.ok) {
					const errorData = await resParse.json().catch(() => ({}));
					throw new Error(errorData.message || errorData.error || `AI 解析失敗 (${resParse.status})`);
				}

				const responseParse = await resParse.json();
				const data = responseParse.payload;

				if (data.parsed?.origin) currentOrigin = data.parsed.origin;
				if (data.parsed?.dest) currentDest = data.parsed.dest;
				if (data.parsed?.weightKg) currentWeight = data.parsed.weightKg;

				setOrigin(currentOrigin);
				setDest(currentDest);
				setWeightKg(currentWeight);
				setShowManual(true);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'AI 解析失敗');
				setLoading(false);
				setIsParsing(false);
				return;
			} finally {
				setLoading(false);
				setIsParsing(false);
			}
		}

		if (currentOrigin.lat === '' || currentOrigin.lng === '' || currentDest.lat === '' || currentDest.lng === '' || currentWeight === '') {
			setError('無法取得完整參數，請確認 AI 解析結果或手動輸入。');
			return;
		}

		setIsPaymentModalOpen(true);
		resetTransaction();
	};

	const handlePaymentConfirm = async () => {
		const orderPayload: IOrderPayload = {
			type: ORDER_TYPE.ANALYSIS,
			data: {
				category: ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT,
				origin,
				dest,
				weightKg
			},
			items: [
				{
					name: t('transportation_carbon_footprint_calculator.payment.fee_name'),
					unitPrice: ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
					quantity: 1,
				},
			],
		};

		await executeOrderTransaction(orderPayload, ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT, async () => {
			await calculateFootprint();
			setIsPaymentModalOpen(false);
		});
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

	const handleDownloadPDF = async () => {
		try {
			setIsExporting(true); // Info: (20260501 - Luphia) 觸發重新渲染，隱藏控制面板並顯示各分頁 Header/Footer

			// Info: (20260430 - Tzuhan) 等待 React 重新渲染完成
			await new Promise(resolve => setTimeout(resolve, 800));

			const originalClasses: { el: Element, className: string }[] = [];
			document.querySelectorAll('*').forEach(child => {
				if (child.className && typeof child.className === 'string' && (child.className.includes('blur-') || child.className.includes('backdrop-blur-'))) {
					originalClasses.push({ el: child, className: child.className });
					child.className = child.className.replace(/blur-\w+/g, '').replace(/backdrop-blur-\w+/g, '');
				}
			});

			const routesToExport = ['land', 'sea', 'air'].filter(type => selectedRoutes.has(type as RouteType) && (type !== 'land' || isLandAvailable));

			// Info: (20260501 - Luphia) 手動處理分頁
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

			for (let i = 0; i < routesToExport.length; i++) {
				const routeType = routesToExport[i];
				const pageEl = document.getElementById(`pdf-page-${routeType}`);
				if (!pageEl) continue;

				// Info: (20260501 - Luphia) 強制設定固定寬度以符合 A4 列印比例最佳化 (約 1024px)
				const oldWidth = pageEl.style.width;
				const oldMaxWidth = pageEl.style.maxWidth;
				pageEl.style.width = '1024px';
				pageEl.style.maxWidth = '1024px';

				/**
				 * Info: (20260501 - Luphia)
				 * 寬度改變會觸發 MapLibre 的 ResizeObserver，這會清空 WebGL Buffer！
				 * 我們必須等待足夠長的時間讓 MapLibre 重新渲染地圖跟路線，否則會抓到透明的圖，且 HTML Markers 也會錯位。
				 */
				await new Promise(resolve => setTimeout(resolve, 1500));

				// Info: (20260501 - Luphia) 直接向 MapLibre 請求渲染結果！徹底解決 WebGL 被 html-to-image 忽略的問題！
				const currentMapRef = mapRefs[routeType as RouteType];
				let imgEl: HTMLImageElement | null = null;
				let originalCanvasDisplay = '';
				let targetCanvas: HTMLCanvasElement | null = null;

				if (currentMapRef.current && currentMapRef.current.captureMap) {
					const dataUrl = await currentMapRef.current.captureMap();
					if (dataUrl) {
						targetCanvas = pageEl.querySelector('.maplibregl-canvas') as HTMLCanvasElement;
						if (targetCanvas) {
							imgEl = document.createElement('img');
							imgEl.src = dataUrl;
							imgEl.style.width = targetCanvas.style.width || targetCanvas.offsetWidth + 'px';
							imgEl.style.height = targetCanvas.style.height || targetCanvas.offsetHeight + 'px';
							imgEl.style.position = targetCanvas.style.position;
							imgEl.style.top = targetCanvas.style.top;
							imgEl.style.left = targetCanvas.style.left;
							imgEl.className = targetCanvas.className;
							imgEl.style.zIndex = targetCanvas.style.zIndex;

							const parent = targetCanvas.parentElement;
							if (parent) {
								parent.insertBefore(imgEl, targetCanvas);
								originalCanvasDisplay = targetCanvas.style.display;
								targetCanvas.style.display = 'none';
							}
						}
					}
				}

				// Info: (20260501 - Luphia) 等待 DOM 更新
				await new Promise(resolve => setTimeout(resolve, 100));

				const imgData = await htmlToImage.toJpeg(pageEl, {
					quality: 0.8,
					backgroundColor: '#ffffff',
					pixelRatio: 2
				});

				// Info: (20260501 - Luphia) 還原 canvas
				if (targetCanvas && imgEl && imgEl.parentElement) {
					targetCanvas.style.display = originalCanvasDisplay;
					imgEl.parentElement.removeChild(imgEl);
				}

				pageEl.style.width = oldWidth;
				pageEl.style.maxWidth = oldMaxWidth;

				const elWidth = 1024;
				const elHeight = pageEl.offsetHeight;
				const imgHeightInMm = (elHeight * pdfWidth) / elWidth;

				if (i > 0) {
					pdf.addPage();
				}

				let heightLeft = imgHeightInMm;
				let position = 0;

				pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInMm);
				heightLeft -= pdfHeight;

				// Info: (20260502 - Luphia) 避免浮點數誤差或 1 毫米的溢白邊產生無意義的整面空白頁
				while (heightLeft > 1) {
					position -= pdfHeight;
					pdf.addPage();
					pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInMm);
					heightLeft -= pdfHeight;
				}
			}

			// Info: (20260501 - Luphia) 還原 class
			originalClasses.forEach(({ el, className }) => {
				el.className = className;
			});

			const timestamp = new Date().getTime();
			pdf.save(`iSunFA_Logistics_Carbon_Report_${timestamp}.pdf`);
		} catch (err) {
			console.error("Failed to generate PDF", err);
			alert(t('transportation_carbon_footprint_calculator.pdf.error_failed') + (err instanceof Error ? err.message : t('transportation_carbon_footprint_calculator.pdf.error_unknown')));
		} finally {
			setIsExporting(false);
		}
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

	const handleLoadHistory = async (item: IHistoryItem) => {
		setLoading(true);
		setError(null);
		setPlan(null);
		try {
			const res = await request<{ payload: { result: string } }>(`/api/v1/user/analysis/${item.id}`);
			if (res?.payload?.result) {
				setPlan(JSON.parse(res.payload.result));
				setOrigin(item.origin || { lat: '', lng: '' });
				setDest(item.dest || { lat: '', lng: '' });
				setWeightKg(item.weightKg || '');
				setTimeout(() => {
					if (scrollTargetRef.current) {
						scrollTargetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
					}
				}, 100);
				return true;
			}
		} catch (err) {
			console.error("Failed to load history", err);
			setError("無法載入歷史報告");
		} finally {
			setLoading(false);
		}
		return false;
	};

	const historyColumns: IDataTableColumn<IHistoryItem>[] = [
		{
			key: "generatedAt",
			label: t('common.date'),
			render: (row) => <span className="text-gray-600 text-sm">{row.generatedAt}</span>
		},
		{
			key: "status",
			label: t('common.status'),
			render: (row) => {
				const isCompleted = row.status?.toUpperCase() === 'COMPLETED' || row.status?.toUpperCase() === 'SUCCESS' || row.status?.toUpperCase() === 'DONE';
				const isFailed = row.status?.toUpperCase() === 'FAILED' || row.status?.toUpperCase() === 'ERROR';
				const isIncomplete = !isCompleted && !isFailed;
				return (
					<span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isCompleted ? 'bg-green-100 text-green-700' : isFailed ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
						{isIncomplete && <Loader2 className="w-3 h-3 animate-spin" />}
						{row.status}
					</span>
				);
			}
		},
		{
			key: "origin",
			label: t('common.origin'),
			render: (row) => (
				<div className="flex items-center gap-1.5 text-gray-700 text-sm">
					<MapPin className="w-4 h-4 text-orange-500 shrink-0" />
					<span className="truncate max-w-[200px]">{row.origin?.lat ? `${row.origin.lat}, ${row.origin.lng}` : "未知"}</span>
				</div>
			)
		},
		{
			key: "dest",
			label: t('common.destination'),
			render: (row) => (
				<div className="flex items-center gap-1.5 text-gray-700 text-sm">
					<MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
					<span className="truncate max-w-[200px]">{row.dest?.lat ? `${row.dest.lat}, ${row.dest.lng}` : "未知"}</span>
				</div>
			)
		},
		{
			key: "weight",
			label: t('common.weight'),
			render: (row) => (
				<div className="flex items-center gap-1.5 text-gray-700 text-sm">
					<Weight className="w-4 h-4 text-gray-400" />
					<span>{row.weightKg} kg</span>
				</div>
			)
		},
		{
			key: "actions",
			label: t('common.actions'),
			align: "right",
			render: (row) => (
				<div className="flex justify-end gap-2">
					<button
						onClick={() => handleLoadHistory(row)}
						disabled={loading || isExporting || row.status?.toUpperCase() !== 'COMPLETED'}
						className="px-4 py-2 bg-white text-orange-600 border border-orange-200 font-bold text-sm rounded-full hover:bg-orange-50 hover:border-orange-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{t('common.load')}
					</button>
					<button
						onClick={async () => {
							const loaded = await handleLoadHistory(row);
							if (loaded) {
								setTimeout(() => {
									handleDownloadPDF();
								}, 1000);
							}
						}}
						disabled={loading || isExporting || row.status?.toUpperCase() !== 'COMPLETED'}
						className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-full hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
						{t('transportation_carbon_footprint_calculator.ui.export_report')}
					</button>
				</div>
			)
		}
	];

	return (
		<main
			className="flex min-h-screen flex-col bg-white text-gray-900 font-sans selection:bg-orange-500/30 overflow-hidden relative isolate select-none"
			onContextMenu={(e) => e.preventDefault()}
		>
			<Head>
				<title>iSunFA ESG Logistics Static Report</title>
			</Head>

			<PaymentConfirmModal
				isOpen={isPaymentModalOpen}
				onClose={() => {
					if (workflowStatus === "error" || workflowStatus === "payment_success") {
						resetTransaction();
						setIsPaymentModalOpen(false);
					} else if (workflowStatus === "idle") {
						setIsPaymentModalOpen(false);
					}
				}}
				onConfirm={handlePaymentConfirm}
				cost={ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT}
				items={[
					{
						label: t('transportation_carbon_footprint_calculator.payment.modal_label'),
						value: t('transportation_carbon_footprint_calculator.payment.modal_value'),
					},
				]}
				status={workflowStatus}
			/>

			{/* Info: (20260501 - Luphia) PDF 匯出時的滿版覆蓋載入提示 */}
			{isExporting && (
				<div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
					<Loader2 className="w-16 h-16 text-orange-600 animate-spin mb-6 drop-shadow-md" />
					<h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">{t('transportation_carbon_footprint_calculator.pdf.generating_title_large')}</h2>
					<p className="text-gray-500 font-medium max-w-md text-sm md:text-base leading-relaxed">
						{t('transportation_carbon_footprint_calculator.pdf.generating_desc_large_1')}<br />
						{t('transportation_carbon_footprint_calculator.pdf.generating_desc_large_2')}
					</p>

					{/* Info: (20260501 - Luphia) Progress Indicator */}
					<div className="w-64 max-w-full h-2 bg-gray-100 rounded-full mt-8 overflow-hidden border border-gray-200">
						<div className="h-full bg-orange-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] w-full origin-left scale-x-50"></div>
					</div>
				</div>
			)}

			<div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none" aria-hidden="true">
				<div
					className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff8c00] to-[#ffda44] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
					style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
				/>
			</div>

			<div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 md:py-24 space-y-12 z-10 relative">

				{/* Info: (20260501 - Luphia) User Requested Header Design */}
				<div className="text-center space-y-4 pt-10">
					<div className="inline-flex items-center justify-center p-3 bg-orange-50 rounded-2xl mb-4 shadow-sm border border-orange-100">
						<Leaf className="w-8 h-8 text-orange-600" />
					</div>
					<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-orange-700 via-orange-500 to-amber-400 drop-shadow-sm pb-2">
						{t('transportation_carbon_footprint_calculator.ui.title')}
					</h1>
					<p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
						{t('transportation_carbon_footprint_calculator.ui.description')}
					</p>
				</div>

				<div ref={reportRef} className={`bg-transparent -mx-2 md:mx-0 transition-all ${isExporting ? 'bg-white rounded-3xl shadow-2xl overflow-hidden relative' : ''}`}>
					{/* Info: (20260501 - Luphia) 如果不是在匯出狀態，顯示輸入控制面板 */}
					{!isExporting && (
						<div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 md:p-8">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
									<Settings2 className="w-5 h-5 text-orange-500" /> {t('transportation_carbon_footprint_calculator.ui.config_title')}
								</h2>
							</div>

							<div className="space-y-6">
								{/* Info: (20260501 - Luphia) 第一列：語意輸入框與產生按鈕 */}
								<div className="flex flex-col md:flex-row gap-4 items-end">
									<label className="flex-1 w-full flex flex-col gap-2">
										<div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
											<Sparkles className="w-4 h-4 text-orange-500" /> {t('transportation_carbon_footprint_calculator.ui.route_description')}
										</div>
										<input
											type="text" value={aiInput} onChange={(e) => {
												setAiInput(e.target.value);
												setOrigin({ lat: '', lng: '' });
												setDest({ lat: '', lng: '' });
												setWeightKg('');
											}}
											placeholder={t('transportation_carbon_footprint_calculator.ui.route_placeholder')}
											aria-label={t('transportation_carbon_footprint_calculator.ui.route_description')}
											disabled={isLocked || isParsing}
											className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 h-[50px]"
										/>
									</label>
									<div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto h-[50px]">
										{user && (
											<button
												onClick={handleOpenPayment}
												disabled={loading || isParsing || isExporting || (!aiInput.trim() && !(origin.lat !== '' && origin.lng !== '' && dest.lat !== '' && dest.lng !== '' && weightKg !== ''))}
												className="h-full px-8 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 w-full sm:w-auto"
											>
												{(loading || isParsing) ? <><Loader2 className="w-5 h-5 animate-spin" /> {t('transportation_carbon_footprint_calculator.ui.calculating')}</> : <><Activity className="w-5 h-5" /> {t('transportation_carbon_footprint_calculator.ui.generate_report')}</>}
											</button>
										)}
										{!user && (
											<div className="h-full w-full sm:w-auto flex items-stretch">
												<LoginButton label={t('transportation_carbon_footprint_calculator.ui.login_to_generate')} />
											</div>
										)}
									</div>
								</div>

								{/* Info: (20260501 - Luphia) 折疊式手動參數確認 */}
								<div className="bg-gray-50/50 rounded-2xl overflow-hidden transition-all border border-gray-100 mt-2">
									<button
										onClick={() => setShowManual(!showManual)}
										className="w-full px-6 py-3.5 flex justify-between items-center hover:bg-orange-50/50 transition-colors text-sm font-semibold text-gray-600 group"
									>
										<span className="flex items-center gap-2 group-hover:text-orange-600 transition-colors"><Settings2 className="w-4 h-4" /> {t('transportation_carbon_footprint_calculator.ui.advanced_config')}</span>
										{showManual ? <ChevronUp className="w-4 h-4 group-hover:text-orange-600 transition-colors" /> : <ChevronDown className="w-4 h-4 group-hover:text-orange-600 transition-colors" />}
									</button>

									{showManual && (
										<div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 border-t border-gray-200/60 bg-white/60 backdrop-blur-sm">
											<label className="flex flex-col gap-1.5 cursor-pointer">
												<span className="text-xs font-bold text-gray-500 tracking-wider">{t('transportation_carbon_footprint_calculator.ui.origin_lat')}</span>
												<input type="number" step="any" aria-label={t('transportation_carbon_footprint_calculator.ui.origin_lat')} value={origin.lat} onChange={e => setOrigin({ ...origin, lat: e.target.value ? parseFloat(e.target.value) : '' })} disabled={isLocked} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-gray-100/80 disabled:text-gray-400 transition-all shadow-sm" />
											</label>
											<label className="flex flex-col gap-1.5 cursor-pointer">
												<span className="text-xs font-bold text-gray-500 tracking-wider">{t('transportation_carbon_footprint_calculator.ui.origin_lng')}</span>
												<input type="number" step="any" aria-label={t('transportation_carbon_footprint_calculator.ui.origin_lng')} value={origin.lng} onChange={e => setOrigin({ ...origin, lng: e.target.value ? parseFloat(e.target.value) : '' })} disabled={isLocked} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-gray-100/80 disabled:text-gray-400 transition-all shadow-sm" />
											</label>
											<label className="flex flex-col gap-1.5 cursor-pointer">
												<span className="text-xs font-bold text-gray-500 tracking-wider">{t('transportation_carbon_footprint_calculator.ui.dest_lat')}</span>
												<input type="number" step="any" aria-label={t('transportation_carbon_footprint_calculator.ui.dest_lat')} value={dest.lat} onChange={e => setDest({ ...dest, lat: e.target.value ? parseFloat(e.target.value) : '' })} disabled={isLocked} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-gray-100/80 disabled:text-gray-400 transition-all shadow-sm" />
											</label>
											<label className="flex flex-col gap-1.5 cursor-pointer">
												<span className="text-xs font-bold text-gray-500 tracking-wider">{t('transportation_carbon_footprint_calculator.ui.dest_lng')}</span>
												<input type="number" step="any" aria-label={t('transportation_carbon_footprint_calculator.ui.dest_lng')} value={dest.lng} onChange={e => setDest({ ...dest, lng: e.target.value ? parseFloat(e.target.value) : '' })} disabled={isLocked} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-gray-100/80 disabled:text-gray-400 transition-all shadow-sm" />
											</label>
											<label className="flex flex-col gap-1.5 cursor-pointer">
												<span className="text-xs font-bold text-orange-600 flex items-center gap-1 tracking-wider"><Weight className="w-3 h-3" /> {t('transportation_carbon_footprint_calculator.ui.total_weight')}</span>
												<input type="number" step="any" aria-label={t('transportation_carbon_footprint_calculator.ui.total_weight')} value={weightKg} onChange={e => setWeightKg(e.target.value ? parseFloat(e.target.value) : '')} disabled={isLocked} className="w-full bg-white border border-orange-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 disabled:bg-orange-50/50 disabled:text-gray-400 transition-all shadow-sm" />
											</label>
										</div>
									)}
								</div>
							</div>


							{error && <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">{error}</div>}
						</div>
					)}

					{/* Info: (20260501 - Luphia) 歷史分析路徑區塊 */}
					{!isExporting && history.length > 0 && (
						<div ref={historyTableRef} className="w-full mt-10">
							<DataTable
								columns={historyColumns}
								data={history}
								rowKey={(row) => row.id}
							/>
						</div>
					)}

					{/* Info: (20260501 - Luphia) 報告內容區塊 */}
					<div ref={scrollTargetRef} className="transition-all duration-500 ease-in-out mt-10">
						{plan ? (
							<div className="flex flex-col gap-8 pb-12">
								{!isExporting && (
									<div className="flex justify-center flex-wrap gap-3 mb-2 mt-4">
										<button
											onClick={() => toggleRoute('land')}
											disabled={!plan || loading || !isLandAvailable}
											className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border 
											${(!!plan && !isLandAvailable) ? 'bg-gray-50 border-gray-200 text-gray-400 line-through cursor-not-allowed' :
													(!plan || loading) ? 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed' :
														selectedRoutes.has('land') ? 'bg-orange-50 border-orange-200 text-orange-700' :
															'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
										>
											<Truck className="w-4 h-4" /> {t('transportation_carbon_footprint_calculator.ui.land_route')}
										</button>
										<button
											onClick={() => toggleRoute('sea')}
											disabled={!plan || loading}
											className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border 
											${(!plan || loading) ? 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed' :
													selectedRoutes.has('sea') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
														'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
										>
											<Ship className="w-4 h-4" /> {t('transportation_carbon_footprint_calculator.ui.sea_route')}
										</button>
										<button
											onClick={() => toggleRoute('air')}
											disabled={!plan || loading}
											className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border 
											${(!plan || loading) ? 'bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed' :
													selectedRoutes.has('air') ? 'bg-blue-50 border-blue-200 text-blue-700' :
														'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
										>
											<Plane className="w-4 h-4" /> {t('transportation_carbon_footprint_calculator.ui.air_route')}
										</button>
									</div>
								)}

								{/* Info: (20260501 - Luphia) 根據選擇的路線，動態渲染，並在匯出時每一頁獨立用 ReportLayout 包覆 */}
								{(() => {
									const routesToRender = ['land', 'sea', 'air'].filter(type => selectedRoutes.has(type as RouteType) && (type !== 'land' || isLandAvailable));
									const getModeName = (mode: string) => mode === 'land' ? t('transportation_carbon_footprint_calculator.pdf.mode_land') : mode === 'sea' ? t('transportation_carbon_footprint_calculator.pdf.mode_sea') : t('transportation_carbon_footprint_calculator.pdf.mode_air');
									const originName = origin.lat ? `${origin.lat}, ${origin.lng}` : t('transportation_carbon_footprint_calculator.pdf.origin');
									const destName = dest.lat ? `${dest.lat}, ${dest.lng}` : t('transportation_carbon_footprint_calculator.pdf.dest');

									return routesToRender.map((type, index) => (
										<div key={type} id={`pdf-page-${type}`} className={isExporting ? 'bg-transparent shadow-none' : ''}>
											<ReportLayout
												isPdfExport={isExporting}
												hideFrameUnlessExport={true}
												badgeText={`${getModeName(type)} ${t('transportation_carbon_footprint_calculator.payment.fee_name')}`}
												footerType={isExporting ? "simple" : "none"}
												footerTitle={t('transportation_carbon_footprint_calculator.pdf.footer').replace('{{current}}', String(index + 1)).replace('{{total}}', String(routesToRender.length)).replace('{{origin}}', originName).replace('{{dest}}', destName)}
												className={isExporting ? "bg-white min-h-[1448px] rounded-none shadow-none ring-0 border-none justify-between" : "bg-transparent shadow-none ring-0 border-none"}
												contentClassName={isExporting ? "p-8" : "p-0"}
											>
												{/* Info: (20260501 - Luphia) PDF 專屬開頭區塊 */}
												{isExporting && (
													<div className="mb-8 p-6 bg-gray-50/80 rounded-3xl border border-gray-100 flex flex-col gap-4">
														<div className="flex items-center gap-3">
															<div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
																{type === 'land' ? <Truck className="w-6 h-6 text-orange-500" /> : type === 'sea' ? <Ship className="w-6 h-6 text-emerald-500" /> : <Plane className="w-6 h-6 text-blue-500" />}
															</div>
															<h2 className="text-2xl font-bold text-gray-900">{getModeName(type)} {t('transportation_carbon_footprint_calculator.pdf.section_analysis')}</h2>
														</div>
														<div className="flex flex-wrap items-center text-gray-700 text-sm font-semibold gap-3">
															<div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex-1 sm:flex-none">
																<MapPin className="w-4 h-4 text-orange-500" />
																<span className="truncate max-w-[200px]">{originName}</span>
															</div>
															<ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
															<div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex-1 sm:flex-none">
																<MapPin className="w-4 h-4 text-emerald-500" />
																<span className="truncate max-w-[200px]">{destName}</span>
															</div>
															<div className="ml-auto flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
																<Weight className="w-4 h-4 text-blue-500" />
																<span>{t('transportation_carbon_footprint_calculator.pdf.weight_label').replace('{{weight}}', String(weightKg || 1000))}</span>
															</div>
														</div>
													</div>
												)}

												<PlanSection type={type as RouteType} plan={plan} weightKg={weightKg} isExporting={isExporting} mapRef={mapRefs[type as RouteType]} />
											</ReportLayout>
											{!isExporting && index < routesToRender.length - 1 && <div className="w-full border-b-2 border-dashed border-gray-200 my-4"></div>}
										</div>
									));
								})()}
							</div>
						) : (
							<div className="mt-12 text-center py-24 bg-gray-50 rounded-3xl border border-gray-100 border-dashed">
								<Leaf className="w-12 h-12 text-gray-300 mx-auto mb-4" />
								<h3 className="text-gray-500 font-medium">{t('transportation_carbon_footprint_calculator.ui.not_generated')}</h3>
							</div>
						)}
					</div>
				</div>

			</div>
		</main>
	);
}