import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import DashboardCardLayout from '@/components/beta/dashboard/dashboard_card_layout';
import MoreLink from '@/components/beta/dashboard/more_link';
import { ISUNFA_ROUTE } from '@/constants/url';
import TabsForLatestNews from '@/components/beta/news_page/tabs_for_latest_news';
import NewsList from '@/components/beta/news_page/news_list';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { INews } from '@/interfaces/news';
import { NewsType } from '@/constants/news';

const LatestNews = () => {
  const { t } = useTranslation('dashboard');
  const [type, setType] = useState<NewsType>(NewsType.FINANCIAL);
  const [newsList, setNewsList] = useState<INews[]>([]);

  // Info: (20241126 - Liz) 打 API 取得最新消息列表
  const { trigger: getNewsListAPI } = APIHandler<INews[]>(APIName.NEWS_LIST);

  // Info: (20241126 - Liz) 取得最新消息列表 (根據不同的 type)
  useEffect(() => {
    const getNewsList = async () => {
      try {
        const { data, success, code } = await getNewsListAPI({
          query: { simple: true, type },
        });

        if (success && data) {
          setNewsList(data);

          // Deprecated: (20241126 - Liz)
          // eslint-disable-next-line no-console
          console.log('getNewsListAPI success:', 'data:', data);
        } else {
          // Deprecated: (20241126 - Liz)
          // eslint-disable-next-line no-console
          console.log('getNewsListAPI failed:', code);
        }
      } catch (error) {
        // Deprecated: (20241126 - Liz)
        // eslint-disable-next-line no-console
        console.log(error);
      }
    };

    getNewsList();
  }, [type]);

  return (
    <DashboardCardLayout>
      <section className="flex flex-col gap-24px">
        <section className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-neutral-secondary">
            {t('dashboard:DASHBOARD.LATEST_NEWS')}
          </h1>
          <MoreLink href={ISUNFA_ROUTE.LATEST_NEWS_PAGE} />
        </section>

        {/* // Info: (20241126 - Liz) Tab */}
        <TabsForLatestNews activeTab={type} setActiveTab={setType} />

        <NewsList newsList={newsList} />
      </section>
    </DashboardCardLayout>
  );
};

export default LatestNews;
