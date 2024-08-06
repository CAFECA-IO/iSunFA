import { useState, useEffect } from 'react';
import Image from 'next/image';
import { RxCross2, RxCrossCircled } from 'react-icons/rx';
import { FaPlus, FaChevronDown, FaCheck } from 'react-icons/fa6';
import { LuChevronsUpDown } from 'react-icons/lu';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import { ProjectStage, stageList } from '@/constants/project';
import { FiSearch } from 'react-icons/fi';
import { IMember, dummyMemberList } from '@/interfaces/member';
import { useTranslation } from 'next-i18next';
import { useUserCtx } from '@/contexts/user_context';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { MessageType } from '@/interfaces/message_modal';

// Info: (2024704 - Anna) For list
// Info: (2024704 - Anna) 定義階段名稱到翻譯鍵值的映射
interface StageNameMap {
  [key: string]: string;
}

const stageNameMap: StageNameMap = {
  Designing: 'STAGE_NAME_MAP.DESIGNING',
  Developing: 'STAGE_NAME_MAP.DEVELOPING',
  'Beta Testing': 'STAGE_NAME_MAP.BETA_TESTING',
  Selling: 'STAGE_NAME_MAP.SELLING',
  Sold: 'STAGE_NAME_MAP.SOLD',
  Archived: 'STAGE_NAME_MAP.ARCHIVED',
};

// Info: (2024704 - Anna) 反向映射，用於從翻譯值回到原始名稱，讓篩選時可以比對
// const stageNameMapReverse: { [key: string]: ProjectStage } = {
//   'STAGE_NAME_MAP.DESIGNING': ProjectStage.DESIGNING,
//   'STAGE_NAME_MAP.DEVELOPING': ProjectStage.DEVELOPING,
//   'STAGE_NAME_MAP.BETA_TESTING': ProjectStage.BETA_TESTING,
//   'STAGE_NAME_MAP.SELLING': ProjectStage.SELLING,
//   'STAGE_NAME_MAP.SOLD': ProjectStage.SOLD,
//   'STAGE_NAME_MAP.ARCHIVED': ProjectStage.ARCHIVED,
// };

interface IAddProjectModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  defaultStage: ProjectStage;
}

const AddProjectModal = ({
  isModalVisible,
  modalVisibilityHandler,
  defaultStage,
}: IAddProjectModalProps) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler } = useGlobalCtx();

  const {
    trigger: createProject,
    data,
    success,
    code,
  } = APIHandler<{
    name: string;
    stage: string;
    members: string[];
  }>(APIName.CREATE_PROJECT);

  const [inputName, setInputName] = useState('');
  const [selectedStage, setSelectedStage] = useState<ProjectStage>(defaultStage);
  const [selectedMembers, setSelectedMembers] = useState<IMember[]>([]);
  const [searchMemberValue, setSearchMemberValue] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const {
    targetRef: stageOptionsRef,
    componentVisible: isStageOptionsVisible,
    setComponentVisible: setStageOptionsVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: membersRef,
    componentVisible: isMembersVisible,
    setComponentVisible: setMembersVisible,
  } = useOuterClick<HTMLDivElement>(false);

  const isConfirmValid = inputName !== ''; // && selectedMembers.length > 0;
  const membersAmount = selectedMembers.length;

  const stageMenuClickHandler = () => setStageOptionsVisible(!isStageOptionsVisible);
  const membersMenuClickHandler = () => setMembersVisible(!isMembersVisible);

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputName(event.target.value);
  };
  const searchMemberChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchMemberValue(event.target.value);
  };
  const addProjectSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // ToDo: (20240611 - Julian) send data to API
    createProject({
      params: {
        companyId: selectedCompany?.id,
      },
      body: {
        name: inputName,
        stage: selectedStage,
        // ToDo: (20240802 - Julian) get member list
        memberIdList: [], // selectedMembers.map((member) => member.id),
      },
    });
  };

  useEffect(() => {
    setSelectedStage(defaultStage);
  }, [defaultStage]);

  useEffect(() => {
    // Info: (20240611 - Julian) reset input fields when modal is closed
    if (!isModalVisible) {
      setInputName('');
      setSelectedMembers([]);
      setSearchMemberValue('');
      setCreateSuccess(false);
    }
  }, [isModalVisible]);

  useEffect(() => {
    if (success && data) {
      modalVisibilityHandler();
    } else if (success === false) {
      // Info: (20240802 - Julian) show error message when create project failed
      // Info: (20240805 - Anna) 錯誤訊息的多語系
      messageModalDataHandler({
        messageType: MessageType.ERROR,
        title: 'Error',
        content: 'Create project failed, please try again later.',
        subMsg: `Error code: ${code}`,
        submitBtnFunction: messageModalVisibilityHandler,
        submitBtnStr: t('PROJECT.OK'),
      });
    }
  }, [createSuccess, data]);

  // ToDo: (20240612 - Julian) get member list from API
  const filteredMemberList = dummyMemberList.filter((member) => {
    return (
      // Info: (20240611 - Julian) 搜尋條件：名字或職稱
      member.name.toLowerCase().includes(searchMemberValue.toLowerCase()) ||
      member.role.toLowerCase().includes(searchMemberValue.toLowerCase())
    );
  });

  const displayedStageOptions = (
    <div
      ref={stageOptionsRef}
      className={`absolute right-0 top-12 z-10 flex w-full flex-col items-start rounded-sm border border-input-stroke-input ${isStageOptionsVisible ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-10 opacity-0'} bg-input-surface-input-background px-12px py-8px text-sm shadow-md transition-all duration-300 ease-in-out`}
    >
      {stageList.map((stage) => (
        <button
          key={stage}
          type="button"
          className="w-full p-8px text-left hover:bg-dropdown-surface-item-hover"
          onClick={() => setSelectedStage(stage)}
        >
          {t(stageNameMap[stage])}
        </button>
      ))}
    </div>
  );

  const displaySelectedMembers =
    selectedMembers.length > 0 ? (
      selectedMembers.map((member) => {
        const removeMemberHandler = () => {
          const newMembers = selectedMembers.filter((selectedMember) => selectedMember !== member);
          setSelectedMembers(newMembers);
        };
        return (
          <div className="flex flex-none items-center gap-8px rounded-full border border-badge-text-secondary p-6px text-sm text-dropdown-text-primary">
            <Image src="/elements/yellow_check.svg" alt="member_avatar" width={20} height={20} />
            <p className="whitespace-nowrap">{member.name}</p>
            <button type="button" onClick={removeMemberHandler}>
              <RxCrossCircled size={16} />
            </button>
          </div>
        );
      })
    ) : (
      <p className="text-left text-input-text-input-placeholder">
        {t('PROJECT.CHOOSE_TEAM_MEMBERS')}
      </p>
    );

  const displayMemberList = filteredMemberList.map((member) => {
    const isSelected = selectedMembers.includes(member);
    const memberClickHandler = () => {
      if (isSelected) {
        // Info: (20240611 - Julian) 如果已經選取，則移除
        const newMembers = selectedMembers.filter(
          (selectedMember) => selectedMember.name !== member.name
        );
        setSelectedMembers(newMembers);
      } else {
        // Info: (20240611 - Julian) 如果沒有選取，則加入
        setSelectedMembers([...selectedMembers, member]);
      }
    };

    return (
      <button
        key={member.name}
        type="button"
        className="flex w-full items-center justify-between px-12px py-8px hover:bg-dropdown-surface-item-hover"
        onClick={memberClickHandler}
      >
        <div className="flex flex-1 items-end gap-12px">
          <Image src={member.imageId} alt="member_avatar" width={20} height={20} />
          <p className="text-sm text-dropdown-text-primary">{member.name}</p>
          <p className="text-xs text-dropdown-text-secondary">{member.role}</p>
        </div>

        <FaCheck size={16} className={`${isSelected ? 'block' : 'hidden'}`} />
      </button>
    );
  });

  const displayMembersMenu = (
    <div
      ref={membersRef}
      className={`absolute left-0 top-50px grid w-full grid-cols-1 overflow-hidden rounded-sm border bg-white px-12px py-10px ${isMembersVisible ? 'grid-rows-1 opacity-100 shadow-dropmenu' : 'grid-rows-0 opacity-0'} transition-all duration-300 ease-in-out`}
    >
      <div className="flex flex-col items-start">
        {/* Info: (20240611 - Julian) search bar */}
        <div className="my-8px flex w-full items-center justify-between rounded-sm border px-12px py-8px text-darkBlue2">
          <input
            id="companySearchBar"
            type="text"
            placeholder={t('AUDIT_REPORT.SEARCH')}
            value={searchMemberValue}
            onChange={searchMemberChangeHandler}
            className="w-full outline-none placeholder:text-lightGray4"
          />
          <FiSearch size={16} />
        </div>
        <div className="px-12px py-8px text-xs font-semibold uppercase text-dropdown-text-head">
          {t('PROJECT.DEVELOPMENT_DEPARTMENT')}
        </div>
        {/* Info: (20240611 - Julian) member list */}
        <div className="flex max-h-50px w-full flex-col items-start overflow-y-auto overflow-x-hidden md:max-h-100px">
          {displayMemberList}
        </div>
      </div>
    </div>
  );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative flex w-90vw max-w-600px flex-col rounded-sm bg-white py-20px">
        {/* Info: (20240611 - Julian) title */}
        <div className="flex flex-col items-start gap-2px whitespace-nowrap border-b px-20px pb-20px">
          {/* Info: (20240611 - Julian) desktop title */}
          <h1 className="text-xl font-bold text-card-text-primary">
            {t('PROJECT.ADD_NEW_PROJECT')}
          </h1>
          <p className="text-xs text-card-text-secondary">
            {t('PROJECT.EDIT_PROJECT_INFORMATION')}
          </p>
        </div>
        {/* Info: (20240611 - Julian) close button */}
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-lightGray5"
        >
          <RxCross2 size={20} />
        </button>
        {/* Info: (20240611 - Julian) content */}
        <form
          onSubmit={addProjectSubmitHandler}
          className="flex w-full flex-col gap-y-40px text-sm text-navyBlue2"
        >
          {/* Info: (20240611 - Julian) input fields */}
          <div className="flex flex-col items-center gap-x-16px gap-y-50px px-20px pt-40px text-center md:grid-cols-2">
            {/* Info: (20240611 - Julian) first row */}
            <div className="flex w-full flex-col items-start justify-between gap-y-20px md:flex-row">
              {/* Info: (20240611 - Julian) project name */}
              <div className="flex w-full flex-col items-start gap-y-8px md:w-250px">
                <p className="font-semibold">{t('PROJECT.PROJECT_NAME')}</p>
                <input
                  type="text"
                  placeholder={t('PROJECT.NAME_YOUR_PROJECT')}
                  value={inputName}
                  onChange={nameChangeHandler}
                  required
                  className="h-46px w-full rounded-sm border border-input-stroke-input px-12px outline-none placeholder:text-input-text-input-placeholder"
                />
              </div>
              {/* Info: (20240611 - Julian) stage selection */}
              <div className="flex w-full flex-col items-start gap-y-8px md:w-200px">
                <p className="font-semibold">{t('PROJECT.STAGE')}</p>
                <div
                  onClick={stageMenuClickHandler}
                  className={`relative flex h-46px w-full items-center justify-between rounded-sm border bg-input-surface-input-background ${isStageOptionsVisible ? 'border-input-stroke-selected' : 'border-input-stroke-input'} px-12px hover:cursor-pointer md:w-200px`}
                >
                  {/* Info: (2024704 - Anna) 顯示翻譯後的選擇階段 */}
                  {t(stageNameMap[selectedStage])}
                  <FaChevronDown />
                  {displayedStageOptions}
                </div>
              </div>
            </div>

            {/* Info: (20240611 - Julian) member selection */}
            <div className="flex w-full flex-col items-start gap-y-8px">
              <div className="flex w-full items-end justify-between">
                <p className="font-semibold">{t('PROJECT.TEAM_MEMBERS')}</p>
                {/* Info: (20240611 - Julian) amount of selected members */}
                <p className="text-sm text-input-text-secondary">{membersAmount}</p>
              </div>
              <div className="relative flex h-46px w-full items-center rounded-sm border border-input-stroke-input px-12px">
                <div className="flex w-full flex-1 gap-4px overflow-x-auto">
                  {displaySelectedMembers}
                </div>
                <button type="button" onClick={membersMenuClickHandler}>
                  <LuChevronsUpDown size={20} />
                </button>

                {displayMembersMenu}
              </div>
            </div>
          </div>
          {/* Info: (20240611 - Julian) confirm buttons */}
          <div className="flex items-center justify-end gap-12px border-t px-20px pt-20px">
            <Button
              className="px-16px py-8px"
              type="button"
              onClick={modalVisibilityHandler}
              variant={null}
            >
              {t('REPORTS_HISTORY_LIST.CANCEL')}
            </Button>
            <Button
              className="px-16px py-8px"
              type="submit"
              variant="tertiary"
              disabled={!isConfirmValid}
            >
              <p>{t('PROJECT.ADD')}</p> <FaPlus />
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AddProjectModal;
