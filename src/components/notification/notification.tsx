import { useTranslation } from 'next-i18next';
import React, { Dispatch, SetStateAction, useState } from 'react';
import { Button } from '@/components/button/button';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { cn } from '@/lib/utils/common';
import { DUMMY_NOTIFICATION_LIST, INotification } from '@/interfaces/notification';

type TranslateFunction = (s: string) => string;
interface INotificationProps {
  mobileMenuIsOpen?: boolean;
  setMobileMenuIsOpen?: Dispatch<SetStateAction<boolean>>;
}

const Notification = ({ mobileMenuIsOpen, setMobileMenuIsOpen }: INotificationProps) => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const [openMenu, setOpenMenu] =
    typeof setMobileMenuIsOpen !== 'function'
      ? useState(false)
      : [mobileMenuIsOpen, setMobileMenuIsOpen];
  const [notifications, setNotifications] = useState<INotification[]>(DUMMY_NOTIFICATION_LIST);

  const {
    targetRef: globalRef,
    componentVisible: globalVisible,
    setComponentVisible: setGlobalVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const desktopClickHandler = () => {
    setGlobalVisible(!globalVisible);
  };
  const mobileClickHandler = () => {
    setOpenMenu(!openMenu);
  };

  const markAsRead = (id: string) => {
    setNotifications(
      (prevNotifications) =>
        // Info: prettier 排版 (20240606 - Shirley)
        // eslint-disable-next-line implicit-arrow-linebreak
        prevNotifications.map((notification) => {
          return notification.id === id ? { ...notification, isRead: true } : notification;
        })
      // Info: prettier 排版 (20240606 - Shirley)
      // eslint-disable-next-line function-paren-newline
    );
  };

  const markAllAsRead = () => {
    setNotifications(
      (prevNotifications) =>
        // Info: prettier 排版 (20240606 - Shirley)
        // eslint-disable-next-line implicit-arrow-linebreak
        prevNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      // Info: prettier 排版 (20240606 - Shirley)
      // eslint-disable-next-line function-paren-newline
    );
  };

  const displayedDesktopMenu = (
    <div className="relative mx-auto hidden max-w-1920px lg:flex">
      <div
        className={`absolute right-0 top-6 z-20 w-350px ${
          globalVisible ? 'visible opacity-100' : 'invisible opacity-0'
        } rounded-md bg-white shadow-dropmenu transition-all duration-300`}
      >
        <div className="flex w-full justify-end">
          <Button
            onClick={markAllAsRead}
            variant={'secondaryBorderless'}
            className="mx-2 my-2 flex w-fit self-end px-2 py-1 hover:text-text-neutral-link"
          >
            <div className="">
              {' '}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 16 16"
              >
                <path
                  className="fill-current"
                  fillRule="evenodd"
                  d="M10.309 2.825a5.667 5.667 0 103.36 5.18v-.613a1 1 0 112 0v.613A7.667 7.667 0 1111.123.999a1 1 0 01-.814 1.827zm5.067-.865a1 1 0 010 1.415L8.71 10.048a1 1 0 01-1.415 0l-2-2A1 1 0 016.71 6.634l1.293 1.293 5.96-5.966a1 1 0 011.414 0z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
            <div className="">{t('NAV_BAR.MARK_ALL_AS_READ')}</div>
          </Button>
        </div>

        <ul className="mx-8 pb-0 pt-0 text-base text-button-text-secondary">
          {notifications.map((item) => (
            <li key={item.id} onClick={() => markAsRead(item.id)}>
              <div
                id={`${item.content.toUpperCase()}ButtonDesktop`}
                className={cn(
                  'my-5 block rounded-none text-start text-text-neutral-primary',
                  item.isRead
                    ? 'text-text-neutral-tertiary'
                    : 'hover:cursor-pointer hover:text-text-neutral-link'
                )}
              >
                {item.title}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex w-full justify-end">
          <Button
            variant={'secondaryBorderless'}
            className="mx-2 my-2 flex w-fit self-end px-2 py-1 text-text-neutral-link hover:text-text-neutral-link hover:opacity-70"
          >
            {t('NAV_BAR.READ_MORE')}
          </Button>
        </div>
      </div>
    </div>
  );

  // TODO: ongoing development of mobile menu (20240606 - Shirley)
  const displayedMobileMenu = (
    <div
      className={`transition-all duration-300 ${
        openMenu ? 'visible opacity-100' : 'invisible opacity-0'
      } lg:hidden`}
    >
      <div className="absolute left-0 top-28 z-10 h-full w-screen bg-white shadow">
        <ul className="text-center text-base dark:text-gray-200">
          {notifications.map((item) => (
            <li key={item.id} onClick={mobileClickHandler}>
              <div
                id={`${item.content.toUpperCase()}ButtonMobile`}
                className="block rounded-none px-3 py-7 font-medium hover:cursor-pointer"
              >
                {item.title}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const displayedNotification = (
    <>
      <div className="hidden lg:flex">
        <div onClick={desktopClickHandler} className="hover:cursor-pointer">
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="fill-current"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6.40674 2.73828C7.62572 1.51929 9.27902 0.834473 11.0029 0.834473C12.7268 0.834473 14.3801 1.51929 15.5991 2.73828C16.8181 3.95727 17.5029 5.61057 17.5029 7.33447C17.5029 9.98963 18.17 11.7445 18.8648 12.8611L18.8766 12.8801C19.2033 13.4052 19.4628 13.8222 19.6381 14.1263C19.7259 14.2787 19.8072 14.4277 19.8679 14.5613C19.8982 14.6281 19.9328 14.7114 19.9601 14.8028C19.9825 14.8782 20.0266 15.0432 20.0101 15.245C19.9995 15.3742 19.9727 15.6027 19.841 15.8397C19.7094 16.0767 19.5295 16.2202 19.4254 16.2974C19.179 16.4802 18.8981 16.5216 18.8084 16.5348L18.8031 16.5356C18.6634 16.5563 18.5065 16.5664 18.3509 16.5724C18.042 16.5845 17.6152 16.5845 17.0877 16.5845H17.0631H4.94271H4.91814C4.39062 16.5845 3.96386 16.5845 3.65492 16.5724C3.49932 16.5664 3.34242 16.5563 3.2028 16.5356L3.1975 16.5348C3.1078 16.5216 2.82689 16.4802 2.58046 16.2974C2.47634 16.2202 2.29647 16.0767 2.16481 15.8397C2.03315 15.6027 2.00637 15.3742 1.99581 15.245C1.9793 15.0432 2.02334 14.8782 2.0458 14.8028C2.07304 14.7114 2.10764 14.6281 2.13794 14.5613C2.19863 14.4277 2.27993 14.2787 2.36777 14.1263C2.54304 13.8222 2.80258 13.4051 3.12937 12.8799L3.14108 12.8611C3.83589 11.7445 4.50293 9.98963 4.50293 7.33447C4.50293 5.61057 5.18775 3.95726 6.40674 2.73828ZM11.0029 2.83447C9.80946 2.83447 8.66486 3.30858 7.82095 4.15249C6.97704 4.99641 6.50293 6.141 6.50293 7.33447C6.50293 10.3447 5.74084 12.4687 4.83917 13.9178C4.68028 14.1731 4.54302 14.3937 4.42593 14.584C4.57934 14.5844 4.75095 14.5845 4.94271 14.5845H17.0631C17.2549 14.5845 17.4265 14.5844 17.5799 14.584C17.4628 14.3937 17.3256 14.1731 17.1667 13.9178C16.265 12.4687 15.5029 10.3447 15.5029 7.33447C15.5029 6.141 15.0288 4.99641 14.1849 4.15249C13.341 3.30858 12.1964 2.83447 11.0029 2.83447ZM7.82785 18.5894C8.19332 18.1753 8.82526 18.1359 9.23933 18.5014C9.71002 18.9168 10.3259 19.1678 11.0029 19.1678C11.6799 19.1678 12.2958 18.9168 12.7665 18.5014C13.1806 18.1359 13.8125 18.1753 14.178 18.5894C14.5435 19.0035 14.5041 19.6354 14.09 20.0009C13.268 20.7264 12.1858 21.1678 11.0029 21.1678C9.82009 21.1678 8.73791 20.7264 7.91586 20.0009C7.50179 19.6354 7.46239 19.0035 7.82785 18.5894Z"
              fill="#001840"
            />
          </svg>
        </div>
      </div>
      <button onClick={mobileClickHandler} type="button" className="inline-flex lg:hidden">
        {t('NAV_BAR.LANGUAGE')}
      </button>
    </>
  );

  return (
    <div ref={globalRef} className="">
      {displayedNotification}
      {displayedDesktopMenu}
      {displayedMobileMenu}
    </div>
  );
};

export default Notification;
