import { Dispatch, SetStateAction } from 'react';
import { IoArrowForward } from 'react-icons/io5';
import { IUserOwnedTeam, TPlanType } from '@/interfaces/subscription';
import { SUBSCRIPTION_PLANS } from '@/constants/subscription';
import SimpleToggle from '@/components/beta/subscriptions_page/simple_toggle';
import { useTranslation } from 'next-i18next';
import { formatTimestamp } from '@/constants/time';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';

interface OwnedTeamProps {
  team: IUserOwnedTeam;
  setTeamForAutoRenewalOn: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
  setTeamForAutoRenewalOff: Dispatch<SetStateAction<IUserOwnedTeam | undefined>>;
}

const OwnedTeam = ({ team, setTeamForAutoRenewalOn, setTeamForAutoRenewalOff }: OwnedTeamProps) => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter();

  const isPlanBeginner = team.plan === TPlanType.BEGINNER;
  const isPlanProfessional = team.plan === TPlanType.PROFESSIONAL;
  const isPlanEnterprise = team.plan === TPlanType.ENTERPRISE;
  const teamUsingPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === team.plan);

  const formatter = new Intl.NumberFormat('en-US');
  const formatPrice = teamUsingPlan ? `$ ${formatter.format(teamUsingPlan.price)} / Month` : null;
  const price = isPlanBeginner ? 'Free' : formatPrice;
  const isAutoRenewalEnabled = team.enableAutoRenewal;

  const openTurnOnAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(team);
  };

  const openTurnOffAutoRenewalModal = () => {
    setTeamForAutoRenewalOff(team);
  };

  const goToChangePlanPage = () => {
    router.push(`${ISUNFA_ROUTE.SUBSCRIPTIONS}/${team.id}`);
  };

  return (
    <main className="flex">
      <div className="w-24px flex-none rounded-l-lg border border-stroke-brand-primary bg-surface-brand-primary"></div>

      <section className="flex flex-auto gap-40px rounded-r-lg border border-stroke-brand-primary bg-surface-brand-primary-5 p-24px">
        <div className="flex flex-col gap-12px">
          <h2 className="text-xl font-semibold text-text-brand-secondary-lv1">{team.name}</h2>
          <h1 className="w-200px text-36px font-bold text-text-brand-primary-lv1">{team.plan}</h1>
          <p className="text-lg font-medium text-text-neutral-tertiary">{price}</p>
        </div>

        <div className="w-1px bg-surface-neutral-depth"></div>

        {isPlanBeginner && <section className="flex-auto"></section>}

        {!isPlanBeginner && (
          <section className="flex flex-auto flex-col justify-center gap-24px">
            <div>
              {isPlanProfessional && (
                <h3 className="text-2xl font-semibold text-text-neutral-tertiary">
                  {`${t('subscriptions:SUBSCRIPTIONS_PAGE.NEXT_RENEWAL')}: `}
                  <span className="text-text-neutral-primary">
                    {team.nextRenewal ? formatTimestamp(team.nextRenewal) : ''}
                  </span>
                </h3>
              )}

              {isPlanEnterprise && (
                <h3 className="text-2xl font-semibold text-text-neutral-tertiary">
                  {`${t('subscriptions:SUBSCRIPTIONS_PAGE.EXPIRED_DATE')}: `}
                  <span className="text-text-neutral-primary">
                    {team.expiredDate ? formatTimestamp(team.expiredDate) : ''}
                  </span>
                </h3>
              )}
            </div>

            <div className="flex items-center gap-20px">
              <span className="text-lg font-semibold text-text-neutral-primary">
                {t('subscriptions:SUBSCRIPTIONS_PAGE.ENABLE_AUTO_RENEWAL')}
              </span>
              <SimpleToggle
                isOn={isAutoRenewalEnabled}
                onClick={
                  isAutoRenewalEnabled ? openTurnOffAutoRenewalModal : openTurnOnAutoRenewalModal
                }
              />
            </div>
          </section>
        )}

        <section className="flex flex-none flex-col justify-center gap-16px">
          <button
            type="button"
            className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-24px py-10px text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            onClick={goToChangePlanPage}
          >
            <span className="text-base font-medium">
              {t('subscriptions:SUBSCRIPTIONS_PAGE.CHANGE_PLAN')}
            </span>
            <IoArrowForward size={20} />
          </button>

          {!isPlanBeginner && (
            <button
              type="button"
              className="flex items-center justify-center gap-8px rounded-xs border border-button-stroke-primary bg-button-surface-soft-primary px-24px py-10px text-button-text-primary-solid hover:border-button-stroke-primary-hover hover:bg-button-surface-soft-primary-hover disabled:border-button-stroke-disable disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            >
              <span className="text-base font-medium">
                {t('subscriptions:SUBSCRIPTIONS_PAGE.BILLING')}
              </span>
            </button>
          )}
        </section>
      </section>
    </main>
  );
};

export default OwnedTeam;
