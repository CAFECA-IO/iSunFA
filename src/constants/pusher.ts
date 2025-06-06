export enum PRIVATE_CHANNEL {
  NOTIFICATION = 'private-notification',
  CERTIFICATE = 'private-certificate',
  VOUCHER = 'private-voucher',
  REPORT = 'private-report',
  ROOM = 'private-room',
  INVOICE = 'private-invoice',
  USER = 'private-user',
}

export enum CERTIFICATE_EVENT {
  UPLOAD = 'certificate-upload',
  CREATE = 'certificate-create',
  UPDATE = 'certificate-update',
  ANALYSIS = 'certificate-analysis',
  DELETE = 'certificate-delete',
}

export enum INVOICE_EVENT {
  CREATE = 'invoice-create',
  UPDATE = 'invoice-update',
  DELETE = 'invoice-delete',
}

export enum ROOM_EVENT {
  JOIN = 'room-join',
  NEW_FILE = 'room-new-file',
  DELETE = 'room-delete',
}

export enum NOTIFICATION_EVENT {
  NEW = 'notification:new',
}
