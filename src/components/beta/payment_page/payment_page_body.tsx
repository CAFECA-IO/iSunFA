import { IUserOwnedTeam } from '@/interfaces/subscription';

interface PaymentPageBodyProps {
  team: IUserOwnedTeam;
}

const PaymentPageBody = ({ team }: PaymentPageBodyProps) => {
  // Deprecated: (20250110 - Liz)
  // eslint-disable-next-line no-console
  console.log('team:', team);

  return (
    <main>
      <section></section>

      <section></section>

      <section></section>
    </main>
  );
};

export default PaymentPageBody;
