import Announcement from '@/components/beta/dashboard/announcement';
import MyCompanyList from '@/components/beta/dashboard/my_company_list';
import PendingTasks from '@/components/beta/dashboard/pending_task';
import ToDoList from '@/components/beta/dashboard/to_do_list';
import LatestNews from '@/components/beta/dashboard/latest_news';

const DashboardBody = () => {
  return (
    <div className="space-y-40px">
      <Announcement />

      <div className="flex flex-col gap-24px">
        <section className="flex flex-wrap items-start gap-24px">
          <ToDoList />

          <MyCompanyList />
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
