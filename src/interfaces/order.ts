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
export interface IProductDetail {
  productionId: string;
  productionName: string;
  productionCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface IOrderDetail {
  amount: number;
  currency: string;
  orderId: string;
  userName: string;
  userEmail: string;
  productDetails: IProductDetail[];
}

export interface IOrder {
  id: number;
  userId: number;
  companyId: number;
  planId: number;
  status: string;
  detail: IOrderDetail;
  createdAt: number;
  updatedAt: number;
}
