import { IUserOwnedTeam } from '@/interfaces/subscription';

interface InvoicePageBodyProps {
  team: IUserOwnedTeam;
}

const InvoicePageBody = ({ team }: InvoicePageBodyProps) => {
  // Deprecated: (20250113 - Liz)
  // eslint-disable-next-line no-console
  console.log('team:', team);

  return <main></main>;
};

export default InvoicePageBody;
