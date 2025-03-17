import { JSONValue } from '@/interfaces/common';
import OEN from '@/constants/oen';
import {
  IPaymentGateway,
  IUserPaymentInfo,
  IPaymentGatewayOptions,
  IGetCardBindingUrlOptions,
  IGetChargeUrlOptions,
  IChargeWithTokenOptions,
} from '@/interfaces/payment_gateway';

class OenPaymentGateway implements IPaymentGateway {
  private platform: string;

  private handshakeUrl: string = '';

  private cardBindingUrl: string = '';

  private chargeUrl: string = '';

  // Info: (20250317 - Luphia) The Merchant ID in Oen.
  private id: string = '';

  // Info: (20250317 - Luphia) The Access Token in Oen.
  private secret: string = '';

  constructor(options: IPaymentGatewayOptions) {
    this.platform = OEN.PLATFORM;
    this.prodMode = !!options.devMode;
    this.id = options.id;
    this.secret = options.secret;
  }

  set prodMode(isProd: boolean) {
    this.handshakeUrl = isProd ? OEN.URLS.PROD.HANDSHAKE_URL : OEN.URLS.DEV.HANDSHAKE_URL;
    this.cardBindingUrl = isProd ? OEN.URLS.PROD.CARD_BINDING_URL : OEN.URLS.DEV.CARD_BINDING_URL;
    this.chargeUrl = isProd ? OEN.URLS.PROD.CHARGE_URL : OEN.URLS.DEV.CHARGE_URL;
  }

  getPlatform(): string {
    return this.platform;
  }

  async getCardBindingUrl(options: IGetCardBindingUrlOptions): Promise<string> {
    // Info: (20250317 - Luphia) Retrieve the token from Oen to register the credit card.
    const token = this.secret;
    const query = {
      merchantId: this.id,
      customId: options.customId,
      successUrl: options.successUrl,
      failureUrl: options.failureUrl,
    };
    /** Info: (20250317 - Luphia) the response format
     * {"code":"S0000","data":{"id":"2rbtp5feoNkmrS5y3Ovw1LIp65w"},"message":""}
     * The id in data is the paymentId.
     */
    const queryResponse = await fetch(this.handshakeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(query),
    });
    const queryResponseJson = await queryResponse.json();
    const paymentId = queryResponseJson.data.id;
    const result = this.cardBindingUrl.replace(':paymentId', paymentId);
    return result;
  }

  // Deprecated: (20250317 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getChargeUrl(options: IGetChargeUrlOptions): Promise<string> {
    const result = this.chargeUrl;
    return result;
  }

  parseAuthorizationToken(token: JSONValue): IUserPaymentInfo {
    const tokenData = token as Record<string, unknown>;
    const result: IUserPaymentInfo = {
      platform: this.platform,
      ...tokenData,
    } as unknown as IUserPaymentInfo;
    return result;
  }

  async chargeWithToken(options: IChargeWithTokenOptions): Promise<void> {
    // ToDo: (20250317 - Luphia) Charge the user with the token.
    const token = this.secret;
    const query = {
      merchantId: this.id,
      token: options.token,
      amount: options.order.detail,
      currency: options.order.detail,
      customId: options.order.id,
    };
    /** Info: (20250317 - Luphia) the response format
     * {"code":"S0000","data":{"id":"2rbtp5feoNkmrS5y3Ovw1LIp65w"},"message":""}
     * The id in data is the paymentId.
     */
    await fetch(this.chargeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(query),
    });
  }
}

export default OenPaymentGateway;
