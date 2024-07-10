export interface IOperatingCashFlowMapping {
    fromCode: string[];
    // toCode: string;
    name: string;
    debit: boolean; // Info: (20240708 - Murky) 這個項目原始應該要是借方還是貸方, 項目加總時如果該科目是相反的方向, 需要改用減的
    operatingFunction: (...args: number[]) => number;
    child?: Map<string, IOperatingCashFlowMapping>;
}

// Deprecated: (20240710 - Murky): Down below is non used Interface
export interface ICashFlow {
  reportType: string;
  reportID: string;
  reportName: string;
  reportStartTime: number;
  reportEndTime: number;
  supplementalScheduleOfNonCashOperatingActivities: ISupplementalSchedule;
  otherSupplementaryItems: IOtherSupplementaryItems;
  operatingActivities: IOperatingActivities;
  investingActivities: IInvestingActivities;
  financingActivities: IFinancingActivities;
}

export interface ISupplementalSchedule {
  weightedAverageCost: string;
  details: {
    cryptocurrenciesPaidToCustomersForPerpetualContractProfits: IWeightedCost;
    cryptocurrenciesDepositedByCustomers: IBreakdownCost;
    cryptocurrenciesWithdrawnByCustomers: IBreakdownCost;
    cryptocurrenciesPaidToSuppliersForExpenses: IBreakdownCost;
    cryptocurrencyInflows: IBreakdownCost;
    cryptocurrencyOutflows: IBreakdownCost;
    purchaseOfCryptocurrenciesWithNonCashConsideration: IBreakdownCost;
    disposalOfCryptocurrenciesForNonCashConsideration: IBreakdownCost;
    cryptocurrenciesReceivedFromCustomersAsTransactionFees: IBreakdownCost;
  };
}

export interface IOtherSupplementaryItems {
  details: {
    relatedToNonCash: {
      cryptocurrenciesEndOfPeriod: IWeightedCost;
      cryptocurrenciesBeginningOfPeriod: IWeightedCost;
    };
    relatedToCash: {
      netIncreaseDecreaseInCashCashEquivalentsAndRestrictedCash: IWeightedCost;
      cryptocurrenciesBeginningOfPeriod: IWeightedCost;
      cryptocurrenciesEndOfPeriod: IWeightedCost;
    };
  };
}

export interface IOperatingActivities {
  weightedAverageCost: string;
  details: {
    cashDepositedByCustomers: IBreakdownCost;
    cashWithdrawnByCustomers: IBreakdownCost;
    purchaseOfCryptocurrencies: IWeightedCost;
    disposalOfCryptocurrencies: IWeightedCost;
    cashReceivedFromCustomersAsTransactionFee: IBreakdownCost;
    cashPaidToSuppliersForExpenses: IBreakdownCost;
  };
}

export interface IInvestingActivities {
  weightedAverageCost: string;
}

export interface IFinancingActivities {
  weightedAverageCost: string;
  details: {
    proceedsFromIssuanceOfCommonStock: IWeightedCost;
    longTermDebt: IWeightedCost;
    shortTermBorrowings: IWeightedCost;
    paymentsOfDividends: IWeightedCost;
    treasuryStock: IWeightedCost;
  };
}

export interface IWeightedCost {
  weightedAverageCost: string;
}

export interface IBreakdownCost {
  weightedAverageCost: string;
  breakdown: {
    [key: string]: {
      amount: string;
      weightedAverageCost: string;
    };
  };
}
