const PLATFORM = 'OEN';
const URLS = {
  DEV: {
    HANDSHAKE_URL: 'https://payment-api.testing.oen.tw/checkout-token',
    CARD_BINDING_URL: 'https://mermer.testing.oen.tw/checkout/subscription/create/:paymentId',
    CHARGE_URL: 'https://payment-api.mermer.oen.tw/token/transactions',
  },
  PROD: {
    HANDSHAKE_URL: 'https://payment-api.oen.tw/checkout-token',
    CARD_BINDING_URL: 'https://mermer.oen.tw/checkout/subscription/create/:paymentId',
    CHARGE_URL: 'https://payment-api.oen.tw/token/transactions',
  },
};

const OEN = {
  PLATFORM,
  URLS,
};

export default OEN;
