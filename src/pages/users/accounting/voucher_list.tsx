import VoucherPageBody from '@/components/voucher/voucher_page_body';

const VoucherListPage = () => {
  return (
    <>
      <nav>
        <div className="fixed flex h-screen w-280px flex-col items-center justify-center bg-surface-neutral-surface-lv2">
          This is sidebar
        </div>
        <div className="w-full bg-text-neutral-secondary p-20px text-center text-white">
          This is header
        </div>
      </nav>

      {/* Info: (20240920 - Julian) Body */}
      <main className="flex min-h-screen w-screen flex-col overflow-hidden bg-surface-neutral-main-background pl-280px font-barlow">
        <VoucherPageBody />
      </main>
    </>
  );
};

export default VoucherListPage;
