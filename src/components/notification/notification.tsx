// Info: (20240808 - Anna) Alpha版先隱藏(小鈴鐺)

// import { useTranslation } from 'next-i18next';
// import React, { Dispatch, SetStateAction, useState } from 'react';
// import Image from 'next/image';
// import { Button } from '@/components/button/button';
// import useOuterClick from '@/lib/hooks/use_outer_click';
// import { cn, truncateString } from '@/lib/utils/common';
// import { DUMMY_NOTIFICATION_LIST, INotification } from '@/interfaces/notification';
// import { LIMIT_NOTIFICATION_TITLE } from '@/constants/display';

// type TranslateFunction = (s: string) => string;
// interface INotificationProps {
//   mobileMenuIsOpen?: boolean;
//   setMobileMenuIsOpen?: Dispatch<SetStateAction<boolean>>;
// }

// const Notification = ({ mobileMenuIsOpen, setMobileMenuIsOpen }: INotificationProps) => {
//   const { t }: { t: TranslateFunction } = useTranslation('common');

//   const [openMenu, setOpenMenu] =
//     typeof setMobileMenuIsOpen !== 'function'
//       ? useState(false)
//       : [mobileMenuIsOpen, setMobileMenuIsOpen];
//   const [notifications, setNotifications] = useState<INotification[]>(DUMMY_NOTIFICATION_LIST);

//   const {
//     targetRef: notificationRef,
//     componentVisible: notificationVisible,
//     setComponentVisible: setNotificationVisible,
//   } = useOuterClick<HTMLDivElement>(false);

//   const desktopClickHandler = () => {
//     setNotificationVisible(!notificationVisible);
//   };
//   const mobileClickHandler = () => {
//     setOpenMenu(!openMenu);
//   };

//   const markAsRead = (id: string) => {
//     setNotifications(
//       (prevNotifications) =>
//         // Info: (20240606 - Shirley) prettier 排版
//         // eslint-disable-next-line implicit-arrow-linebreak
//         prevNotifications.map((notification) => {
//           return notification.id === id ? { ...notification, isRead: true } : notification;
//         })
//       // Info: (20240606 - Shirley) prettier 排版
//       // eslint-disable-next-line function-paren-newline
//     );
//   };

//   const markAllAsRead = () => {
//     setNotifications(
//       (prevNotifications) =>
//         // Info: (20240606 - Shirley) prettier 排版
//         // eslint-disable-next-line implicit-arrow-linebreak
//         prevNotifications.map((notification) => ({
//           ...notification,
//           isRead: true,
//         }))
//       // Info: (20240606 - Shirley) prettier 排版
//       // eslint-disable-next-line function-paren-newline
//     );
//   };

//   const displayedDesktopMenu = (
//     <div className="relative mx-auto hidden max-w-1920px lg:flex">
//       <div
//         className={`absolute right-0 top-30px z-20 w-350px ${
//           notificationVisible ? 'visible opacity-100' : 'invisible opacity-0'
//         } rounded-md bg-white shadow-dropmenu transition-all duration-300`}
//       >
//         <div className="flex w-full justify-end">
//           <Button
//             onClick={markAllAsRead}
//             variant={'secondaryBorderless'}
//             className="mx-2 my-2 flex w-fit self-end px-2 py-1"
//           >
//             <div className="">
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 width="16"
//                 height="16"
//                 fill="none"
//                 viewBox="0 0 16 16"
//               >
//                 <path
//                   className="fill-current"
//                   fillRule="evenodd"
//                   d="M10.309 2.825a5.667 5.667 0 103.36 5.18v-.613a1 1 0 112 0v.613A7.667 7.667 0 1111.123.999a1 1 0 01-.814 1.827zm5.067-.865a1 1 0 010 1.415L8.71 10.048a1 1 0 01-1.415 0l-2-2A1 1 0 016.71 6.634l1.293 1.293 5.96-5.966a1 1 0 011.414 0z"
//                   clipRule="evenodd"
//                 ></path>
//               </svg>
//             </div>
//             <div className="">{t('NAV_BAR.MARK_ALL_AS_READ')}</div>
//           </Button>
//         </div>

//         <ul className="mx-8 pb-0 pt-0 text-base text-button-text-secondary">
//           {notifications.map((item) => (
//             <li key={item.id} onClick={() => markAsRead(item.id)}>
//               <div
//                 id={`${item.content.toUpperCase()}ButtonDesktop`}
//                 className={cn(
//                   'my-5 block rounded-none text-start text-text-neutral-primary',
//                   item.isRead
//                     ? 'text-text-neutral-tertiary'
//                     : 'hover:cursor-pointer hover:text-text-neutral-link'
//                 )}
//               >
//                 {truncateString(item.title, LIMIT_NOTIFICATION_TITLE)}
//               </div>
//             </li>
//           ))}
//         </ul>

//         <div className="flex w-full justify-end">
//           <Button
//             variant={'secondaryBorderless'}
//             className="mx-2 my-2 flex w-fit self-end px-2 py-1 text-text-neutral-link hover:text-text-neutral-link hover:opacity-70"
//           >
//             {t('NAV_BAR.READ_MORE')}
//           </Button>
//         </div>
//       </div>
//     </div>
//   );

//   // TODO: (20240606 - Shirley) [Beta] ongoing development of mobile menu
//   const displayedMobileMenu = (
//     <div
//       className={`transition-all duration-300 ${
//         openMenu
//           ? 'visible -translate-y-12rem opacity-100'
//           : 'invisible -translate-y-36rem opacity-0'
//       } lg:hidden`}
//     >
//       <div className="absolute left-0 top-14 z-10 h-screen w-screen bg-white shadow sm:h-450px">
//         <div className="flex w-full items-center justify-between p-5">
//           <button
//             onClick={mobileClickHandler}
//             type="button"
//             className="text-button-text-secondary hover:text-button-text-primary"
//           >
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               width="24"
//               height="24"
//               fill="none"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 className="fill-current"
//                 fillRule="evenodd"
//                 d="M15.533 5.47a.75.75 0 010 1.061l-5.47 5.47 5.47 5.47a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z"
//                 clipRule="evenodd"
//               ></path>
//             </svg>
//           </button>

//           <Button
//             onClick={markAllAsRead}
//             variant={'secondaryBorderless'}
//             className="mx-2 my-2 flex w-fit self-end px-2 py-1"
//           >
//             <div className="">
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 width="16"
//                 height="16"
//                 fill="none"
//                 viewBox="0 0 16 16"
//               >
//                 <path
//                   className="fill-current"
//                   fillRule="evenodd"
//                   d="M10.309 2.825a5.667 5.667 0 103.36 5.18v-.613a1 1 0 112 0v.613A7.667 7.667 0 1111.123.999a1 1 0 01-.814 1.827zm5.067-.865a1 1 0 010 1.415L8.71 10.048a1 1 0 01-1.415 0l-2-2A1 1 0 016.71 6.634l1.293 1.293 5.96-5.966a1 1 0 011.414 0z"
//                   clipRule="evenodd"
//                 ></path>
//               </svg>
//             </div>
//             <div className="">{t('NAV_BAR.MARK_ALL_AS_READ')}</div>
//           </Button>
//         </div>

//         <ul className="mx-8 pb-0 pt-0 text-base text-button-text-secondary">
//           {notifications.map((item) => (
//             <li key={item.id} onClick={() => markAsRead(item.id)}>
//               <div
//                 id={`${item.content.toUpperCase()}ButtonDesktop`}
//                 className={cn(
//                   'my-5 block rounded-none text-start text-text-neutral-primary',
//                   item.isRead
//                     ? 'text-text-neutral-tertiary'
//                     : 'hover:cursor-pointer hover:text-text-neutral-link'
//                 )}
//               >
//                 {truncateString(item.title, LIMIT_NOTIFICATION_TITLE)}
//               </div>
//             </li>
//           ))}
//         </ul>

//         <div className="flex w-full justify-end">
//           <Button
//             variant={'secondaryBorderless'}
//             className="mx-2 my-2 flex w-fit self-end px-2 py-1 text-text-neutral-link hover:text-text-neutral-link hover:opacity-70"
//           >
//             {t('NAV_BAR.READ_MORE')}
//           </Button>
//         </div>
//       </div>
//     </div>
//   );

//   const displayedNotification = (
//     <>
//       <button type="button" onClick={desktopClickHandler} className="hidden lg:flex">
//         <Image src="/icons/notification.svg" width={24} height={24} alt="notification_icon" />
//       </button>

//       <button
//         id="NavLanguageMobile"
//         onClick={mobileClickHandler}
//         type="button"
//         className="flex w-screen items-center justify-between gap-8px py-10px pl-6 pr-6 text-button-text-secondary hover:text-primaryYellow disabled:text-button-text-secondary disabled:opacity-50 lg:hidden"
//       >
//         <div className="flex w-full items-center gap-8px">
//           <svg
//             xmlns="http://www.w3.org/2000/svg"
//             width="20"
//             height="20"
//             fill="none"
//             viewBox="0 0 20 20"
//           >
//             <path
//               className="fill-current"
//               fillRule="evenodd"
//               d="M5.936 2.602a5.75 5.75 0 019.816 4.066c0 2.442.614 4.066 1.262 5.108l.01.014c.298.48.533.858.69 1.132.08.137.15.267.203.381.025.057.054.126.076.2.018.061.052.189.039.343-.01.11-.031.29-.134.476-.103.186-.245.3-.334.366-.191.142-.414.175-.492.187h-.002a3.743 3.743 0 01-.394.032c-.278.01-.663.01-1.146.01H4.474c-.482 0-.868 0-1.146-.01a3.746 3.746 0 01-.393-.032h-.003c-.078-.012-.3-.045-.492-.187a1.153 1.153 0 01-.333-.366 1.152 1.152 0 01-.135-.476.937.937 0 01.04-.343c.022-.074.05-.143.076-.2.052-.114.123-.244.202-.381.158-.274.393-.652.691-1.132l.01-.014c.647-1.042 1.261-2.666 1.261-5.108a5.75 5.75 0 011.684-4.066zm4.066-.184a4.25 4.25 0 00-4.25 4.25c0 2.708-.685 4.61-1.488 5.9a85.1 85.1 0 00-.523.848c.203.002.45.002.752.002H15.51c.302 0 .55 0 .753-.002-.134-.222-.307-.5-.523-.848-.803-1.29-1.489-3.192-1.489-5.9a4.25 4.25 0 00-4.25-4.25zM7.235 17.005a.75.75 0 011.059-.066 2.57 2.57 0 001.708.645c.656 0 1.253-.243 1.709-.645a.75.75 0 11.992 1.124 4.07 4.07 0 01-2.7 1.021 4.07 4.07 0 01-2.702-1.02.75.75 0 01-.066-1.06z"
//               clipRule="evenodd"
//             ></path>
//           </svg>
//           <p>{t('NAV_BAR.NOTIFICATION')}</p>
//         </div>

//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           width="20"
//           height="20"
//           fill="none"
//           viewBox="0 0 20 20"
//         >
//           <path
//             className="fill-current"
//             fillRule="evenodd"
//             d="M6.972 4.47a.75.75 0 011.06 0l5 5a.75.75 0 010 1.061l-5 5a.75.75 0 01-1.06-1.06l4.47-4.47-4.47-4.47a.75.75 0 010-1.06z"
//             clipRule="evenodd"
//           ></path>
//         </svg>
//       </button>
//     </>
//   );
//   return (
//     <div ref={notificationRef}>
//       {displayedNotification}
//       {displayedDesktopMenu}
//       {displayedMobileMenu}
//     </div>
//   );
// };

// export default Notification;
