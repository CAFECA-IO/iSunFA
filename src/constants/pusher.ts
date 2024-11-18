export enum PRIVATE_CHANNEL {
  NOTIFICATION = 'private-notification',
  CERTIFICATE = 'certificate', // TODO: (20241009 - tzuhan) update to 'private-certificate',
  VOUCHER = 'private-voucher',
  REPORT = 'private-report',
  ROOM = 'room', // TODO: (20241111 - tzuhan) update to 'private-room',
}

export enum CERTIFICATE_EVENT {
  UPLOAD = 'certificate-upload',
  CREATE = 'certificate-create',
  UPDATE = 'certificate-update',
  ANALYSIS = 'certificate-analysis',
  DELETE = 'certificate-delete',
}

export enum ROOM_EVENT {
  JOIN = 'room-join',
  NEW_FILE = 'room-new-file',
  DELETE = 'room-delete',
}
