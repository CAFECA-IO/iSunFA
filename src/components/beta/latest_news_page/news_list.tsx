import Link from 'next/link';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';
import { INews } from '@/interfaces/news';
import { NewsType } from '@/constants/news';

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

  // Info: (20241126 - Liz) 把 news.createdAt 日期格式化
  const date = new Date(news.createdAt * 1000);
  const years = date.getFullYear();
  const months = date.getMonth() + 1;
  const days = date.getDate();

  return (
    <div
      key={news.id}
      className="flex items-center justify-between gap-16px rounded-xs bg-surface-brand-primary-10 p-8px"
    >
      <p className="flex-none text-sm font-normal text-text-neutral-mute">
        {`${years}/${months}/${days}`}
      </p>

      <p className="flex-auto truncate text-base font-semibold text-surface-brand-secondary">
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
  return (
    <section className={`flex flex-col ${isPageStyle ? 'gap-8px' : 'gap-24px'}`}>
      {newsList.map((news) => (
        <News key={news.id} news={news} />
      ))}
    </section>
  );
};

export default NewsList;
