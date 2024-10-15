import Announcement from '@/components/beta/dashboard/announcement';

interface CardLayoutProps {
  children: React.ReactNode;
}

const CardLayout = ({ children }: CardLayoutProps) => {
  return (
    <div className="flex-auto basis-400px rounded-md bg-surface-neutral-surface-lv2 p-24px shadow-Dropshadow_XS">
      {children}
    </div>
  );
};

const DashboardBody = () => {
  return (
    <div className="space-y-40px">
      <Announcement />

      <div className="flex flex-col gap-24px">
        <section className="flex flex-wrap items-start gap-24px">
          <CardLayout>
            <h3>To-do list</h3>
            <p>Calendar not yet linked.</p>
            <p>Link My Calendar</p>
          </CardLayout>

          <CardLayout>
            <h3>My Company List</h3>
            <p>Company not yet created.</p>
            <p>Please proceed to create a company.</p>
          </CardLayout>
        </section>

        <section className="flex flex-wrap items-start gap-24px">
          <CardLayout>
            <h3>Latest News</h3>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Suscipit eaque tempora
              nostrum obcaecati, sed sint velit non quibusdam iure, fugiat consequuntur, autem
              omnis? Eius ducimus ullam nemo laborum eveniet odio nostrum dolor quaerat, quibusdam
              laboriosam? Iure sequi modi, dignissimos minus nesciunt a quibusdam corrupti ratione
              tempora enim itaque voluptatum aliquam aspernatur maiores veritatis porro aperiam
              accusantium nostrum illo cupiditate nemo libero culpa vitae numquam? Nostrum sint
              culpa unde minus harum error, id reprehenderit aperiam impedit omnis vel
              necessitatibus molestias consequuntur illo, cumque nobis optio. Modi sunt ducimus
              ipsam tenetur molestias, distinctio delectus. Veritatis dolor recusandae quam rem
              eveniet deleniti exercitationem.
            </p>
          </CardLayout>

          <CardLayout>
            <h3>Pending tasks</h3>
            <p>No Data</p>
          </CardLayout>
        </section>
      </div>
    </div>
  );
};

export default DashboardBody;
