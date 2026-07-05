"use client";

import { createContext, useContext, ReactNode } from "react";

export interface ICreditPlan {
  id: string;
  credits: number;
  price: {
    twd: number;
    usd: number;
    cny: number;
    jpy: number;
    krw: number;
  };
  popular?: boolean;
}

interface IPricingContextType {
  onSelectSubscription: (
    planKey: string,
    title: string,
    billingInterval: "month" | "year",
  ) => void;
  onSelectCustomPlan: (
    planId: string,
    title: string,
    amount: number,
    interval?: "month" | "year",
    details?: string[],
  ) => void;
  onSelectCredit: (plan: ICreditPlan, displayPrice: string) => void;
  setAuthModalOpen: (open: boolean) => void;
  setConfirmModal: (modal: {
    isOpen: boolean;
    title: string;
    message: ReactNode;
  }) => void;
}

const PricingContext = createContext<IPricingContextType | undefined>(
  undefined,
);

export function usePricing() {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error("usePricing must be used within a PricingProvider");
  }
  return context;
}

export const PricingProvider = PricingContext.Provider;
