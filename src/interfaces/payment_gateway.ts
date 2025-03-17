import { JSONValue } from '@/interfaces/common';
import { IOrder } from '@/interfaces/order';
import { UserPaymentInfo } from '@prisma/client';

export type IUserPaymentInfo = UserPaymentInfo;

export interface IPaymentGatewayOptions {
  devMode: boolean;
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
  token: JSONValue;
}

export interface IPaymentGateway {
  getPlatform(): string;
  getCardBindingUrl(options: IGetCardBindingUrlOptions): Promise<string>;
  getChargeUrl(options: IGetChargeUrlOptions): Promise<string>;
  parseAuthorizationToken(token: JSONValue): IUserPaymentInfo;
  chargeWithToken(options: IChargeWithTokenOptions): Promise<void>;
}
