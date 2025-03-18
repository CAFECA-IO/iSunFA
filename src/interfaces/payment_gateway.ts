import { JSONValue } from '@/interfaces/common';
import { IOrder } from '@/interfaces/order';
import { UserPaymentInfo } from '@prisma/client';

// Info: (20250318 - Luphia) 基本參照 UserPaymentInfo，獨 id 改為 optional
export type IUserPaymentInfo = UserPaymentInfo;

export interface IPaymentGatewayOptions {
  platform: string;
  prodMode: boolean;
  id: string;
  secret: string;
}

export interface IGetCardBindingUrlOptions {
  successUrl: string;
  failureUrl: string;
  customId: string;
}

export interface IGetChargeUrlOptions {
  order: IOrder;
}

export interface IChargeWithTokenOptions {
  order: IOrder;
  token: IUserPaymentInfo;
}

export interface IPaymentGateway {
  getPlatform(): string;
  getCardBindingUrl(options: IGetCardBindingUrlOptions): Promise<string>;
  getChargeUrl(options: IGetChargeUrlOptions): Promise<string>;
  parseAuthorizationToken(token: JSONValue): IUserPaymentInfo;
  chargeWithToken(options: IChargeWithTokenOptions): Promise<void>;
}
