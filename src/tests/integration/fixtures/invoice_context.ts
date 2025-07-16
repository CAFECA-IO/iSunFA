import { InvoiceDirection } from '@/constants/invoice_rc2';
import { InvoiceFixture, InvoiceContext } from '@/tests/integration/fixtures/invoice_fixture';
import { IInvoiceRC2Base } from '@/interfaces/invoice_rc2';

let ctxPromise: Promise<InvoiceContext>;
let fixture: InvoiceFixture;

export async function getInvoiceTestContext(): Promise<InvoiceContext> {
  if (!ctxPromise) {
    fixture = new InvoiceFixture();
    ctxPromise = fixture.init();
  }
  return ctxPromise;
}

/**
 * ★ 這裡改回傳 Promise<IInvoiceRC2Base>，保證你拿到的物件上有 id 屬性
 */
export async function createInvoice(
  ctx: InvoiceContext,
  direction: InvoiceDirection
): Promise<IInvoiceRC2Base> {
  return fixture.createInvoice(direction);
}
