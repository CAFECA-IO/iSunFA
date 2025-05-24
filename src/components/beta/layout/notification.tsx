import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { PiBell } from 'react-icons/pi';
import NotificationItem from '@/components/beta/layout/notification_item';
import { useTranslation } from 'next-i18next';
// import { FAKE_NOTIFICATIONS } from '@/constants/notification';
import { INotificationRC2 } from '@/interfaces/notification';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { getPusherInstance } from '@/lib/utils/pusher_client';
import { NOTIFICATION_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';

interface NotificationProps {
  isPanelOpen: boolean;
  setIsPanelOpen: Dispatch<SetStateAction<boolean>>;
  toggleNotificationPanel?: () => void;
}

const Notification = ({
  isPanelOpen,
  setIsPanelOpen,
  toggleNotificationPanel = () => setIsPanelOpen((prev) => !prev),
}: NotificationProps) => {
  const { t } = useTranslation(['dashboard']);
  const userCtx = useUserCtx();
  const { userAuth } = userCtx;

  const { trigger: listNotifications } = APIHandler<INotificationRC2[]>(APIName.LIST_NOTIFICATION);
  const { trigger: readNotification } = APIHandler<{ count: number }>(APIName.READ_NOTIFICATION);

  const [notifications, setNotifications] = useState<INotificationRC2[]>([]);
  const isNoData = notifications.length === 0;
  const hasUnreadNotifications = notifications.some((notification) => !notification.read);

  // ToDo: (20250516 - Liz) 打 API 取得通知 (useEffect)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getNotifications = async () => {
    if (!userAuth) return;
    const { success, data } = await listNotifications({
      params: { userId: userAuth.id },
    });
    if (success && data) {
      setNotifications(data);
    }
  };

  // ToDo: (20241225 - Liz) 打 API 更新通知為已讀
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const readNotificationAPI = () => {};

  // Info: (20241225 - Liz) 標記通知為已讀
  const onMarkAsRead = async (notificationId: number) => {
    const notificationIndex = notifications.findIndex((n) => n.id === notificationId);
    // Info: (20241225 - Liz) 如果通知不存在或已讀，則不執行任何操作
    if (notificationIndex === -1 || notifications[notificationIndex].read) {
      return;
    }

    try {
      // ToDo: (20241225 - Liz) 呼叫 API 標記為已讀
      await readNotification({ params: { userId: userAuth?.id, notificationId } });

      // ToDo: (20241225 - Liz) 更新本地狀態
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      // Deprecated: (20250516 - Liz)
      // eslint-disable-next-line no-console
      console.log(`Failed to mark notification ${notificationId} as read`, error);
    }
  };

  const handleOpenPanel = async () => {
    if (!isPanelOpen) {
      await getNotifications();
    }
    toggleNotificationPanel();
  };

  const handleNewNotification = useCallback((data: { message: string }) => {
    const newNotification: INotificationRC2 = JSON.parse(data.message);
    setNotifications((prev) => [...prev, newNotification]);
  }, []);

  useEffect(() => {
    if (!userAuth?.id) return () => {};
    const pusher = getPusherInstance(userAuth.id);
    const channel = pusher.subscribe(`${PRIVATE_CHANNEL.NOTIFICATION}-${userAuth.id}`);
    channel.bind(NOTIFICATION_EVENT.NEW, handleNewNotification);

    return () => {
      if (channel) {
        channel.unbind(NOTIFICATION_EVENT.NEW, handleNewNotification);
        channel.unsubscribe();
      }
      pusher.unsubscribe(`${PRIVATE_CHANNEL.NOTIFICATION}-${userAuth.id}`);
    };
  }, [userAuth?.id]);

  return (
    <section className="relative">
      {/* Info: (20241011 - Liz) 通知鈴鐺 icon */}
      <button
        type="button"
        onClick={handleOpenPanel}
        className="relative p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
      >
        <PiBell size={20} className="cursor-pointer" />
        {hasUnreadNotifications && (
          <span className="absolute right-11px top-11px h-8px w-8px rounded-full border border-avatar-stroke-primary bg-surface-state-error"></span>
        )}
      </button>

      {/* Info: (20241011 - Liz) 通知訊息面板 */}
      {isPanelOpen && (
        <div className="absolute right-0 top-full z-100 mt-10px flex w-400px flex-col rounded-lg bg-surface-neutral-surface-lv2 px-24px py-12px shadow-Dropshadow_M">
          <button
            type="button"
            className="flex items-center gap-4px self-end rounded-xs px-16px py-8px text-button-text-secondary hover:bg-button-surface-soft-secondary-hover disabled:text-button-text-disable"
          >
            <FiCheckCircle size={16} />
            <span className="text-sm font-medium">{t('dashboard:HEADER.MARK_AS_ALL_READ')}</span>
          </button>

          <section className="max-h-60vh overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
              />
            ))}
          </section>

          {isNoData && (
            <p className="p-12px text-center text-base font-medium text-text-neutral-tertiary">
              {t('dashboard:HEADER.NO_NEW_NOTIFICATIONS')}
            </p>
          )}

          <button type="button" className="self-end text-sm font-semibold text-link-text-primary">
            {t('dashboard:HEADER.READ_MORE')}
          </button>
        </div>
      )}
    </section>
  );
};

export default Notification;
