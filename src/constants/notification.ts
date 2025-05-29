import { INotification, NOTIFICATION_TYPE } from '@/interfaces/notification';

// ToDo: (20250515 - Liz) 未來要從後端取得通知資料，需求: API 提供不同語言的通知內容 (content)
export const FAKE_NOTIFICATIONS: INotification[] = [
  {
    id: '1',
    content: 'You have a team invitation from ',
    isRead: false,
    type: NOTIFICATION_TYPE.INVITATION,
    teamName: 'Example Team',
  },
  {
    id: '2',
    content: 'Hello! Welcome to iSunFA!',
    isRead: false,
    type: NOTIFICATION_TYPE.GENERAL,
  },
  {
    id: '3',
    content: 'This is a test notification which is already read. So its color is gray.',
    isRead: true,
    type: NOTIFICATION_TYPE.GENERAL,
  },
  {
    id: '4',
    content: 'You have a team invitation from ',
    isRead: false,
    type: NOTIFICATION_TYPE.INVITATION,
    teamName: 'B Team',
  },
  {
    id: '5',
    content:
      'This is a test notification, in order to test whether the notification message panel is successfully displayed. This is a test notification, in order to test whether the notification message panel is successfully displayed. This is a test notification, in order to test whether the notification message panel is successfully displayed. This is a test notification, in order to test whether the notification message panel is successfully displayed.',
    isRead: false,
    type: NOTIFICATION_TYPE.GENERAL,
  },
];
