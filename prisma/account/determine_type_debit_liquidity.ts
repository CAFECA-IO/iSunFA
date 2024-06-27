import { Node } from '@/account/node';

function determineGainLossProfit(currentEName: string): string {
    const indexOfGain = currentEName.indexOf("gain");
    const indexOfLoss = currentEName.indexOf("loss");

    if (indexOfGain !== -1 && indexOfLoss !== -1) {
        return indexOfGain < indexOfLoss ? 'gain' : 'loss';
    }

    if (indexOfGain !== -1) return 'gain';
    if (indexOfLoss !== -1) return 'loss';

    return 'profit';
}

function determineEquityLiability(currentEName: string): string {
    if (currentEName.includes("equity")) return 'equity';
    if (currentEName.includes("liability")) {
        return currentEName.includes("non-current") ? 'nonCurrentLiability' : 'currentLiability';
    }
    return 'other';
}

function determineAsset(currentEName: string): string {
    return currentEName.includes("non-current") ? 'nonCurrentAsset' : 'currentAsset';
}

function determineCategory(node: Node): string {
  const currentCode = node.code;
  const currentEName = node.accountEName.toLowerCase();

  if (/^[A-Z]/.test(currentCode)) {
    return currentCode.length <= 5 ? 'changeInEquity' : 'cashFlow';
  }

  if (currentEName.includes("comprehensive")) return 'otherComprehensiveIncome';

  if (currentEName.includes("gain") || currentEName.includes("loss") || currentEName.includes("profit")) {
    return determineGainLossProfit(currentEName);
  }

  if (currentEName.includes("income")) return 'income';
  if (currentEName.includes("expense")) return 'expense';
  if (currentEName.includes("cost")) return 'cost';
  if (currentEName.includes("revenue")) return 'revenue';

  if (currentEName.includes("equity") || currentEName.includes("liability")) {
    return determineEquityLiability(currentEName);
  }

  if (currentEName.includes("asset")) {
    return determineAsset(currentEName);
  }

  return 'other';
}

function getDefaultTypeDebitLiquidityBaseOnCategoryAndParent(category: string, parentType: string | null, parentDebit: boolean | null, parentLiquidity: boolean | null) {
  const defaultValues = {
    type: parentType,
    debit: parentDebit,
    liquidity: parentLiquidity
  };

  switch (category) {
    case 'changeInEquity':
    case 'cashFlow':
    case 'otherComprehensiveIncome':
    case 'income':
    case 'revenue':
      return { type: defaultValues.type || category, debit: defaultValues.debit ?? false, liquidity: defaultValues.liquidity ?? true };
    case 'gain':
    case 'profit':
      return { type: defaultValues.type || 'gainOrLoss', debit: defaultValues.debit ?? false, liquidity: defaultValues.liquidity ?? true };
    case 'loss':
      return { type: defaultValues.type || 'gainOrLoss', debit: defaultValues.debit ?? true, liquidity: defaultValues.liquidity ?? true };
    case 'expense':
    case 'cost':
      return { type: defaultValues.type || category, debit: defaultValues.debit ?? true, liquidity: defaultValues.liquidity ?? true };
    case 'equity':
      return { type: defaultValues.type || 'equity', debit: defaultValues.debit ?? false, liquidity: defaultValues.liquidity ?? false };
    case 'nonCurrentLiability':
    case 'currentLiability':
      return { type: defaultValues.type || 'liability', debit: defaultValues.debit ?? false, liquidity: defaultValues.liquidity ?? (category === 'currentLiability') };
    case 'nonCurrentAsset':
    case 'currentAsset':
      return { type: defaultValues.type || 'asset', debit: defaultValues.debit ?? true, liquidity: defaultValues.liquidity ?? (category === 'currentAsset') };
    default:
      return { type: defaultValues.type || 'other', debit: defaultValues.debit ?? true, liquidity: defaultValues.liquidity ?? true };
  }
}

export function determineTypeDebitLiquidity(node: Node, parentType: string | null, parentDebit: boolean | null, parentLiquidity: boolean | null) {
  const category = determineCategory(node);
  const defaultValue = getDefaultTypeDebitLiquidityBaseOnCategoryAndParent(category, parentType, parentDebit, parentLiquidity);
  return defaultValue;
}
