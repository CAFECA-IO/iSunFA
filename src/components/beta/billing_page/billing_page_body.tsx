import { IUserOwnedTeam } from '@/interfaces/subscription';

interface BillingPageBodyProps {
  team: IUserOwnedTeam;
}

const BillingPageBody = ({ team }: BillingPageBodyProps) => {
  // Deprecated: (20250113 - Liz)
  // eslint-disable-next-line no-console
  console.log('team:', team);

  return (
    <main className="border-2">
      {/* // ToDo: (20250113 - Liz) OwnedTeam */}
      <section></section>

      {/* // ToDo: (20250113 - Liz) CreditCardInfo */}
      <section></section>

      {/* // ToDo: (20250113 - Liz) FilterSection */}
      <section></section>

      {/* // ToDo: (20250113 - Liz) InvoiceList */}
      <section></section>

      {/* // ToDo: (20250113 - Liz) PaymentFailedToast */}
      <section></section>

      {/* // ToDo: (20250113 - Liz) PlanExpiredToast */}
      <section></section>
    </main>
  );
};

export default BillingPageBody;
