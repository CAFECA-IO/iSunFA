export enum PRIVATE_CHANNEL {
  NOTIFICATION = 'private-notification',
  CERTIFICATE = 'certificate', // TODO: (20241009 - tzuhan) update to 'private-certificate',
  VOUCHER = 'private-voucher',
  REPORT = 'private-report',
}

export enum CERTIFICATE_EVENT {
  UPLOAD = 'certificate-upload',
  CREATE = 'certificate-create',
  UPDATE = 'certificate-update',
  ANALYSIS = 'certificate-analysis',
  DELETE = 'certificate-delete',
}
