import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FaArrowRight, FaAngleDoubleDown } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa6';
import { IoMailOutline } from 'react-icons/io5';
import { PiSpinner } from 'react-icons/pi';
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
import { ISUNFA_ROUTE } from '@/constants/url';
import { ITeam } from '@/interfaces/team';
import { useModalContext } from '@/contexts/modal_context';
import { useUserCtx } from '@/contexts/user_context';
import { ToastType } from '@/interfaces/toastify';
import { KEYBOARD_EVENT_CODE } from '@/constants/keyboard_event_code';
import loggerFront from '@/lib/utils/logger_front';

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
    <div className="relative mx-auto flex items-center justify-between -space-x-10 tablet:w-320px">
      {/* Info: (20250218 - Julian) Step 1 */}
      <div className="z-10 flex w-75px flex-col items-center">
        <Image src={step1src} width={30} height={30} alt="create_team_step_1" />
        <p className={`text-xs font-medium ${step1textColor}`}>
          {t('team:CREATE_TEAM_MODAL.STEP_1')}
        </p>
      </div>

      {/* Info: (20250218 - Julian) Line 1 */}
      <div className={`z-0 h-4px w-100px -translate-y-8px tablet:w-120px ${line1Color}`}></div>

      {/* Info: (20250218 - Julian) Step 2 */}
      <div className="z-10 flex w-75px flex-col items-center">
        <Image src={step2src} width={30} height={30} alt="create_team_step_2" />
        <p className={`text-xs font-medium ${step2textColor}`}>
          {t('team:CREATE_TEAM_MODAL.STEP_2')}
        </p>
      </div>

      {/* Info: (20250218 - Julian) Line 2 */}
      <div className={`z-0 h-4px w-100px -translate-y-8px tablet:w-120px ${line2Color}`}></div>

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
  const router = useRouter();
  const { toastHandler } = useModalContext();
  const { userAuth, paymentMethod } = useUserCtx();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [teamNameInput, setTeamNameInput] = useState<string>('');
  const [teamMemberInput, setTeamMemberInput] = useState<string>(''); // Info: (20250218 - Julian) input value
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [isValidEmail, setIsValidEmail] = useState<boolean>(true);
  const [isHideArrow, setIsHideArrow] = useState<boolean>(false); // Info: (20250225 - Julian) 控制向下滾動的動畫
  // ToDo: (20250225 - Julian) Implement API call
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teamInvoice, setTeamInvoice] = useState<ITeamInvoice | null>(null);

  // Info: (20250421 - Anna) 訂閱方案由 @/constants/subscription 而來
  const listPaymentPlan = PLANS;

  // Info: (20250224 - Julian) 團隊資訊
  const [selectedPlan, setSelectedPlan] = useState<IPlan>(PLANS[0]);

  // Info: (20250224 - Julian) 開啟或關閉自動續約的 Modal 狀態
  const [teamForAutoRenewalOn, setTeamForAutoRenewalOn] = useState<IUserOwnedTeam | undefined>();
  const [teamForAutoRenewalOff, setTeamForAutoRenewalOff] = useState<IUserOwnedTeam | undefined>();

  const isBeginnerPlan = selectedPlan.id === TPlanType.BEGINNER;

  // Info: (20250303 - Julian) 建立 Team API
  const { trigger: createTeam } = APIHandler<ITeam>(APIName.CREATE_TEAM);

  // Info: (20250226 - Julian) 邀請成員 API
  const { trigger: inviteMember } = APIHandler(APIName.INVITE_MEMBER_TO_TEAM);

  // Info: (20250224 - Julian) 開啟自動續約、關閉自動續約 API
  const { trigger: updateSubscriptionAPI } = APIHandler<IUserOwnedTeam>(
    APIName.UPDATE_SUBSCRIPTION
  );

  // Info: (20250326 - Julian) 訂閱方案
  const { trigger: subscribe } = APIHandler(APIName.USER_PAYMENT_METHOD_CHARGE);

  const formBodyRef = useRef<HTMLDivElement>(null);
  // Info: (20250219 - Julian) 根據 formBodyRef 的高度 決定是否顯示 Bounce 動畫
  const toggleVisibility = () => {
    if (formBodyRef.current) {
      setIsHideArrow(formBodyRef.current.scrollTop > 160);
    }
  };

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Info: (20250326 - Julian) Team Placeholder: 由於 Team 還沒正式建立，所以用這個作為 UI 顯示
  const teamInfo: IUserOwnedTeam = {
    id: 0,
    name: teamNameInput,
    plan: selectedPlan.id,
    enableAutoRenewal: false,
    nextRenewalTimestamp: 0,
    expiredTimestamp: 0,
    paymentStatus: TPaymentStatus.FREE,
  };

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
    // Info: (20250224 - Julian) 打完開啟自動續約的 API 成功後，關閉 Modal
    if (success) {
      closeAutoRenewalModal();
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
    // Info: (20250224 - Julian) 打完關閉自動續約的 API 成功後，關閉 Modal
    if (success) {
      closeAutoRenewalModal();
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
        : currentStep !== 3; // Info: (20250326 - Julian) 第三步不需要檢查

  // deprecated: (20250326 - Julian) for testing
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const printResult = () => {
    loggerFront.log('createTeamBody:', {
      name: teamNameInput,
      members: teamMembers,
      planType: selectedPlan,
    });
  };

  // Info: (20250325 - Julian) 建立團隊步驟：建立團隊 -> 邀請成員 -> 升級訂閱方案
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createTeamHandler = async () => {
    try {
      const { success, data, error } = await createTeam({
        body: { name: teamNameInput, members: teamMembers, planType: selectedPlan.id },
      });

      // Info: (20250326 - Julian) 建立團隊成功 -> 邀請成員和升級訂閱方案
      if (success && data) {
        // Info: (20250326 - Julian) 有填寫成員 Email 才 inviteMember
        if (teamMembers.length > 0) {
          // Info: (20250326 - Julian) 邀請成員
          const { error: invitedError } = await inviteMember({
            params: { teamId: data.id },
            body: { emails: teamMembers },
          });

          // Info: (20250326 - Julian) 邀請成員失敗：顯示錯誤訊息
          if (invitedError) {
            toastHandler({
              id: 'invite-member-fail',
              type: ToastType.ERROR,
              content: `Invite member failed: ${invitedError?.message}`,
              closeable: true,
            });
          }
        }

        // Info: (20250326 - Julian) 選擇免費方案的話，不需要升級訂閱方案
        if (!isBeginnerPlan && userAuth && paymentMethod) {
          // Info: (20250326 - Julian) 升級訂閱方案
          const { error: subscriptionError } = await subscribe({
            params: {
              userId: userAuth.id,
              paymentMethodId: paymentMethod[paymentMethod.length - 1].id,
            },
            body: { teamPlanType: selectedPlan.id, teamId: data.id },
          });

          // Info: (20250326 - Julian) 升級訂閱方案失敗：顯示錯誤訊息
          if (subscriptionError) {
            toastHandler({
              id: 'subscribe-fail',
              type: ToastType.ERROR,
              content: t('team:CREATE_TEAM_MODAL.TOAST_SUBSCRIBE_FAILED', {
                error: subscriptionError?.message,
              }),
              closeable: true,
            });
          }
        }

        // Info: (20250326 - Julian) 全部步驟完成：顯示成功訊息，2 秒後跳轉到團隊頁面，關閉 Modal
        toastHandler({
          id: 'create-team-success',
          type: ToastType.SUCCESS,
          content: t('team:CREATE_TEAM_MODAL.TOAST_CREATE_SUCCESS'),
          closeable: true,
        });
        setTimeout(() => {
          router.push(`${ISUNFA_ROUTE.TEAM_PAGE}/${data.id}`);
          modalVisibilityHandler();
        }, 2000);
      } else {
        // Info: (20250326 - Julian) 建立失敗：顯示錯誤訊息
        toastHandler({
          id: 'create-team-fail',
          type: ToastType.ERROR,
          content: t('team:CREATE_TEAM_MODAL.TOAST_CREATE_FAILED', { error: error?.message }),
          closeable: true,
        });
      }
    } catch (error) {
      // Info: (20250326 - Julian) 捕捉錯誤，並顯示錯誤訊息
      toastHandler({
        id: 'create-team-fail',
        type: ToastType.ERROR,
        content: `Create team failed: ${error}`,
        closeable: true,
      });
    }
  };

  const toNextStep =
    currentStep === 1
      ? // Info: (20250325 - Julian) 第一步到第二步
        () => setCurrentStep(2)
      : currentStep === 2
        ? () => setCurrentStep(3) // Info: (20250225 - Julian) 第二步到第三步
        : createTeamHandler; // printResult Info: (20250326 - Julian) 完成所有步驟 -> 建立團隊

  const cancelOrSkip =
    currentStep === 1
      ? // Info: (20250218 - Julian) 第一步為 Cancel，即關閉 Modal
        modalVisibilityHandler
      : // Info: (20250226 - Julian) 第二步的 Skip，應清空 teamMembers 再跳到下一步
        () => {
          setTeamMembers([]);
          setCurrentStep(3);
        };

  const backHandler = () => {
    if (selectedPlan !== listPaymentPlan[0]) {
      setSelectedPlan(listPaymentPlan[0]); // Info: (20250221 - Julian) 切換成免費方案 -> 回到選擇方案
    } else if (currentStep === 2) {
      setCurrentStep(1); // Info: (20250221 - Julian) 回到第一步
    } else if (currentStep === 3) {
      setCurrentStep(2); // Info: (20250221 - Julian) 回到第二步
    }
  };

  // Info: (20250326 - Julian) 如果填好名字，按 Enter 可以直接進入下一步
  const nameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === KEYBOARD_EVENT_CODE.ENTER && teamNameInput !== '') {
      setCurrentStep(2);
    }
  };

  // Info: (20250613 - Julian) Plus Button 點擊事件
  const plusBtnClick = () => {
    if (isValidEmail && teamMemberInput !== '') {
      setTeamMembers([...teamMembers, teamMemberInput]);
      setTeamMemberInput('');
      emailInputRef.current?.focus();
    }
  };

  // Info: (20250224 - Julian) 將填寫的 Email 加入清單、清空 input、focus 到 input
  const emailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === KEYBOARD_EVENT_CODE.ENTER && isValidEmail && teamMemberInput !== '') {
      setTeamMembers([...teamMembers, teamMemberInput]);
      setTeamMemberInput('');
      emailInputRef.current?.focus();
    }
  };

  // Info: (20250325 - Julian) 焦點離開後，檢查是否為有效 Email，是的話加入清單
  const emailBlur = () => {
    if (isValidEmail && teamMemberInput !== '') {
      setTeamMembers([...teamMembers, teamMemberInput]);
      setTeamMemberInput('');
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
  const subscriptionOverview = (
    <div className="flex w-max justify-center gap-lv-7">
      {listPaymentPlan.length > 0 ? (
        listPaymentPlan.map((plan) => {
          const selectPlan = () => setSelectedPlan(plan);
          return (
            <SubscriptionPlan
              key={plan.id}
              team={teamInfo}
              plan={plan}
              getOwnedTeam={async () => {}} // Info: (20250326 - Julian) 這裡不會用到
              goToPaymentHandler={selectPlan}
              bordered
            />
          );
        })
      ) : (
        <div className="flex animate-spin flex-col items-center justify-center">
          <PiSpinner size={96} />
        </div>
      )}
    </div>
  );

  // Info: (20250224 - Julian) 付款
  const paymentOverview = (
    <div className="flex min-h-600px w-300px flex-col gap-40px tablet:w-900px tablet:flex-row">
      <PlanInfo team={teamInfo} plan={selectedPlan} />

      <section className="flex flex-auto flex-col gap-24px">
        <PaymentInfo plan={selectedPlan} />

        <CreditCardInfo
          team={teamInfo}
          plan={selectedPlan}
          setTeamForAutoRenewalOn={setTeamForAutoRenewalOn}
          setTeamForAutoRenewalOff={setTeamForAutoRenewalOff}
          // setIsDirty={() => {}} // Info: (20250303 - Julian) 不需要使用
          isHideSubscribeButton // Info: (20250326 - Julian) 不需要顯示訂閱按鈕
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

  const invoiceOverview = teamInvoice && <InvoiceDetail invoice={teamInvoice} />;

  // Info: (20250303 - Julian) 免費方案 -> 顯示訂閱方案；其他方案 -> 顯示付款
  const step3Body = isBeginnerPlan ? subscriptionOverview : paymentOverview;

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
            className="flex-1 bg-transparent outline-none"
            onKeyDown={emailKeyDown}
            onBlur={emailBlur}
            placeholder={t('team:CREATE_TEAM_MODAL.MEMBER_EMAIL_PLACEHOLDER')}
          />
          {/* Info: (20250613 - Julian) Plus Button */}
          <button
            type="button"
            onClick={plusBtnClick}
            className="text-icon-surface-single-color-primary"
          >
            <FaPlus size={16} />
          </button>
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
          onKeyDown={nameKeyDown}
          className="rounded-sm border border-input-stroke-input px-12px py-10px outline-none placeholder:text-input-text-input-placeholder"
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
        <div className="min-h-max w-min max-w-300px overflow-x-auto pt-lv-5 tablet:max-w-90vw">
          {step3Body}
        </div>

        <ul className="ml-20px list-outside list-disc text-sm font-normal text-text-neutral-primary marker:text-surface-support-strong-maple tablet:text-base">
          <li>{t('team:CREATE_TEAM_MODAL.PLAN_HINT')}</li>
        </ul>
      </>
    );

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div
        className={`flex flex-col items-stretch rounded-md bg-surface-neutral-surface-lv1 p-0 tablet:gap-lv-5 tablet:p-lv-7 ${
          currentStep === 3 ? 'w-min' : 'w-90vw tablet:w-500px'
        }`}
      >
        {/* Info: (20250217 - Julian) Title */}
        <div className="relative flex items-start justify-center px-20px py-16px tablet:p-0">
          <h2 className="text-xl font-bold text-text-neutral-primary">
            {t('team:CREATE_TEAM_MODAL.MODAL_TITLE')}
          </h2>
          <button
            type="button"
            className="absolute right-20px text-icon-surface-single-color-primary tablet:right-0"
            onClick={modalVisibilityHandler}
          >
            <RxCross2 size={24} />
          </button>
        </div>

        <div className="flex flex-col items-stretch gap-lv-4 px-lv-5 py-lv-3 tablet:p-0">
          {/* Info: (20250217 - Julian) Stepper */}
          <CreateTeamStepper currentStep={currentStep} />

          {/* Info: (20250217 - Julian) Form */}
          <div
            ref={formBodyRef}
            className="relative flex max-h-400px flex-col gap-lv-4 overflow-y-auto tablet:max-h-500px tablet:gap-lv-7"
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
          </div>
        </div>

        {/* Info: (20250217 - Julian) Buttons */}
        <div className="flex items-center justify-between px-20px py-16px tablet:p-0">
          {currentStep > 1 && !teamInvoice && (
            <Button
              type="button"
              variant="secondaryBorderless"
              onClick={backHandler}
              className="hidden tablet:flex"
            >
              <TbArrowBackUp size={20} />
              {t('common:COMMON.BACK')}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-24px">
            {currentStep < 3 && (
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
  );
};

export default CreateTeamModal;
