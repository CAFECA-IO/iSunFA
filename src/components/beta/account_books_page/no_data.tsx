import Image from 'next/image';
import { useTranslation } from 'next-i18next';

const NoData = () => {
  const { t } = useTranslation(['account_book']);

  return (
    <section className="flex flex-auto flex-col items-center justify-center gap-16px">
      <Image src={'/images/empty.svg'} alt="empty" width={120} height={134.787}></Image>

      <div className="text-center text-base font-medium text-text-neutral-mute">
        <p>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.NO_ACCOUNT_BOOK_DATA_AVAILABLE')}</p>
        <p>{t('account_book:ACCOUNT_BOOKS_PAGE_BODY.PLEASE_ADD_A_NEW_ACCOUNT_BOOK')}</p>
      </div>
    </section>
  );
};

export default NoData;
