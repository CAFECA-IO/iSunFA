import { JSONValue } from '@/interfaces/common';
import OEN from '@/constants/oen';
import { IPaymentInfo, IPaymentMethod } from '@/interfaces/payment';
import {
  IPaymentGateway,
  IPaymentGatewayOptions,
  IGetCardBindingUrlOptions,
  IGetChargeUrlOptions,
  IChargeWithTokenOptions,
} from '@/interfaces/payment_gateway';
import { getTimestampNow } from '@/lib/utils/common';
import { PAYMENT_GATEWAY, PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { DefaultValue } from '@/constants/default_value';
import { HttpMethod } from '@/constants/api_connection';
import { teamOrderToOrderOen } from '@/lib/utils/formatter/order.formatter';

class OenPaymentGateway implements IPaymentGateway {
  private platform: PAYMENT_GATEWAY;

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

  getPlatform(): PAYMENT_GATEWAY {
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
      method: HttpMethod.POST,
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
   *  {
   *    success: true
   *    purpose: "token"
   *    merchantId: "mermer"
   *    transactionId: "2txQvgJNV6YpVZA5KNoxgwwdeWb"
   *    message: null
   *    customId: "10000001"
   *    token: "2txR0HQ12YH4wiB0tH1nk2C1nEp"
   *    id: "2xsQvgJNV6YpVZA5KNoxgwwdeWb"
   *  }
   */
  parseAuthorizationToken(data: JSONValue): IPaymentInfo {
    const nowInSecond = getTimestampNow();
    const { token, customId, transactionId } = data as {
      token: string;
      customId: string;
      transactionId: string;
    };
    const paymentMethod: IPaymentMethod = {
      type: PAYMENT_METHOD_TYPE.OTHER,
      number: DefaultValue.PAYMENT_METHOD_NUMBER.slice(0, -4),
      expirationDate: DefaultValue.PAYMENT_METHOD_EXPIRATION_DATE,
      cvv: DefaultValue.PAYMENT_METHOD_CVV,
    };
    // Info: (20250318 - Luphia) The "platform" field is redundant.
    const result: IPaymentInfo = {
      platform: this.platform,
      token,
      userId: Number(customId),
      transactionId,
      default: true,
      detail: paymentMethod,
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
    };
    return result;
  }

  /** Info: (20250319 - Luphia) Charge data format
   *  {
   *    "merchantId": "mermer",
   *    "amount": 1,
   *    "currency": "TWD",
   *    "token": "2xsSuVZNCWpYME2hGHbWRA1u8KX",
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
   *
   *  fail: {
   *    "code": "A0001",
   *    "data": {},
   *    "message": "Unauthorized"
   *  }
   *
   *  success: {
   *    "code": "S0000",
   *    "data": {
   *      "id": "P202210139EKASEJ7",
   *      "authCode": "831000"
   *    },
   *    "message": ""
   *  }
   */
  async chargeWithToken(options: IChargeWithTokenOptions): Promise<string | undefined> {
    // ToDo: (20250317 - Luphia) Charge the user with the token.
    const token = this.secret;
    const order = teamOrderToOrderOen(options.order, options.user);
    const query = {
      merchantId: this.id,
      token: options.token,
      ...order,
    };
    /** Info: (20250317 - Luphia) the response format
     *  {"code":"S0000","data":{"id":"2rbtp5feoNkmrS5y3Ovw1LIp65w"},"message":""}
     *  The id in data is the paymentId.
     */
    const response = await fetch(this.chargeUrl, {
      method: HttpMethod.POST,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(query),
    });
    const responseData = await response.json();
    const success = responseData.code.startsWith('S');
    const result = success ? responseData.data.id : undefined;
    return result;
  }
}

export default OenPaymentGateway;
