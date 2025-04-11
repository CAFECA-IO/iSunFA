import { CurrencyType } from '@/constants/currency';

/** Info: (20250318 - Luphia) The order information for Oen.
 *  {
 *    "merchantId": "mermer",
 *    "amount": 1,
 *    "currency": "TWD",
 *    "orderId": "ORDER00001",
 *    "userName": "Luphia",
 *    "userEmail": "luphia.chang@mermer.com.tw",
 *    "productDetails": [
 *      {
 *        "productionCode": "ISUNFAM3-001",
 *        "description": "iSunFAM3 Premium Subscription",
 *        "quantity": 1,
 *        "unit": "pcs",
 *        "unitPrice": 1
 *      }
 *    ]
 *  }
 */
export interface IOrderOen {
  amount: number;
  currency: string;
  orderId: string;
  userName: string;
  userEmail: string;
  productDetails: IOrderDetailOen[];
}

export interface IOrderDetailOen {
  productionCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface IProductDetail {
  productionId: string;
  productionName: string;
  productionCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface ITeamOrderDetail {
  id?: number;
  orderId?: number;
  productId: number;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  currency: string;
  amount: number;
}

export interface ITeamOrder {
  id?: number;
  userId: number;
  teamId: number;
  status: string;
  amount: number;
  details: ITeamOrderDetail[];
  currency: CurrencyType;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

// Deprecated: (20250328 - Luphia) 這個 interface 會被 ITeamOrderDetail 取代
export interface IOrderDetail {
  amount: number;
  currency: string;
  orderId: string;
  userName: string;
  userEmail: string;
  productDetails: IProductDetail[];
}

// Deprecated: (20250328 - Luphia) 這個 interface 會被 ITeamOrder 取代
export interface IOrder {
  id?: number;
  userId: number;
  teamId: number;
  status: string;
  detail: IOrderDetail;
  createdAt: number;
  updatedAt: number;
}
