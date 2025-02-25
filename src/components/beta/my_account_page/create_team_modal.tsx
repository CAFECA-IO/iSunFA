import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaArrowRight, FaAngleDoubleDown } from 'react-icons/fa';
import { IoMailOutline } from 'react-icons/io5';
import { RxCross2 } from 'react-icons/rx';
import { TbArrowBackUp } from 'react-icons/tb';
import { PLANS } from '@/constants/subscription';
import { Button } from '@/components/button/button';
import SubscriptionPlan from '@/components/beta/team_subscription_page/subscription_plan';
import PlanInfo from '@/components/beta/payment_page/plan_info';
import PaymentInfo from '@/components/beta/payment_page/payment_info';
import CreditCardInfo from '@/components/beta/payment_page/credit_card_info';
import MessageModal from '@/components/message_modal/message_modal';
import InvoiceDetail from '@/components/beta/invoice_page/invoice_detail';
import { IMessageModal, MessageType } from '@/interfaces/message_modal';
import {
  IPlan,
  IUserOwnedTeam,
  ITeamInvoice,
  TPaymentStatus,
  TPlanType,
} from '@/interfaces/subscription';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';

interface ICreateTeamModalProps {
  modalVisibilityHandler: () => void;
}

const CreateTeamStepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const { t } = useTranslation(['team']);

  const step1src = currentStep === 1 ? '/icons/team_name_active.svg' : '/icons/team_name.svg';
  const step1textColor =
    currentStep === 1 ? 'text-stepper-text-active' : 'text-stepper-text-finish';

  const line1Color = currentStep === 1 ? 'bg-stepper-surface-base' : 'bg-stepper-text-finish';

  const step2src =
    currentStep === 1
      ? '/icons/team_member_disabled.svg'
      : currentStep === 2
        ? '/icons/team_member_active.svg'
        : '/icons/team_member.svg';
  const step2textColor =
    currentStep === 1
      ? 'text-stepper-text-default'
      : currentStep === 2
        ? 'text-stepper-text-active'
        : 'text-stepper-text-finish';

  const line2Color = currentStep === 3 ? 'bg-stepper-text-finish' : 'bg-stepper-surface-base';

  const step3src =
    currentStep === 3 ? '/icons/sub_plan_active.svg' : '/icons/sub_plan_disabled.svg';
  const step3textColor =
    currentStep === 3 ? 'text-stepper-text-active' : 'text-stepper-text-default';

  return (
    <div className="relative mx-auto flex w-320px items-center justify-between -space-x-10">
      {/* Info: (20250218 - Julian) Step 1 */}
      <div className="z-10 flex w-75px flex-col items-center">
        <Image src={step1src} width={30} height={30} alt="create_team_step_1" />
        <p className={`text-xs font-medium ${step1textColor}`}>
          {t('team:CREATE_TEAM_MODAL.STEP_1')}
        </p>
      </div>

      {/* Info: (20250218 - Julian) Line 1 */}
      <div className={`z-0 h-4px w-120px -translate-y-8px ${line1Color}`}></div>

      {/* Info: (20250218 - Julian) Step 2 */}
      <div className="z-10 flex w-75px flex-col items-center">
        <Image src={step2src} width={30} height={30} alt="create_team_step_2" />
        <p className={`text-xs font-medium ${step2textColor}`}>
          {t('team:CREATE_TEAM_MODAL.STEP_2')}
        </p>
      </div>

      {/* Info: (20250218 - Julian) Line 2 */}
      <div className={`z-0 h-4px w-120px -translate-y-8px ${line2Color}`}></div>

      {/* Info: (20250218 - Julian) Step 3 */}
      <div className="z-10 flex w-75px flex-col items-center">
        <Image src={step3src} width={30} height={30} alt="create_team_step_3" />
        <p className={`text-xs font-medium ${step3textColor}`}>
          {t('team:CREATE_TEAM_MODAL.STEP_3')}
        </p>
      </div>
    </div>
  );
};

const CreateTeamModal: React.FC<ICreateTeamModalProps> = ({ modalVisibilityHandler }) => {
  const { t } = useTranslation(['team', 'common']);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [teamNameInput, setTeamNameInput] = useState<string>('');
  const [teamMemberInput, setTeamMemberInput] = useState<string>(''); // Info: (20250218 - Julian) input value
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [isValidEmail, setIsValidEmail] = useState<boolean>(true);
  const [isHideArrow, setIsHideArrow] = useState<boolean>(false); // Info: (20250225 - Julian) 控制向下滾動的動畫
  // ToDo: (20250225 - Julian) Implement API call
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teamInvoice, setTeamInvoice] = useState<ITeamInvoice | null>(null);

  // ToDo: (20250218 - Julian) For testing UI
  const fakeTeam = {
    id: 0,
    name: 'Team Name',
    plan: TPlanType.BEGINNER,
    enableAutoRenewal: false,
    nextRenewalTimestamp: 0,
    expiredTimestamp: 0,
    paymentStatus: TPaymentStatus.PAID,
  };

  // Info: (20250224 - Julian) 團隊資訊
  const [newTeam, setNewTeam] = useState<IUserOwnedTeam | null>(fakeTeam);
  const [selectedPlan, setSelectedPlan] = useState<IPlan | null>(null);

  // Info: (20250224 - Julian) 開啟或關閉自動續約的 Modal 狀態
  const [teamForAutoRenewalOn, setTeamForAutoRenewalOn] = useState<IUserOwnedTeam | undefined>();
  const [teamForAutoRenewalOff, setTeamForAutoRenewalOff] = useState<IUserOwnedTeam | undefined>();

  // ToDo: (20250225 - Julian) 建立 Team API
  const { trigger: createTeam, success: createSuccess } = APIHandler<IUserOwnedTeam>(
    APIName.GET_TEAM_BY_ID
  );

  // ToDo: (20250225 - Julian) 更新 Team API
  const { trigger: updateTeam, success: updateSuccess } = APIHandler<IUserOwnedTeam>(
    APIName.GET_TEAM_BY_ID
  );

  // ToDo: (20250225 - Julian) 取得 Team API
  const { trigger: getTeamById } = APIHandler<IUserOwnedTeam>(APIName.GET_TEAM_BY_ID);

  // Info: (20250224 - Julian) 開啟自動續約、關閉自動續約 API
  const { trigger: updateSubscriptionAPI } = APIHandler<IUserOwnedTeam>(
    APIName.UPDATE_SUBSCRIPTION
  );

  const formBodyRef = useRef<HTMLDivElement>(null);
  // Info: (20250219 - Julian) 根據 formBodyRef 的高度 決定是否顯示 Bounce 動畫
  const toggleVisibility = () => {
    if (formBodyRef.current) {
      setIsHideArrow(formBodyRef.current.scrollTop > 160);
    }
  };

  const emailInputRef = useRef<HTMLInputElement>(null);

  const getTeam = async () => {
    // Info: (20250225 - Julian) 取得 Team 資訊
    if (newTeam?.id) {
      getTeamById({ params: { teamId: newTeam.id } });
    }
  };

  // Info: (20250218 - Julian) 送出 API 後，取得 Team 資訊
  // ToDo: (20250225 - Julian) 施工中🔧
  useEffect(() => {
    if (createSuccess || updateSuccess) {
      const getNewTeam = async () => {
        const { data: team, success } = await createTeam({ body: { name: teamNameInput } });
        if (success && team) {
          setNewTeam(team);
        }
      };
      getNewTeam();
    }
  }, [createSuccess, updateSuccess]);

  // Info: (20250218 - Julian) 檢查 Email 格式
  useEffect(() => {
    if (teamMemberInput !== '') {
      setIsValidEmail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamMemberInput));
    }
  }, [teamMemberInput]);

  // Info: (20250219 - Julian) 監聽 formBodyRef 的 scroll 事件
  useEffect(() => {
    formBodyRef.current?.addEventListener('scroll', toggleVisibility);
    return () => {
      formBodyRef.current?.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  // Info: (20250224 - Julian) 清空自動續約的狀態
  const closeAutoRenewalModal = () => {
    setTeamForAutoRenewalOn(undefined);
    setTeamForAutoRenewalOff(undefined);
  };

  // Info: (20250224 - Julian) 打 API 開啟自動續約
  const turnOnAutoRenewal = async () => {
    if (!teamForAutoRenewalOn) return;
    const teamId = teamForAutoRenewalOn.id;
    const planId = teamForAutoRenewalOn.plan;
    const { success } = await updateSubscriptionAPI({
      params: { teamId },
      body: { plan: planId, autoRenewal: true },
    });
    // Info: (20250224 - Julian) 打完開啟自動續約的 API 成功後，關閉 Modal，並且重新打 API 取得最新的 Team
    if (success) {
      closeAutoRenewalModal();
      getTeam();
    }
  };

  // Info: (20250224 - Julian) 打 API 關閉自動續約
  const turnOffAutoRenewal = async () => {
    if (!teamForAutoRenewalOff) return;
    const teamId = teamForAutoRenewalOff.id;
    const planId = teamForAutoRenewalOff.plan;
    const { success } = await updateSubscriptionAPI({
      params: { teamId },
      body: { plan: planId, autoRenewal: false },
    });
    // Info: (20250224 - Julian) 打完關閉自動續約的 API 成功後，關閉 Modal，並且重新打 API 取得最新的 Team
    if (success) {
      closeAutoRenewalModal();
      getTeam();
    }
  };

  // Info: (20250224 - Julian) 開啟自動續訂
  const messageModalDataForTurnOnRenewal: IMessageModal = {
    title: t('subscriptions:SUBSCRIPTIONS_PAGE.TURN_ON_AUTO_RENEWAL_TITLE'),
    content: t('subscriptions:SUBSCRIPTIONS_PAGE.TURN_ON_AUTO_RENEWAL_MESSAGE'),
    submitBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.YES_TURN_ON_AUTO_RENEWAL'),
    submitBtnFunction: turnOnAutoRenewal,
    messageType: MessageType.WARNING,
    backBtnFunction: closeAutoRenewalModal,
    backBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.CANCEL'),
  };

  // Info: (20250224 - Julian) 關閉自動續訂
  const messageModalDataForTurnOffRenewal: IMessageModal = {
    title: t('subscriptions:SUBSCRIPTIONS_PAGE.TURN_OFF_AUTO_RENEWAL_TITLE'),
    content: t('subscriptions:SUBSCRIPTIONS_PAGE.TURN_OFF_AUTO_RENEWAL_MESSAGE'),
    submitBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.YES_TURN_OFF_AUTO_RENEWAL'),
    submitBtnFunction: turnOffAutoRenewal,
    messageType: MessageType.WARNING,
    backBtnFunction: closeAutoRenewalModal,
    backBtnStr: t('subscriptions:SUBSCRIPTIONS_PAGE.CANCEL'),
  };

  const nextButtonStr =
    currentStep === 1
      ? t('team:CREATE_TEAM_MODAL.CREATE_BTN')
      : t('team:CREATE_TEAM_MODAL.CONTINUE_BTN');
  const cancelButtonText =
    currentStep === 1 ? t('common:COMMON.CANCEL') : t('team:CREATE_TEAM_MODAL.SKIP_BTN');

  const nextButtonDisabled =
    currentStep === 1
      ? teamNameInput === '' // Info: (20250224 - Julian) 第一步 Team Name 必填
      : currentStep === 2
        ? teamMembers.length <= 0 // Info: (20250224 - Julian) 第二步 Member Email 必填
        : currentStep === 3
          ? !teamInvoice // Info: (20250224 - Julian) 第三步顯示 Invoice
          : true;

  // Info: (20250225 - Julian) 跳轉到 Team Page
  const toTeamPage = () => window.open(`/users/team/${newTeam?.id}`, '_self');

  // ToDo: (20250221 - Julian) 串接 API的時候，需要檢查是否重複建立：
  const createOrUpdateTeam = async () => {
    // Info: (20250225 - Julian) 有 newTeam 資料 -> 第二次建立 -> update
    if (newTeam) {
      updateTeam({ params: { teamId: newTeam?.id }, body: { name: teamNameInput } });
    } else {
      // Info: (20250225 - Julian) 第一次建立 -> create
      createTeam({ body: { name: teamNameInput } });
    }
  };

  const toNextStep =
    currentStep === 1
      ? () => {
          createOrUpdateTeam(); // Info: (20250225 - Julian) 建立/更新 Team
          setCurrentStep(2); // Info: (20250225 - Julian) 第一步到第二步
          emailInputRef.current?.focus(); // Info: (20250225 - Julian) focus 到 email input
        }
      : currentStep === 2
        ? () => {
            // Info: (20250225 - Julian) 第二步到第三步
            setCurrentStep(3);
          }
        : // Info: (20250225 - Julian) 第三步到 Team Page
          toTeamPage;

  const cancelOrSkip =
    currentStep === 1
      ? // Info: (20250218 - Julian) 第一步為 Cancel，即關閉 Modal
        modalVisibilityHandler
      : // Info: (20250218 - Julian) 第二步開始為 Skip，即跳到下一步
        toNextStep;

  const backHandler = () => {
    if (selectedPlan) {
      setSelectedPlan(null); // Info: (20250221 - Julian) 回到選擇方案
    } else if (currentStep === 2) {
      setCurrentStep(1); // Info: (20250221 - Julian) 回到第一步
    } else if (currentStep === 3) {
      setCurrentStep(2); // Info: (20250221 - Julian) 回到第二步
    }
  };

  // Info: (20250224 - Julian) 將填寫的 Email 加入清單、清空 input、focus 到 input
  const emailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValidEmail) {
      setTeamMembers([...teamMembers, teamMemberInput]);
      setTeamMemberInput('');
      emailInputRef.current?.focus();
    }
  };

  const memberTags = teamMembers.map((member, index) => {
    const removeMember = () => {
      setTeamMembers(teamMembers.filter((_, i) => i !== index));
    };

    return (
      <div
        key={member}
        className="flex items-center gap-2px rounded-xs border border-badge-stroke-secondary bg-badge-surface-base-soft p-6px font-medium text-badge-text-secondary"
      >
        <p>{member}</p>
        <button type="button" onClick={removeMember}>
          <RxCross2 size={14} />
        </button>
      </div>
    );
  });

  // Info: (20250224 - Julian) 訂閱方案
  const subscriptionOverview = newTeam && (
    <div className="flex justify-center gap-lv-7">
      {PLANS.map((plan) => {
        const selectPlan = () => setSelectedPlan(plan);
        return (
          <SubscriptionPlan
            key={plan.id}
            team={newTeam}
            plan={plan}
            getOwnedTeam={getTeam}
            goToPaymentHandler={selectPlan}
            bordered
          />
        );
      })}
    </div>
  );

  // Info: (20250224 - Julian) 付款
  const paymentOverview = newTeam && selectedPlan && (
    <div className="flex min-h-600px w-900px gap-40px">
      <PlanInfo team={newTeam} plan={selectedPlan} />

      <section className="flex flex-auto flex-col gap-24px">
        <PaymentInfo plan={selectedPlan} />

        <CreditCardInfo
          team={newTeam}
          plan={selectedPlan}
          setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
          setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
          setIsDirty={() => {}}
        />
      </section>

      {teamForAutoRenewalOn && (
        <MessageModal
          messageModalData={messageModalDataForTurnOnRenewal}
          isModalVisible={!!teamForAutoRenewalOn}
          modalVisibilityHandler={closeAutoRenewalModal}
        />
      )}

      {teamForAutoRenewalOff && (
        <MessageModal
          messageModalData={messageModalDataForTurnOffRenewal}
          isModalVisible={!!teamForAutoRenewalOff}
          modalVisibilityHandler={closeAutoRenewalModal}
        />
      )}
    </div>
  );

  const invoiceOverview = newTeam && teamInvoice && <InvoiceDetail invoice={teamInvoice} />;

  const step3Body = selectedPlan
    ? paymentOverview // Info: (20250225 - Julian) 有選擇方案 -> 顯示付款
    : subscriptionOverview; // Info: (20250225 - Julian) 顯示訂閱方案

  const memberFormBody = (
    <div className="flex flex-col gap-8px text-sm">
      <p className="font-semibold text-input-text-primary">
        {t('team:CREATE_TEAM_MODAL.MEMBER_EMAIL')}
      </p>
      <div className="flex items-center gap-12px rounded-sm border border-input-stroke-input px-12px py-10px text-xs">
        <div className="text-icon-surface-single-color-primary">
          <IoMailOutline size={16} />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-4px">
          {memberTags}
          {/* Info: (20250221 - Julian) input */}
          <input
            id="member-email"
            type="text"
            ref={emailInputRef}
            value={teamMemberInput}
            onChange={(e) => setTeamMemberInput(e.target.value)}
            className="w-full bg-transparent outline-none"
            onKeyDown={emailKeyDown}
          />
        </div>
      </div>
      <p className={`text-red-600 ${isValidEmail ? 'opacity-0' : 'opacity-100'}`}>
        {t('team:CREATE_TEAM_MODAL.EMAIL_HINT')}
      </p>
    </div>
  );

  const formBody =
    currentStep === 1 ? (
      // Info: (20250217 - Julian) Team Name
      <div className="flex flex-col gap-8px text-sm">
        <p className="font-semibold text-input-text-primary">
          {t('team:CREATE_TEAM_MODAL.TEAM_NAME')} <span className="text-text-state-error">*</span>
        </p>
        <input
          id="team-name"
          type="text"
          value={teamNameInput}
          onChange={(e) => setTeamNameInput(e.target.value)}
          className="rounded-sm border border-input-stroke-input px-12px py-10px placeholder:text-input-text-input-placeholder"
          placeholder={t('team:CREATE_TEAM_MODAL.TEAM_NAME')}
        />
      </div>
    ) : currentStep === 2 ? (
      // Info: (20250217 - Julian) Member Email
      memberFormBody
    ) : teamInvoice ? (
      invoiceOverview // Info: (20250225 - Julian) 顯示 Invoice
    ) : (
      <>
        {/* Info: (20250218 - Julian) Step 3 body */}
        {step3Body}

        <ul className="ml-20px list-outside list-disc font-normal text-text-neutral-primary marker:text-surface-support-strong-maple">
          <li>{t('team:CREATE_TEAM_MODAL.PLAN_HINT')}</li>
        </ul>
      </>
    );

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div
        className={`flex flex-col items-stretch gap-lv-5 rounded-md bg-surface-neutral-surface-lv1 p-lv-7 ${
          currentStep === 3 ? 'w-min' : 'w-500px'
        }`}
      >
        {/* Info: (20250217 - Julian) Title */}
        <div className="relative flex items-start justify-center">
          <h2 className="text-xl font-bold text-text-neutral-primary">
            {t('team:CREATE_TEAM_MODAL.MODAL_TITLE')}
          </h2>
          <button
            type="button"
            className="absolute right-0 text-icon-surface-single-color-primary"
            onClick={modalVisibilityHandler}
          >
            <RxCross2 size={24} />
          </button>
        </div>

        {/* Info: (20250217 - Julian) Stepper */}
        <CreateTeamStepper currentStep={currentStep} />

        {/* Info: (20250217 - Julian) Form */}
        <div
          ref={formBodyRef}
          className="relative flex max-h-600px flex-col gap-lv-7 overflow-y-auto py-20px"
        >
          {formBody}

          {/* Info: (20250219 - Julian) 提示向下滾動的動畫 */}
          {currentStep === 3 && (
            <div
              className={`sticky -bottom-20px left-0 min-h-100px w-full items-center justify-center bg-gradient-to-t from-surface-neutral-surface-lv1 to-transparent ${isHideArrow ? 'hidden' : 'flex'}`}
            >
              <div className="animate-bounce text-button-text-secondary">
                <FaAngleDoubleDown size={32} />
              </div>
            </div>
          )}

          {/* Info: (20250217 - Julian) Buttons */}
          <div className="flex items-center justify-between">
            {currentStep > 1 && !teamInvoice && (
              <Button type="button" variant="secondaryBorderless" onClick={backHandler}>
                <TbArrowBackUp size={20} />
                {t('common:COMMON.BACK')}
              </Button>
            )}
            <div className="ml-auto flex items-center gap-24px">
              {!teamInvoice && (
                <Button type="button" variant="secondaryBorderless" onClick={cancelOrSkip}>
                  {cancelButtonText}
                </Button>
              )}
              <Button
                type="button"
                variant="tertiary"
                disabled={nextButtonDisabled}
                onClick={toNextStep}
              >
                {nextButtonStr} <FaArrowRight />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamModal;
