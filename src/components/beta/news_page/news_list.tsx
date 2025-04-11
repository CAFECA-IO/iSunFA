import Link from 'next/link';
import Image from 'next/image';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';
import { INews } from '@/interfaces/news';
import { NewsType } from '@/constants/news';
import { formatTimestamp } from '@/constants/time';

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
    <div className="flex items-center gap-16px rounded-xs bg-surface-neutral-surface-lv2 p-8px">
      <p className="flex-none text-sm font-normal text-text-neutral-tertiary">{formattedDate}</p>

      <p className="flex-auto truncate text-base font-semibold text-text-neutral-primary">
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
    <section className={`flex flex-auto flex-col ${isPageStyle ? 'gap-8px' : 'gap-24px'}`}>
      {newsList.map((news) => (
        <News key={news.id} news={news} />
      ))}
    </section>
  );
};

export default NewsList;
