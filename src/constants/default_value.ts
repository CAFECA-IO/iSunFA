import { ONE_DAY_IN_MS, ONE_HOUR_IN_MS } from '@/constants/time';

// Info: (20241128 - Luphia) Default Value for Undefined Parameter
export const DefaultValue = {
  IP: 'UNKNOWN_IP',
  DEVICE_ID: 'UNKNOWN_DEVICE',
  USER_AGENT: 'UNKNOWN_AGENT',
  CERTIFICATE_ID: {
    PROCESSING: 0,
    UNKNOWN: 555,
  },
  COMPANY_ID: {
    PROCESSING: 0,
    UNKNOWN: 555,
  },
  COUNTER_PARTY_ID: {
    PROCESSING: 0,
    UNKNOWN: 555,
  },
  FILE_ID: {
    PROCESSING: 0,
    UNKNOWN: 555,
  },
  USER_ID: {
    PROCESSING: 0,
    GUEST: 1,
    SYSTEM: 2,
    UNKNOWN: 555,
  },
  ROLE_ID: {
    UNKNOWN: 555,
  },
  SESSION_ID: 'GUEST',
  SESSION_OPTION: {
    GC_INTERVAL: ONE_DAY_IN_MS,
    SESSION_EXPIRE: ONE_HOUR_IN_MS,
    FILE_PATH: './session.store',
    SECRET: 'SECRET',
  },
  PAGE: 1,
  TOTAL_PAGES: 1,
  PAGE_SIZE: 10,
  TEAM_ID: {
    UNKNOWN: 0,
  },
  TEAM_ROLE: {
    UNKNOWN: 'UNKNOWN',
  },
  PAYMENT_METHOD_NUMBER: '**** **** **** ****',
  PAYMENT_METHOD_EXPIRATION_DATE: '**/**',
  PAYMENT_METHOD_CVV: '***',
  BASIC_MEMBER_COUNT: 3,
  EMAIL_LOGIN: {
    EMAIL: ['user@isunfa.com', 'user1@isunfa.com', 'user2@isunfa.com', 'user3@isunfa.com'],
    CODE: '555666',
  },
};
