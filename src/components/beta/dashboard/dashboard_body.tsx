import Announcement from '@/components/beta/dashboard/announcement';
import RecentCompanyList from '@/components/beta/dashboard/recent_company_list';
import PendingTasks from '@/components/beta/dashboard/pending_task';
import TodayTodoList from '@/components/beta/dashboard/today_todo_list';
import LatestNews from '@/components/beta/dashboard/latest_news';

const DashboardBody = () => {
  return (
    <div className="space-y-40px">
      <Announcement />

      <div className="flex flex-col gap-24px">
        <section className="flex flex-wrap items-start gap-24px">
          <TodayTodoList />

          <RecentCompanyList />
        </section>

        <section className="flex flex-wrap items-start gap-24px">
          <LatestNews />

          <PendingTasks />
        </section>
      </div>
    </div>
  );
};

export default DashboardBody;
