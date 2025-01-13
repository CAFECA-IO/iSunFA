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
      <section>Billing</section>

      <section></section>

      <section></section>
    </main>
  );
};

export default BillingPageBody;
