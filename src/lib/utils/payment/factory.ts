import { PAYMENT_GATEWAY } from '@/constants/payment';
import OenPaymentGateway from '@/lib/utils/payment/oen';
import { IPaymentGateway, IPaymentGatewayOptions } from '@/interfaces/payment_gateway';

// Info: (20250318 - Luphia) Create payment gateway instance.
export const createPaymentGateway = (options: IPaymentGatewayOptions): IPaymentGateway => {
  const { platform } = options;
  let paymentGateway;
  switch (platform) {
    case PAYMENT_GATEWAY.OEN:
      paymentGateway = new OenPaymentGateway(options);
      break;
    default:
      throw new Error(`Unsupported payment gateway: ${platform}`);
  }
  return paymentGateway;
};
