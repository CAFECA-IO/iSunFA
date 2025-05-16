interface DashboardCardLayoutProps {
  children: React.ReactNode;
}

const DashboardCardLayout = ({ children }: DashboardCardLayoutProps) => {
  return (
    <div className="min-w-240px flex-auto rounded-md bg-surface-neutral-surface-lv2 p-24px tablet:min-w-400px">
      {children}
    </div>
  );
};

export default DashboardCardLayout;
