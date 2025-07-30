import Link from 'next/link';
import Image from 'next/image';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';
import { INews } from '@/interfaces/news';
import { NewsType } from '@/constants/news';
import { formatTimestamp } from '@/constants/time';
import { cn } from '@/lib/utils/common';

interface NewsProps {
  news: INews;
}

const News = ({ news }: NewsProps) => {
  const { t } = useTranslation('dashboard');

  let link = '';

  switch (news.type) {
    case NewsType.FINANCIAL:
      link = ISUNFA_ROUTE.FINANCIAL_NEWS_PAGE + `/${news.id}`;
      break;

    case NewsType.SYSTEM:
      link = ISUNFA_ROUTE.SYSTEM_NEWS_PAGE + `/${news.id}`;
      break;

    case NewsType.MATCH:
      link = ISUNFA_ROUTE.MATCH_NEWS_PAGE + `/${news.id}`;
      break;

    default:
      link = '';
      break;
  }

  // Info: (20250109 - Liz) 把 news.createdAt 日期格式化為 YYYY/MM/DD
  const formattedDate = formatTimestamp(news.createdAt * 1000);

  return (
    <div className="relative flex items-center gap-16px rounded-xs bg-surface-neutral-surface-lv2 p-8px before:pointer-events-none before:absolute before:left-0 before:h-full before:w-full before:rounded-xs before:bg-surface-brand-primary-10 tablet:before:hidden">
      <p className="flex-none text-sm font-normal text-text-neutral-tertiary">{formattedDate}</p>

      <p className="min-w-0 flex-auto truncate text-base font-semibold text-text-neutral-primary">
        {news.title}
      </p>

      <Link href={link} className="flex-none text-sm font-semibold text-link-text-primary">
        {t('dashboard:DASHBOARD.SEE_MORE')}
      </Link>
    </div>
  );
};

interface NewsListProps {
  newsList: INews[];
  isPageStyle?: boolean;
}

const NewsList = ({ newsList, isPageStyle }: NewsListProps) => {
  const { t } = useTranslation('dashboard');
  const isNoData = newsList.length === 0;

  if (isNoData) {
    return (
      <div className="flex flex-auto flex-col items-center justify-center">
        <Image src={'/images/empty.svg'} alt="empty_image" width={120} height={134.787}></Image>
        <p className="text-base font-medium text-text-neutral-mute">
          {t('dashboard:DASHBOARD.NO_LATEST_NEWS')}
        </p>
      </div>
    );
  }

  return (
    <section
      className={cn('flex min-w-0 flex-auto flex-col', {
        'gap-8px': isPageStyle,
        'gap-24px': !isPageStyle,
      })}
    >
      {newsList.map((news) => (
        <News key={news.id} news={news} />
      ))}
    </section>
  );
};

export default NewsList;
