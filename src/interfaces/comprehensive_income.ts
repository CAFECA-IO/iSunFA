export type IComprehensiveIncome = {
  reportType: string;
  reportID: string;
  reportName: string;
  reportStartTime: number;
  reportEndTime: number;
  netProfit: string;
  income: IIncome;
  costs: ICosts;
  operatingExpenses: IOperatingExpenses;
  financialCosts: IFinancialCosts;
  otherGainLosses: IOtherGainLosses;
};

export type IIncome = {
  weightedAverageCost: string;
  details: {
    depositFee: IFeeDetail;
    withdrawalFee: IFeeDetail;
    tradingFee: IFeeDetail;
    spreadFee: IFeeDetail;
    liquidationFee: IFeeDetail;
    guaranteedStopLossFee: IFeeDetail;
  };
};

export type ICosts = {
  weightedAverageCost: string;
  details: {
    technicalProviderFee: IFeeDetail;
    marketDataProviderFee: ISimpleCost;
    newCoinListingCost: ISimpleCost;
  };
};

export type IOperatingExpenses = {
  weightedAverageCost: string;
  details: {
    salaries: string;
    rent: string;
    marketing: string;
    rebateExpenses: IFeeDetail;
  };
};

export type IFinancialCosts = {
  weightedAverageCost: string;
  details: {
    interestExpense: string;
    cryptocurrencyForexLosses: IFeeDetail;
    fiatToCryptocurrencyConversionLosses: string;
    cryptocurrencyToFiatConversionLosses: string;
    fiatToFiatConversionLosses: string;
  };
};

export type IOtherGainLosses = {
  weightedAverageCost: string;
  details: {
    investmentGains: string;
    forexGains: string;
    cryptocurrencyGains: IFeeDetail;
  };
};

export type IFeeDetail = {
  weightedAverageCost: string;
  breakdown: {
    [currency: string]: {
      amount: string;
      weightedAverageCost: string;
    };
  };
};

export type ISimpleCost = {
  weightedAverageCost: string;
};
