import { useTranslation } from 'next-i18next';
import MoreLink from '@/components/beta/dashboard/more_link';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { ISUNFA_ROUTE } from '@/constants/url';

const TodayTodoListNoData = () => {
  const { t } = useTranslation('dashboard');

  return (
    <section className="flex flex-col gap-24px">
      <div className="flex justify-between">
        <h3 className="text-xl font-bold text-text-neutral-secondary">
          {t('dashboard:DASHBOARD.TO_DO_LIST')}
        </h3>
        <MoreLink href={ISUNFA_ROUTE.TODO_LIST_PAGE} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex w-64px justify-center pt-5px">
          <CalendarIcon timestamp={Date.now() / 1000} />
        </div>

        <p className="text-base font-medium text-text-neutral-mute">
          {t('dashboard:DASHBOARD.NO_SCHEDULE_FOR_TODAY')}
        </p>
      </div>
    </section>
  );
};

export default TodayTodoListNoData;
