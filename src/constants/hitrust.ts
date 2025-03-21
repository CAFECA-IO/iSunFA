const PLATFORM = 'HITRUST';
const URLS = {
  DEV: {
    HANDSHAKE_URL: '',
    CARD_BINDING_URL: '',
    CHARGE_URL: '',
    REQUEST_URL: 'https://testtrustlink.hitrust.com.tw/TrustLink/TrxReqForJava"',
    RETURN_URL: 'https://isunfa.tw/users/subscriptions/:teamId',
    MER_UPDATE_URL: 'https://isunfa.tw/api/v2/payment/update',
  },
  PROD: {
    HANDSHAKE_URL: '',
    CARD_BINDING_URL: '',
    CHARGE_URL: '',
    REQUEST_URL: 'https://trustlink.hitrust.com.tw/TrustLink/TrxReqForJava',
    RETURN_URL: 'https://isunfa.tw/users/subscriptions/:teamId',
    MER_UPDATE_URL: 'https://isunfa.tw/api/v2/payment/update',
  },
};

const HITRUST = {
  PLATFORM,
  URLS,
};

export default HITRUST;
