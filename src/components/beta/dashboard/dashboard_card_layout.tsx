interface DashboardCardLayoutProps {
  children: React.ReactNode;
}

const DashboardCardLayout = ({ children }: DashboardCardLayoutProps) => {
  return (
    <div className="flex-auto rounded-md bg-surface-neutral-surface-lv2 p-24px shadow-Dropshadow_XS">
      {children}
    </div>
  );
};

export default DashboardCardLayout;
