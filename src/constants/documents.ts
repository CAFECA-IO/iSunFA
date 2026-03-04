export const ALLOWED_DOCS = [
  'terms_of_service',
  'privacy_policy',
  'business_license',
  'refund_policy',
] as const;

export type AllowedDocument = (typeof ALLOWED_DOCS)[number];
