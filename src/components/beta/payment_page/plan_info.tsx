import Image from 'next/image';
import { IPlan, IUserOwnedTeam, TPlanType } from '@/interfaces/subscription';
import { useTranslation } from 'next-i18next';

interface PlanInfoProps {
  team: IUserOwnedTeam;
  plan: IPlan | undefined;
}

const PlanInfo = ({ team, plan }: PlanInfoProps) => {
  const { t } = useTranslation(['subscriptions']);
  if (!plan) {
    return (
      <div>
        <h1>{t('subscriptions:SUBSCRIPTIONS_PAGE.PLAN_NOT_FOUND')}</h1>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-lv-6 tablet:w-fit tablet:gap-40px">
      <section className="flex w-full overflow-hidden rounded-sm border border-stroke-brand-primary bg-surface-neutral-surface-lv2 tablet:w-300px">
        <div className="w-24px flex-none bg-surface-brand-primary"></div>
        <div className="flex-auto bg-surface-brand-primary-5 px-24px py-12px text-center text-xl font-bold text-text-brand-secondary-lv1 tablet:text-36px">
          {team.name}
        </div>
      </section>

      <section
        key={plan.id}
        className="flex w-full flex-auto flex-col justify-start gap-24px rounded-sm bg-surface-neutral-surface-lv2 px-32px py-16px tablet:w-300px"
      >
        <div className="flex flex-col gap-24px text-center">
          <h2 className="text-xl font-bold text-text-brand-primary-lv1">
            {t(`subscriptions:PLAN_NAME.${plan.id.toUpperCase()}`)}
          </h2>
          {plan.price > 0 ? (
            <div>
              <p>
                <span className="text-44px font-bold text-text-brand-secondary-lv2">
                  $ {plan.price.toLocaleString('zh-TW')}
                </span>
                <span className="text-base font-semibold text-text-neutral-tertiary">
                  {' '}
                  {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.NTD_SLASH_MONTH')}
                </span>
              </p>

              <p className="h-30px text-base font-semibold text-text-brand-primary-lv1">
                {plan.id === TPlanType.PROFESSIONAL
                  ? `${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_PREFIX')}+ $${plan.extraMemberPrice}${t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.PER_EXTRA_TEAM_MEMBER_SUFFIX')}`
                  : ''}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-44px font-bold text-text-brand-secondary-lv2">
                {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.FREE')}
              </p>
              <div className="invisible h-30px"></div>
            </div>
          )}
        </div>

        <div className="h-1px bg-divider-stroke-lv-4"></div>

        <ul className="flex flex-col gap-4px text-xs">
          {plan.id === TPlanType.PROFESSIONAL && (
            <li className="flex items-start gap-4px">
              <Image src="/icons/yellow_star.svg" alt="yellow_star" width={16} height={16} />
              <p className="font-semibold">
                {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.EVERYTHING_IN_BEGINNER_PLUS')}
              </p>
            </li>
          )}

          {plan.id === TPlanType.ENTERPRISE && (
            <li className="flex items-start gap-4px">
              <Image src="/icons/yellow_star.svg" alt="yellow_star" width={16} height={16} />
              <p className="font-semibold">
                {t('subscriptions:SUBSCRIPTION_PLAN_CONTENT.EVERYTHING_IN_PROFESSIONAL_PLUS')}
              </p>
            </li>
          )}

          {plan.features.map((feature) => (
            <li key={feature.id} className="flex items-start gap-4px">
              <Image
                src="/icons/green_check.svg"
                alt="green_check"
                width={16}
                height={16}
                className="flex-none"
              />

              <div className="flex flex-auto flex-wrap gap-4px">
                <p className="font-semibold">
                  {t(`subscriptions:PLANS_FEATURES_NAME.${feature.name.toUpperCase()}`)}
                </p>
                <span>:</span>

                {Array.isArray(feature.value) ? (
                  <ul className="font-semibold text-text-support-baby">
                    {feature.value.map((value) => (
                      <li key={value}>
                        {t(`subscriptions:PLANS_FEATURES_VALUE.${value.toUpperCase()}`)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-semibold text-text-support-baby">
                    {t(`subscriptions:PLANS_FEATURES_VALUE.${feature.value.toUpperCase()}`)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default PlanInfo;
