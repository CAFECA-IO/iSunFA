export interface IMetrics {
  totalRevenue: number;
  totalTransactingUsers: number;
  arpu: number;
  totalPointsPurchased: number;
  totalPointsConsumed: number;
  burnToBuyRatio: number;
}

export interface IPagination {
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
}

export interface IOrderData {
  id: string;
  createdAt: string;
  type: string;
  amount: number;
  status: string;
  user?: {
    id: string;
    name: string | null;
    address: string;
  };
  cardInfo?: {
    type_name?: string;
    last_four?: string;
  };
  buyerName?: string;
  buyerTaxId?: string;
  buyerAddress?: string;
}

export interface IPointData {
  id: string;
  createdAt: string;
  sourceType: string;
  sourceKey: string;
  amount: number;
  isPositive: boolean;
  user?: {
    id: string;
    name: string | null;
    address: string;
  };
}

export interface ICreditCardData {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  provider: string;
  purpose: string;
  errorMessage?: string;
  user?: {
    id: string;
    name: string | null;
    address: string;
  };
  cardInfo?: {
    type_name?: string;
    last_four?: string;
  };
}
