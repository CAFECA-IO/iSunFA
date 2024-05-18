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
