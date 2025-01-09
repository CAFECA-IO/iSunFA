import Image from 'next/image';
import { IUserOwnedTeam, TPlanType } from '@/interfaces/subscription';
import { FiArrowRight } from 'react-icons/fi';
import { PLANS } from '@/constants/subscription';

interface SubscriptionPlansProps {
  team: IUserOwnedTeam;
}

const SubscriptionPlans = ({ team }: SubscriptionPlansProps) => {
  return (
    <main className="flex justify-center gap-10px">
      {PLANS.map((plan) => {
        const isSelected = team.plan === plan.id;
        return (
          <section
            key={plan.id}
            className={`relative flex w-300px flex-col justify-start gap-24px rounded-sm bg-surface-neutral-surface-lv2 px-32px py-16px ${isSelected ? 'border border-stroke-brand-primary' : ''}`}
          >
            {isSelected && (
              <Image
                src="/icons/star_badge.svg"
                alt="star_badge"
                width={64}
                height={64}
                className="absolute -right-21px -top-16px z-1"
              ></Image>
            )}

            <div className="flex flex-col gap-24px text-center">
              <h2 className="text-xl font-bold text-text-brand-primary-lv1">{plan.planName}</h2>
              {plan.price > 0 ? (
                <div>
                  <p>
                    <span className="text-44px font-bold text-text-brand-secondary-lv2">
                      $ {plan.price}
                    </span>
                    <span className="text-base font-semibold text-text-neutral-tertiary">
                      {' '}
                      NTD / Month
                    </span>
                  </p>

                  <p className="h-30px text-base font-semibold text-text-brand-primary-lv1">
                    {plan.id === TPlanType.PROFESSIONAL ? '+ $89 per extra team member' : ''}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-44px font-bold text-text-brand-secondary-lv2">{`Free`}</p>
                  <div className="invisible h-30px"></div>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`flex items-center justify-center gap-8px rounded-xs px-32px py-14px ${isSelected ? 'border border-stroke-brand-primary text-button-text-primary hover:border-button-stroke-secondary-hover hover:text-button-text-secondary-hover disabled:border-button-stroke-disable disabled:text-button-text-disable' : 'bg-button-surface-strong-primary text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable'}`}
            >
              <span className="text-lg font-medium">
                {isSelected ? 'Selected' : 'Select this plan'}
              </span>
              {!isSelected && <FiArrowRight size={24} />}
            </button>

            <ul className="flex flex-col gap-4px text-xs">
              {plan.id === TPlanType.PROFESSIONAL && (
                <li className="flex items-start gap-4px">
                  <Image src="/icons/yellow_star.svg" alt="yellow_star" width={16} height={16} />
                  <p className="font-semibold">Everything in Beginner, plus:</p>
                </li>
              )}

              {plan.id === TPlanType.ENTERPRISE && (
                <li className="flex items-start gap-4px">
                  <Image src="/icons/yellow_star.svg" alt="yellow_star" width={16} height={16} />
                  <p className="font-semibold">Everything in Professional, plus:</p>
                </li>
              )}

              {plan.features.map((feature) => (
                <li key={feature.id} className="flex items-start gap-4px">
                  <Image src="/icons/green_check.svg" alt="green_check" width={16} height={16} />

                  <p className="font-semibold">{feature.name}</p>
                  <span>:</span>

                  {Array.isArray(feature.value) ? (
                    <ul className="font-semibold text-text-support-baby">
                      {feature.value.map((value) => (
                        <li key={value}>{value}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="font-semibold text-text-support-baby">{feature.value}</p>
                  )}
                </li>
              ))}
            </ul>

            {!isSelected && (
              <p className="mt-auto flex flex-col text-xs">
                <span className="text-xs font-semibold leading-5 text-text-brand-primary-lv1">
                  You can cancel your subscription anytime.
                </span>
                <span className="text-xs font-medium leading-5 text-text-neutral-tertiary">
                  * Your current plan will remain active until the next renewal date, and no refunds
                  will be issued for the current billing period.
                </span>
              </p>
            )}
          </section>
        );
      })}
    </main>
  );
};

export default SubscriptionPlans;
