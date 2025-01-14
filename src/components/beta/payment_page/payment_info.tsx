import { IPlan } from '@/interfaces/subscription';

interface PaymentInfoProps {
  plan: IPlan | undefined;
}

const PaymentInfo = ({ plan }: PaymentInfoProps) => {
  if (!plan) {
    return (
      <div>
        <h1>Data not found</h1>
      </div>
    );
  }

  const tax = 0;
  const totalPrice = plan.price + tax;
  return (
    <section className="flex flex-col gap-16px rounded-md bg-surface-neutral-surface-lv2 px-32px py-24px shadow-Dropshadow_XS">
      <p className="flex justify-between">
        <span className="text-lg font-semibold text-text-neutral-tertiary">
          {`iSunFA ${plan.planName} Monthly Subscription`}
        </span>
        <span className="text-xl font-bold leading-8 text-text-neutral-secondary">{`$ ${plan.price} NTD`}</span>
      </p>

      <div className="h-1px bg-divider-stroke-lv-4"></div>

      <p className="flex justify-between">
        <span className="text-lg font-semibold text-text-neutral-tertiary">Subtotal</span>
        <span className="text-xl font-bold leading-8 text-text-neutral-secondary">{`$ ${plan.price} NTD`}</span>
      </p>

      <p className="flex justify-between">
        <span className="text-lg font-semibold text-text-neutral-tertiary">Tax</span>
        <span className="text-xl font-bold leading-8 text-text-neutral-tertiary">{`$ ${tax} NTD`}</span>
      </p>

      <div className="h-1px bg-divider-stroke-lv-4"></div>

      <p className="flex justify-between">
        <span className="text-lg font-semibold text-text-neutral-tertiary">Total Price</span>
        <span className="text-xl font-bold leading-8 text-text-neutral-primary">{`$ ${totalPrice} NTD`}</span>
      </p>
    </section>
  );
};

export default PaymentInfo;
