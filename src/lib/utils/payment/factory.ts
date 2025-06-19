import { PAYMENT_GATEWAY } from '@/constants/payment';
import OenPaymentGateway from '@/lib/utils/payment/oen';
import { IPaymentGateway, IPaymentGatewayOptions } from '@/interfaces/payment_gateway';
import HitrustPaymentGateway from '@/lib/utils/payment/hitrust';
import { PAYMENT } from '@/constants/service';
import { isProd } from '@/lib/utils/common';

const paymentGatewayOptions: IPaymentGatewayOptions = {
  platform: PAYMENT.OEN,
  prodMode: isProd(),
  id: process.env.PAYMENT_ID as string,
  secret: process.env.PAYMENT_TOKEN as string,
};

// Info: (20250318 - Luphia) Create payment gateway instance.
export const createPaymentGateway = (): IPaymentGateway => {
  const options = paymentGatewayOptions;
  const { platform } = options;
  let paymentGateway;
  switch (platform) {
    case PAYMENT_GATEWAY.OEN:
      paymentGateway = new OenPaymentGateway(options);
      break;
    case PAYMENT_GATEWAY.HITRUST:
      paymentGateway = new HitrustPaymentGateway(options);
      break;
    default:
      throw new Error(`Unsupported payment gateway: ${platform}`);
  }
  return paymentGateway;
};
