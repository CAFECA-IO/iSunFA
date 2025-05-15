export interface INotification {
  id: string;
  content: string | JSX.Element;
  isRead: boolean;
  type: NOTIFICATION_TYPE;
  teamName?: string; // Info: (20250515 - Liz) 團隊邀請的團隊名稱
}

export enum NOTIFICATION_TYPE {
  GENERAL = 'general', // Info: (20250515 - Liz) 一般通知
  INVITATION = 'invitation', // Info: (20250515 - Liz) 團隊邀請通知
}
