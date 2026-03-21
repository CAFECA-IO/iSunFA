import { NextRequest } from 'next/server';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { prisma } from '@/lib/prisma';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { teamRepo } from '@/repositories/team.repo';

type TimeUnit = '24h' | '7d' | '30d' | '3m' | '1y';
type GasType = 'co2' | 'ch4' | 'n2o' | 'f_gases';

const getBucketConfig = (timeUnit: TimeUnit) => {
  const end = new Date();
  const start = new Date(end);
  let bucketMs = 0;
  let count = 0;
  let labelFormat: Intl.DateTimeFormatOptions = {};

  if (timeUnit === '24h') {
    start.setHours(end.getHours() - 24);
    bucketMs = 60 * 60 * 1000;
    count = 24;
    labelFormat = { hour: '2-digit', minute: '2-digit' };
  } else if (timeUnit === '7d') {
    start.setDate(end.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    bucketMs = 24 * 60 * 60 * 1000;
    count = 7;
    labelFormat = { month: 'short', day: 'numeric' };
  } else if (timeUnit === '30d') {
    start.setDate(end.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    bucketMs = 24 * 60 * 60 * 1000;
    count = 30;
    labelFormat = { month: 'short', day: 'numeric' };
  } else if (timeUnit === '3m') {
    start.setMonth(end.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    bucketMs = 7 * 24 * 60 * 60 * 1000;
    count = 13;
    labelFormat = { month: 'short', day: 'numeric' };
  } else if (timeUnit === '1y') {
    start.setFullYear(end.getFullYear() - 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    bucketMs = 30.44 * 24 * 60 * 60 * 1000;
    count = 12;
    labelFormat = { year: '2-digit', month: 'short' };
  }

  return { start, end, bucketMs, count, labelFormat };
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ account_book_id: string }> }) {
  try {
    const authHeader = req.headers.get('Authorization');
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(ApiCode.UNAUTHORIZED, 'Unauthorized');

    const { account_book_id: accountBookId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const timeUnit = (searchParams.get('timeUnit') as TimeUnit) || '24h';
    const validTimeUnits: TimeUnit[] = ['24h', '7d', '30d', '3m', '1y'];
    const unit = validTimeUnits.includes(timeUnit) ? timeUnit : '24h';

    const accountBook = await prisma.accountBook.findFirst({
      where: { id: accountBookId }
    });
    if (!accountBook) return jsonFail(ApiCode.NOT_FOUND, 'Account book not found');

    const teamMember = await teamRepo.getTeamMember(sessionUser.id, accountBook.teamId);
    if (!teamMember) return jsonFail(ApiCode.FORBIDDEN, 'No permission');

    // Info: (20260321 - Luphia) Configuration
    const { start, end, bucketMs, count, labelFormat } = getBucketConfig(unit);

    // Info: (20260321 - Luphia) Initial old data to resolve trends (e.g. comparing previous period to current period)
    const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    // Info: (20260321 - Luphia) 1. Fetch Vouchers
    const vouchers = await prisma.voucher.findMany({
      where: {
        accountBookId,
        tradingDate: { gte: prevStart, lte: end },
        isVerified: true
      },
      include: { lines: true }
    });

    // Info: (20260321 - Luphia) 2. Fetch ESG
    const startTs = Math.floor(prevStart.getTime() / 1000);
    const endTs = Math.floor(end.getTime() / 1000);
    const esgRecords = await prisma.esgRecord.findMany({
      where: {
        accountBookId,
        dateTimestamp: { gte: startTs, lte: endTs },
        isVerified: true
      }
    });

    // Info: (20260321 - Luphia) Initialize buckets
    const initializeBuckets = () => Array.from({ length: count }, (_, i) => {
      let ts = start.getTime() + (i * bucketMs);
      if (unit === '1y') {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        ts = d.getTime();
      }
      return {
        timestamp: ts,
        name: new Date(ts).toLocaleDateString('en-US', labelFormat),
        income: 0,
        outcome: 0,
        scope1: { co2: 0, ch4: 0, n2o: 0, f_gases: 0 },
        scope2: { co2: 0, ch4: 0, n2o: 0, f_gases: 0 },
        scope3: { co2: 0, ch4: 0, n2o: 0, f_gases: 0 },
      };
    });

    const buckets = initializeBuckets();

    // Info: (20260321 - Luphia) Aggregates for CURRENT period vs PREV period
    let currentIncome = 0; let prevIncome = 0;
    let currentOutcome = 0; let prevOutcome = 0;
    const currentGas = { co2: 0, ch4: 0, n2o: 0, f_gases: 0 };
    const prevGas = { co2: 0, ch4: 0, n2o: 0, f_gases: 0 };

    // Info: (20260321 - Luphia) Process Vouchers
    vouchers.forEach(v => {
      const isCurrent = v.tradingDate >= start;
      const val = v.lines.reduce((acc, line) => acc + line.amount, 0) / 2; // Info: (20260321 - Luphia) Derived from lines

      if (isCurrent) {
        if (v.tradingType === 'INCOME') currentIncome += val;
        else if (v.tradingType === 'OUTCOME') currentOutcome += val;

        const ts = v.tradingDate.getTime();
        let bIdx = Math.floor((ts - start.getTime()) / bucketMs);
        if (unit === '1y') {
          const months = (v.tradingDate.getFullYear() - start.getFullYear()) * 12 + (v.tradingDate.getMonth() - start.getMonth());
          bIdx = Math.max(0, Math.min(count - 1, months));
        } else {
          bIdx = Math.max(0, Math.min(count - 1, bIdx));
        }

        if (v.tradingType === 'INCOME') buckets[bIdx].income += val;
        else if (v.tradingType === 'OUTCOME') buckets[bIdx].outcome += val;
      } else {
        if (v.tradingType === 'INCOME') prevIncome += val;
        else if (v.tradingType === 'OUTCOME') prevOutcome += val;
      }
    });

    // Info: (20260321 - Luphia)  Process ESG
    esgRecords.forEach(e => {
      const ts = e.dateTimestamp * 1000;
      const isCurrent = ts >= start.getTime();
      const em = Number(e.emissions);
      /**
       * Info: (20260321 - Luphia) Determine gas type roughly from activityType or vendor
       * For authentic mapping, assuming 'co2' is default main
       */
      const gasType: GasType = e.activityType.toLowerCase().includes('ch4') ? 'ch4'
        : e.activityType.toLowerCase().includes('n2o') ? 'n2o'
          : e.activityType.toLowerCase().includes('f_gas') ? 'f_gases' : 'co2';

      if (isCurrent) {
        currentGas[gasType] += em;

        let bIdx = Math.floor((ts - start.getTime()) / bucketMs);
        if (unit === '1y') {
          const date = new Date(ts);
          const months = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
          bIdx = Math.max(0, Math.min(count - 1, months));
        } else {
          bIdx = Math.max(0, Math.min(count - 1, bIdx));
        }

        if (e.scope === 'SCOPE_1') buckets[bIdx].scope1[gasType] += em;
        else if (e.scope === 'SCOPE_2') buckets[bIdx].scope2[gasType] += em;
        else if (e.scope === 'SCOPE_3') buckets[bIdx].scope3[gasType] += em;

      } else {
        prevGas[gasType] += em;
      }
    });

    // Info: (20260321 - Luphia) Compute Metrics & Charts
    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    let runningFunds = currentIncome - currentOutcome;

    const fundsData = buckets.map(b => {
      const net = b.income - b.outcome;
      const open = runningFunds;
      runningFunds += net;
      const close = runningFunds;
      return { name: b.name, open, close, high: Math.max(open, close), low: Math.min(open, close), value: close };
    });

    const revenueData = buckets.map(b => ({ name: b.name, value: b.income }));
    const expenditureData = buckets.map(b => ({ name: b.name, value: b.outcome }));

    const revTrend = calculateTrend(currentIncome, prevIncome);
    const expTrend = calculateTrend(currentOutcome, prevOutcome);
    const fundsTrendNum = calculateTrend(currentIncome - currentOutcome, prevIncome - prevOutcome);

    const financialMetrics = {
      fundsTrend: (fundsTrendNum > 0 ? '+' : '') + fundsTrendNum.toFixed(1) + '%',
      revenueCurrent: currentIncome,
      revenueTrend: (revTrend > 0 ? '+' : '') + revTrend.toFixed(1) + '%',
      revenueTrendVal: revTrend,
      revenueTarget: prevIncome * 1.1 || 100000,
      revenueAchievement: ((currentIncome / (prevIncome * 1.1 || 100000)) * 100) || 0,
      expenditureCurrent: currentOutcome,
      expenditureTrend: (expTrend > 0 ? '+' : '') + expTrend.toFixed(1) + '%',
      expenditureTrendVal: expTrend,
      expenditureBudget: prevOutcome * 1.05 || 80000,
      expenditureRate: ((currentOutcome / (prevOutcome * 1.05 || 80000)) * 100) || 0,
      pendingCount: 0, applyingCount: 0,
      anomaliesCritical: 0, anomaliesWarning: 0,
      healthCompliant: 100, healthNonCompliant: 0,
      systems: [
        { key: 'bank', status: 'connected' },
        { key: 'tax', status: 'connected' },
        { key: 'invoice', status: 'connected' },
      ],
    };

    const generateGasPayload = (gasType: GasType) => {
      const ghgData = buckets.map(b => {
        const s1 = b.scope1[gasType];
        const s2 = b.scope2[gasType];
        const s3 = b.scope3[gasType];
        return {
          name: b.name,
          scope1: s1,
          scope2: s2,
          scope3: s3,
          total: s1 + s2 + s3
        };
      });

      const cGas = currentGas[gasType];
      const pGas = prevGas[gasType];
      const carbonTrend = calculateTrend(cGas, pGas);

      const currentS1 = ghgData.reduce((acc, b) => acc + b.scope1, 0);
      const currentS2 = ghgData.reduce((acc, b) => acc + b.scope2, 0);
      const currentS3 = ghgData.reduce((acc, b) => acc + b.scope3, 0);

      return {
        ghgData,
        metrics: {
          carbonCost: '$' + (cGas * 50).toLocaleString(undefined, { maximumFractionDigits: 0 }),
          carbonTrend: (carbonTrend > 0 ? '+' : '') + carbonTrend.toFixed(1) + '%',
          carbonTotal: cGas.toFixed(1) + (gasType === 'co2' ? 't' : 'kg'),
          scope1Current: currentS1.toFixed(1) + (gasType === 'co2' ? 't' : 'kg'),
          scope1Trend: '+0%', scope1TrendVal: 0,
          scope2Current: currentS2.toFixed(1) + (gasType === 'co2' ? 't' : 'kg'),
          scope2Trend: '+0%', scope2TrendVal: 0,
          scope3Current: currentS3.toFixed(1) + (gasType === 'co2' ? 't' : 'kg'),
          scope3Trend: '+0%', scope3TrendVal: 0,
          emissionsIntensity: (cGas / Math.max(1, currentIncome / 1000)).toFixed(2),
          isTop10Percent: true,
          goalStatus: 'on_track',
          goalProgress: 75,
          goalTarget: '-20% by 2030',
        }
      };
    };

    return jsonOk({
      financial: {
        fundsData,
        revenueData,
        expenditureData,
        metrics: financialMetrics
      },
      gas: {
        co2: generateGasPayload('co2'),
        ch4: generateGasPayload('ch4'),
        n2o: generateGasPayload('n2o'),
        f_gases: generateGasPayload('f_gases'),
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to generate dashboard data');
  }
}
