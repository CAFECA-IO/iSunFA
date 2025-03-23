import HITRUST from '@/constants/hitrust';
import {
  IPaymentGateway,
  IPaymentGatewayOptions,
  IGetCardBindingUrlOptions,
  IGetChargeUrlOptions,
  IChargeWithTokenOptions,
} from '@/interfaces/payment_gateway';
import { IPaymentInfo } from '@/interfaces/payment';
import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { DefaultValue } from '@/constants/default_value';
import { getTimestampNow } from '@/lib/utils/common';
import { JSONValue } from '@/interfaces/common';

// Info: (20250320 - Tzuhan) Hitrust 付款方法
//   <form
//     className="w-full"
//     method="POST"
//     action="https://testtrustlink.hitrust.com.tw/TrustLink/TrxReqForJava"
//     onSubmit={() => {
//       window.onbeforeunload = null; // Info: (20250220 - Tzuhan) 移除「離開網站」的提示
//     }}
//   >
//     <input type="hidden" name="Type" value="Auth" />
//     <input type="hidden" name="storeid" value="62695" />
//     <input
//       type="hidden"
//       name="ordernumber"
//       value={`${team.id}${plan?.planName || ''}${isAutoRenewalEnabled}`}
//     />
//     <input type="hidden" name="amount" value={(plan?.price || 0) * 100} />
//     <input
//       type="hidden"
//       name="orderdesc"
//       value={`iSunFa-team_${team.id}-plan_${plan?.planName}-autorenew_${isAutoRenewalEnabled}-
//       time_${Math.floor(Date.now() / 1000)}`}
//     />
//     <input type="hidden" name="depositflag" value="1" /> {/* 自動請款 */}
//     <input type="hidden" name="queryflag" value="1" /> {/* 回傳交易詳情 */}
//     <input
//       type="hidden"
//       name="returnURL"
//       value={`https://isunfa.tw/users/subscriptions/${team.id}`}
//     />
//     <input type="hidden" name="merUpdateURL" value="https://isunfa.tw/api/v2/payment/update" />
//     {/* 如果用戶選擇「自動續訂」，則設定定期扣款 */}
//     {isAutoRenewalEnabled && (
//       <>
//         <input type="hidden" name="e56" value="20" /> {/* 12 期 */}
//         <input type="hidden" name="e57" value="1" /> {/* 每 1 期扣款 */}
//         <input type="hidden" name="e58" value="Y" /> {/* M = 每月扣款 */}
//       </>
//     )}
//     <button
//       type="submit"
//       className="w-full rounded-xs bg-button-surface-strong-primary px-32px py-14px text-lg font-semibold text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
//       // onClick={updateSubscription}
//       disabled={(plan?.price || 0) <= 0}
//     >
//       {t('subscriptions:PAYMENT_PAGE.SUBSCRIBE')}
//     </button>
//   </form>

class HitrustPaymentGateway implements IPaymentGateway {
  private platform: string = HITRUST.PLATFORM;

  private requestUrl!: string;

  private returnUrl!: string;

  private merUpdateUrl!: string;

  private handshakeUrl: string = '';

  private cardBindingUrl: string = '';

  private chargeUrl: string = '';

  private storeId: string;

  constructor(options: IPaymentGatewayOptions) {
    this.storeId = options.id;
    this.setMode(!!options.prodMode);
  }

  /**
   * Info: (20250320 - Tzuhan)
   * Hitrust 使用表單提交，因此 `chargeWithToken()` **不適用**，丟出錯誤
   * */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chargeWithToken(options: IChargeWithTokenOptions): Promise<boolean> {
    throw new Error(`Method not implemented. url: ${this.chargeUrl}`);
  }

  private setMode(isProd: boolean) {
    const env = isProd ? HITRUST.URLS.PROD : HITRUST.URLS.DEV;
    this.requestUrl = env.REQUEST_URL;
    this.returnUrl = env.RETURN_URL;
    this.merUpdateUrl = env.MER_UPDATE_URL;
  }

  getPlatform(): string {
    return this.platform;
  }

  /**
   * Info: (20250320 - Tzuhan)
   * Hitrust 使用表單提交，因此 `getCardBindingUrl()` **不適用**，回傳空字串
   * */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getCardBindingUrl(options: IGetCardBindingUrlOptions): Promise<string> {
    return Promise.resolve(this.cardBindingUrl);
  }

  /**
   * Info: (20250320 - Tzuhan)
   * Hitrust 透過表單提交，不直接提供 `chargeUrl`，回傳 `requestUrl`
   * */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getChargeUrl(options: IGetChargeUrlOptions): Promise<string> {
    return this.requestUrl;
  }

  /**
   * Info: (20250320 - Tzuhan)解析授權 Token
   */
  parseAuthorizationToken(data: JSONValue): IPaymentInfo {
    const nowInSecond = getTimestampNow();
    const { token, customId, transactionId } = data as {
      token: string;
      customId: string;
      transactionId: string;
    };

    return {
      platform: this.platform,
      token,
      userId: Number(customId),
      transactionId,
      default: true,
      detail: {
        type: PAYMENT_METHOD_TYPE.OTHER,
        number: DefaultValue.PAYMENT_METHOD_NUMBER.slice(0, -4),
        expirationDate: DefaultValue.PAYMENT_METHOD_EXPIRATION_DATE,
        cvv: DefaultValue.PAYMENT_METHOD_CVV,
      },
      createdAt: nowInSecond,
      updatedAt: nowInSecond,
    };
  }

  /**
   * Info: (20250320 - Tzuhan)動態生成 Hitrust 付款表單並提交
   */
  createAndSubmitPaymentForm(options: {
    teamId: string;
    planName: string;
    amount: number;
    isAutoRenewalEnabled: boolean;
  }) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = this.requestUrl;
    form.style.display = 'none';

    const fields: Record<string, string> = {
      Type: 'Auth',
      storeid: this.storeId,
      ordernumber: `${options.teamId}${options.planName}${options.isAutoRenewalEnabled}`,
      amount: String(options.amount * 100), // Info: (20250320 - Tzuhan)轉成分
      orderdesc: `iSunFa-team_${options.teamId}-plan_${options.planName}-autorenew_${options.isAutoRenewalEnabled}-time_${Math.floor(Date.now() / 1000)}`,
      depositflag: '1', // Info: (20250320 - Tzuhan)自動請款
      queryflag: '1', // Info: (20250320 - Tzuhan)回傳交易詳情
      returnURL: this.returnUrl.replace(':teamId', options.teamId),
      merUpdateURL: this.merUpdateUrl,
    };

    // Info: (20250320 - Tzuhan)產生輸入欄位
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    // Info: (20250320 - Tzuhan)如果啟用自動續訂
    if (options.isAutoRenewalEnabled) {
      [
        ['e56', '20'],
        ['e57', '1'],
        ['e58', 'Y'],
      ].forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
    }

    // Info: (20250320 - Tzuhan)移除「離開網站」的提示
    window.onbeforeunload = null;

    document.body.appendChild(form);
    form.submit();
  }
}

export default HitrustPaymentGateway;
