import { INotificationRC2, NotificationEvent, NotificationType } from '@/interfaces/notification';
import { useTranslation } from 'next-i18next';
import { cn } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';

type NotificationItemProps = {
  notification: INotificationRC2;
  onMarkAsRead: (id: number) => void;
};

const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  const { t } = useTranslation(['dashboard']);
  const { id, title, message, read, type, event, content } = notification;
  const { teamName } = content;

  const { trigger: acceptAccountBookTransfer } = APIHandler<void>(
    APIName.ACCEPT_TRANSFER_ACCOUNT_BOOK
  );
  const { trigger: declineAccountBookTransfer } = APIHandler<void>(
    APIName.DECLINE_TRANSFER_ACCOUNT_BOOK
  );
  const { trigger: cancelAccountBookTransfer } = APIHandler<void>(
    APIName.CANCEL_TRANSFER_ACCOUNT_BOOK
  );
  const { trigger: acceptTeamInvitation } = APIHandler<void>(APIName.ACCEPT_TEAM_INVITATION);
  const { trigger: declineTeamInvitation } = APIHandler<void>(APIName.DECLINE_TEAM_INVITATION);

  // ToDo: (20250516 - Liz) 打 API 接受團隊邀請
  // ToDo: (20250516 - Liz) 打 API 拒絕團隊邀請

  if (type === NotificationType.GENERAL) {
    return (
      <section className="p-12px">
        <button
          type="button"
          onMouseEnter={() => onMarkAsRead(id)}
          className={cn('line-clamp-3 text-start text-base font-medium text-text-neutral-primary', {
            'text-text-neutral-tertiary': read,
            'hover:bg-surface-neutral-surface-lv1 hover:text-text-neutral-link': !read,
          })}
        >
          {message}
        </button>
      </section>
    );
  }

  if (type === NotificationType.INVITATION) {
    return (
      <div
        className={`flex flex-col gap-16px bg-surface-neutral-surface-lv2 p-12px font-medium text-text-neutral-primary hover:bg-surface-neutral-surface-lv1`}
      >
        {`${title} ${teamName}`}

        <div className="flex items-center justify-center gap-15px">
          <button
            type="button"
            className="rounded-xs bg-button-surface-strong-secondary px-16px py-8px text-button-text-invert hover:bg-button-surface-strong-secondary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            onClick={async () => {
              await acceptTeamInvitation({ params: { teamId: notification.teamId } });
              onMarkAsRead(id);
            }}
          >
            {t('dashboard:HEADER.ACCEPT')}
          </button>
          <button
            type="button"
            className="rounded-xs border border-button-stroke-secondary px-16px py-8px text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover disabled:text-button-text-disable"
            onClick={async () => {
              await declineTeamInvitation({ params: { teamId: notification.teamId } });
              onMarkAsRead(id);
            }}
          >
            {t('dashboard:HEADER.DECLINE')}
          </button>
        </div>
      </div>
    );
  }
  if (type === NotificationType.ACCOUNT_BOOK) {
    const { accountBookId } = notification.content;

    const isTransferInitiator = message.includes('已發起帳本轉移請求');

    const handleAccept = async () => {
      await acceptAccountBookTransfer({
        params: { accountBookId },
      });
      onMarkAsRead(id);
    };

    const handleDecline = async () => {
      await declineAccountBookTransfer({
        params: { accountBookId },
      });
      onMarkAsRead(id);
    };

    const handleCancel = async () => {
      await cancelAccountBookTransfer({
        params: { accountBookId },
      });
      onMarkAsRead(id);
    };

    return (
      <section className="flex flex-col gap-8px rounded-md bg-surface-neutral-surface-lv2 p-12px">
        <p className="text-base font-medium text-text-neutral-primary">{message}</p>
        {event === NotificationEvent.TRANSFER && (
          <div className="flex justify-end gap-8px">
            {isTransferInitiator ? (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded border border-button-stroke-secondary px-12px py-6px text-sm text-red-500 hover:border-red-500 hover:text-red-600"
              >
                取消轉移
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="rounded bg-button-surface-strong-secondary px-12px py-6px text-sm text-white hover:bg-button-surface-strong-secondary-hover"
                >
                  接受轉移
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  className="rounded border border-button-stroke-secondary px-12px py-6px text-sm text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover"
                >
                  拒絕
                </button>
              </>
            )}
          </div>
        )}
      </section>
    );
  }

  return null;
};

export default NotificationItem;
