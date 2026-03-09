import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

// Info: (20260118 - Luphia) Types duplicated from hook for now to keep API independent or shared later
type TimeUnit = '24h' | '7d' | '30d' | '3m' | '1y';
type GasType = 'co2' | 'ch4' | 'n2o' | 'f_gases';

const generateSeries = (count: number, base: number, variance: number, trend: number = 0) => {
  let currentValue = base;
  return Array.from({ length: count }, () => {
    currentValue = currentValue + (Math.random() - 0.5) * variance + trend;
    return Math.floor(Math.max(0, currentValue));
  });
};

const emptyGas = {
  ghgData: [],
  metrics: {
    carbonCost: '$0',
    carbonTrend: '+0%',
    carbonTotal: '0t',
    scope1Current: '0t',
    scope1Trend: '+0%',
    scope1TrendVal: 0,
    scope2Current: '0t',
    scope2Trend: '+0%',
    scope2TrendVal: 0,
    scope3Current: '0t',
    scope3Trend: '+0%',
    scope3TrendVal: 0,
    emissionsIntensity: '0',
    isTop10Percent: false,
    goalStatus: 'behind',
    goalProgress: 0,
    goalTarget: '-20% by 2030',
  }
}
const emptyData = {
  financial: {
    fundsData: [],
    revenueData: [],
    expenditureData: [],
    metrics: {
      fundsTrend: '+0%',
      revenueCurrent: 0,
      revenueTrend: '+0%',
      revenueTrendVal: 0,
      revenueTarget: 0,
      revenueAchievement: 0,
      expenditureCurrent: 0,
      expenditureTrend: '+0%',
      expenditureTrendVal: 0,
      expenditureBudget: 0,
      expenditureRate: 0,
      pendingCount: 0,
      applyingCount: 0,
      anomaliesCritical: 0,
      anomaliesWarning: 0,
      healthCompliant: 0,
      healthNonCompliant: 0,
      systems: [],
    },
  },
  gas: {
    co2: emptyGas,
    ch4: emptyGas,
    n2o: emptyGas,
    f_gases: emptyGas,
  },
};

const generateDataForUnit = (unit: TimeUnit) => {
  const count = 30;
  const isGrowth = ['30d', '3m', '1y'].includes(unit);

  // Info: (20260118 - Luphia) Funds Data
  const fundsData: { name: string; open: number; close: number; high: number; low: number; value: number }[] = [];
  let currentFundsCheck = 1000000;
  for (let i = 0; i < count; i++) {
    const volatility = 20000;
    const trend = isGrowth ? 5000 : 0;
    const open = currentFundsCheck;
    const change = (Math.random() - 0.5) * volatility + trend;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    fundsData.push({ name: `${i + 1}`, open, close, high, low, value: close });
    currentFundsCheck = close;
  }

  // Info: (20260118 - Luphia) Revenue Data
  const revenueValues = generateSeries(count, 120000, 30000, 1500);
  const revenueData = revenueValues.map((v, i) => ({ name: `${i + 1}`, value: v }));

  // Info: (20260118 - Luphia) Expenditure Data
  const expenditureValues = generateSeries(count, 80000, 15000, 500);
  const expenditureData = expenditureValues.map((v, i) => ({ name: `${i + 1}`, value: v }));

  // Info: (20260118 - Luphia) Process Financial Metrics
  const currentRevenue = revenueValues[count - 1];
  const previousRevenue = revenueValues[count - 2];
  const revenueTrendVal = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

  const targetRevenue = 150000;
  const achievementRate = (currentRevenue / targetRevenue) * 100;

  const currentExpenditure = expenditureValues[count - 1];
  const previousExpenditure = expenditureValues[count - 2];
  const expenditureTrendVal = ((currentExpenditure - previousExpenditure) / previousExpenditure) * 100;

  const budgetExpenditure = 100000;
  const expenditureRate = (currentExpenditure / budgetExpenditure) * 100;

  const financialMetrics = {
    fundsTrend: isGrowth ? `+${(Math.random() * 10 + 5).toFixed(1)}%` : `+${(Math.random() * 4).toFixed(1)}%`,
    revenueCurrent: currentRevenue,
    revenueTrend: (revenueTrendVal > 0 ? '+' : '') + revenueTrendVal.toFixed(1) + '%',
    revenueTrendVal,
    revenueTarget: targetRevenue,
    revenueAchievement: achievementRate,
    expenditureCurrent: currentExpenditure,
    expenditureTrend: (expenditureTrendVal > 0 ? '+' : '') + expenditureTrendVal.toFixed(1) + '%',
    expenditureTrendVal,
    expenditureBudget: budgetExpenditure,
    expenditureRate: expenditureRate,
    pendingCount: Math.floor(Math.random() * 10),
    applyingCount: Math.floor(Math.random() * 5),
    anomaliesCritical: Math.floor(Math.random() * 3),
    anomaliesWarning: Math.floor(Math.random() * 5),
    healthCompliant: Math.floor(Math.random() * 15 + 10),
    healthNonCompliant: Math.floor(Math.random() * 3),
    systems: [
      { key: 'bank', status: Math.random() > 0.1 ? 'connected' : 'error' },
      { key: 'tax', status: Math.random() > 0.1 ? 'connected' : 'error' },
      { key: 'invoice', status: Math.random() > 0.1 ? 'connected' : 'error' },
    ],
  };

  // Info: (20260118 - Luphia) Generate Data for ALL Gas Types
  const gasTypes: GasType[] = ['co2', 'ch4', 'n2o', 'f_gases'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gasData: Record<GasType, any> = {
    co2: {},
    ch4: {},
    n2o: {},
    f_gases: {}
  };

  gasTypes.forEach((gasType) => {
    const gasScaler = {
      co2: 1,
      ch4: 0.15,
      n2o: 0.05,
      f_gases: 0.02,
    }[gasType];

    // Info: (20260118 - Luphia) Carbon Data
    const scope1Values = generateSeries(count, 25 * gasScaler, 5 * gasScaler, 0);
    const scope2Values = generateSeries(count, 45 * gasScaler, 5 * gasScaler, 0);
    const scope3Values = generateSeries(count, 35 * gasScaler, 5 * gasScaler, 0);

    const ghgChartData = scope1Values.map((v, i) => ({
      name: `${i + 1}`,
      scope1: v,
      scope2: scope2Values[i],
      scope3: scope3Values[i],
      total: v + scope2Values[i] + scope3Values[i]
    }));

    const currentTotalEmission = ghgChartData[count - 1].total;

    const currentScope1 = ghgChartData[count - 1].scope1;
    const previousScope1 = ghgChartData[count - 2].scope1;
    const scope1TrendVal = ((currentScope1 - previousScope1) / previousScope1) * 100;

    const currentScope2 = ghgChartData[count - 1].scope2;
    const previousScope2 = ghgChartData[count - 2].scope2;
    const scope2TrendVal = ((currentScope2 - previousScope2) / previousScope2) * 100;

    const currentScope3 = ghgChartData[count - 1].scope3;
    const previousScope3 = ghgChartData[count - 2].scope3;
    const scope3TrendVal = ((currentScope3 - previousScope3) / previousScope3) * 100;

    const emissionsIntensity = (currentTotalEmission / (currentRevenue / 1000)).toFixed(2);
    // Info: (20260118 - Luphia) Random top 10% chance
    const isTop10Percent = Math.random() > 0.5;
    const carbonTrendVal = (Math.random() * 10 - 5);

    gasData[gasType] = {
      ghgData: ghgChartData,
      metrics: {
        carbonCost: '$' + (currentTotalEmission * 50).toLocaleString(undefined, { maximumFractionDigits: 0 }),
        carbonTrend: (carbonTrendVal > 0 ? '+' : '') + carbonTrendVal.toFixed(1) + '%',
        carbonTotal: currentTotalEmission.toFixed(1) + (gasType === 'co2' ? 't' : 'kg'),
        scope1Current: currentScope1.toFixed(1) + (gasType === 'co2' ? 't' : 'kg'),
        scope1Trend: (scope1TrendVal > 0 ? '+' : '') + scope1TrendVal.toFixed(1) + '%',
        scope1TrendVal,
        scope2Current: currentScope2.toFixed(1) + (gasType === 'co2' ? 't' : 'kg'),
        scope2Trend: (scope2TrendVal > 0 ? '+' : '') + scope2TrendVal.toFixed(1) + '%',
        scope2TrendVal,
        scope3Current: currentScope3.toFixed(1) + (gasType === 'co2' ? 't' : 'kg'),
        scope3Trend: (scope3TrendVal > 0 ? '+' : '') + scope3TrendVal.toFixed(1) + '%',
        scope3TrendVal,
        emissionsIntensity,
        isTop10Percent,
        // Info: (20260118 - Luphia) Reduction Goal Data
        goalStatus: Math.random() > 0.6 ? 'on_track' : Math.random() > 0.3 ? 'at_risk' : 'behind',
        goalProgress: Math.floor(Math.random() * 40 + 40), // 40-80%
        goalTarget: '-20% by 2030',
      }
    };
  });

  return {
    financial: {
      fundsData,
      revenueData,
      expenditureData,
      metrics: financialMetrics
    },
    gas: gasData
  };
};

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const timeUnit = (searchParams.get('timeUnit') as TimeUnit) || '24h';

    // Info: (20260118 - Luphia) Validate if needed, or fallback
    const validTimeUnits: TimeUnit[] = ['24h', '7d', '30d', '3m', '1y'];
    const unit = validTimeUnits.includes(timeUnit) ? timeUnit : '24h';

    const data = false ? generateDataForUnit(unit) : emptyData;

    return jsonOk(data);
  } catch (error) {
    console.error('API Error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to generate dashboard data');
  }
}
