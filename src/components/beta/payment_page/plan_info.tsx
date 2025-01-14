import Image from 'next/image';
import { IPlan, IUserOwnedTeam, TPlanType } from '@/interfaces/subscription';

interface PlanInfoProps {
  team: IUserOwnedTeam;
  plan: IPlan | undefined;
}

const PlanInfo = ({ team, plan }: PlanInfoProps) => {
  if (!plan) {
    return (
      <div>
        <h1>Data not found</h1>
      </div>
    );
  }

  return (
    <main className="flex w-fit flex-col gap-40px">
      <section className="flex overflow-hidden rounded-sm border border-stroke-brand-primary bg-surface-neutral-surface-lv2">
        <div className="w-24px flex-none bg-surface-brand-primary"></div>
        <div className="flex-auto bg-surface-brand-primary-5 px-24px py-12px text-center text-36px font-bold text-text-brand-secondary-lv1">
          {team.name}
        </div>
      </section>

      <section
        key={plan.id}
        className="flex w-300px flex-auto flex-col justify-start gap-24px rounded-sm bg-surface-neutral-surface-lv2 px-32px py-16px"
      >
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

        <div className="h-1px bg-divider-stroke-lv-4"></div>

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
      </section>
    </main>
  );
};

export default PlanInfo;
