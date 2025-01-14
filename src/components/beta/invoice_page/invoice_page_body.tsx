import { ITeamInvoice } from '@/interfaces/subscription';

interface InvoicePageBodyProps {
  invoice: ITeamInvoice;
}

const InvoicePageBody = ({ invoice }: InvoicePageBodyProps) => {
  // Deprecated: (20250113 - Liz)
  // eslint-disable-next-line no-console
  console.log('invoice:', invoice);

  return <main></main>;
};

export default InvoicePageBody;
