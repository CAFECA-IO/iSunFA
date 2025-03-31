import { PAYMENT_GATEWAY } from '@/constants/payment';
import { JSONValue } from '@/interfaces/common';
import { ITeamOrder } from '@/interfaces/order';
import { IPaymentInfo } from '@/interfaces/payment';
import { IUser } from '@/interfaces/user';

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
  order: ITeamOrder;
}

export interface IChargeWithTokenOptions {
  order: ITeamOrder;
  user: IUser;
  token: IPaymentInfo;
}

export interface IPaymentGateway {
  getPlatform(): PAYMENT_GATEWAY;
  getCardBindingUrl(options: IGetCardBindingUrlOptions): Promise<string>;
  getChargeUrl(options: IGetChargeUrlOptions): Promise<string>;
  parseAuthorizationToken(token: JSONValue): IPaymentInfo;
  chargeWithToken(options: IChargeWithTokenOptions): Promise<string | undefined>;
}
