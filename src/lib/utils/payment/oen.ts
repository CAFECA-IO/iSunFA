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
import { getTimestampNow } from '@/lib/utils/common';

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
    this.prodMode = !!options.prodMode;
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

  /** Info: (20250318 - Luphia) The token format
      {
        success: true
        purpose: "token"
        merchantId: "mermer"
        transactionId: "2txQvgJNV6YpVZA5KNoxgwwdeWb"
        message: null
        customId: "10000001"
        token: "2txR0HQ12YH4wiB0tH1nk2C1nEp"
        id: "2ttQvgJNV6YpVZA5KNoxgwwdeWb"
      }

      {
        id: number;
        token: string;
        transactionId: string;
        default: boolean;
        userId: number;
        info: JsonValue;
        createdAt: number;
        updatedAt: number;
        deletedAt: number | null;
      }
   */
  parseAuthorizationToken(data: JSONValue): IUserPaymentInfo {
    const nowInSecond = getTimestampNow();
    const { token, customId, transactionId } = data as {
      token: string;
      customId: number;
      transactionId: string;
    };
    // Info: (20250318 - Luphia) The "platform" field is redundant. Do not provide the "id" field when creating new data.
    const result: IUserPaymentInfo = {
      platfrom: this.platform,
      token,
      userId: customId,
      transactionId,
      default: true,
      info: data,
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
      deletedAt: null,
    } as unknown as IUserPaymentInfo;
    return result;
  }

  async chargeWithToken(options: IChargeWithTokenOptions): Promise<void> {
    // ToDo: (20250317 - Luphia) Charge the user with the token.
    const token = this.secret;
    const query = {
      merchantId: this.id,
      token: options.token,
      ...options.order.detail,
    };
    /** Info: (20250317 - Luphia) the response format
     *  {"code":"S0000","data":{"id":"2rbtp5feoNkmrS5y3Ovw1LIp65w"},"message":""}
     *  The id in data is the paymentId.
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
