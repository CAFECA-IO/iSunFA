export enum NotificationLevel {
  DEBUG = 1,
  NORMAL = 2,
  IMPORTANT = 3,
  URGENT = 4,
}

export interface INotification {
  id: string;
  title: string;
  content: string;
  level: NotificationLevel;
  isRead: boolean;
  public: boolean;
  createdAt: number;
  expiration: number;
}

export const DUMMY_NOTIFICATION_LIST: INotification[] = [
  {
    id: 'l1hgsras',
    title:
      'Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum quibusdam quos voluptatem......',
    content:
      'Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum quibusdam quos voluptatem......',
    level: NotificationLevel.URGENT,
    isRead: false,
    public: true,
    createdAt: 1717634352,
    expiration: 9999999999999,
  },
  {
    id: 'gj5dfg',
    title:
      'Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum quibusdam quos voluptatem......',
    content:
      'Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum quibusdam quos voluptatem......',
    level: NotificationLevel.URGENT,
    isRead: true,
    public: true,
    createdAt: 1714955952,
    expiration: 9999999999999,
  },
  {
    id: 'jndfg9x',
    title:
      'Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum quibusdam quos voluptatem......',
    content:
      'Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum quibusdam quos voluptatem......',
    level: NotificationLevel.URGENT,
    isRead: false,
    public: true,
    createdAt: 1712363952,
    expiration: 1717634352,
  },
  {
    id: 'moskdjnf',
    title:
      'Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum quibusdam quos voluptatem......',
    content:
      'Sint et veniam commodi eaque nesciunt adipisci ea illo. Velit fugit eum dolorum rerum quibusdam quos voluptatem......',
    level: NotificationLevel.URGENT,
    isRead: false,
    public: true,
    createdAt: 1702363952,
    expiration: 9999999999999,
  },
];
