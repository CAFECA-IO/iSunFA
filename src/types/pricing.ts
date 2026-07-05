export type PendingBillingIntervalType = "month" | "year" | undefined;

export interface IBusinessModelSectionProps {
  onSelect: (
    planId: string,
    title: string,
    amount: number,
    billingInterval?: "month" | "year",
    details?: string[],
  ) => void;
}

export interface ISolutionsPricingSectionProps {
  onSelect: (
    planId: string,
    title: string,
    amount: number,
    billingInterval?: "month" | "year",
    details?: string[],
  ) => void;
}

export type SolutionTab = "iso14064" | "iso14067" | "carbon_label";
