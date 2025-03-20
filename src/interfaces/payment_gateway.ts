import { JSONValue } from '@/interfaces/common';
import { IOrder } from '@/interfaces/order';
import { IPaymentInfo } from '@/interfaces/payment';

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
  token: IPaymentInfo;
}

export interface IPaymentGateway {
  getPlatform(): string;
  getCardBindingUrl(options: IGetCardBindingUrlOptions): Promise<string>;
  getChargeUrl(options: IGetChargeUrlOptions): Promise<string>;
  parseAuthorizationToken(token: JSONValue): IPaymentInfo;
  chargeWithToken(options: IChargeWithTokenOptions): Promise<boolean>;
}
