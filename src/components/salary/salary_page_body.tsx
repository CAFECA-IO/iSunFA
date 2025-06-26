import SalarySidebar from '@/components/salary_sidebar/salary_sidebar';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { LuTrash2 } from 'react-icons/lu';
import { AiOutlineUserAdd } from 'react-icons/ai';
import { IoSearch } from 'react-icons/io5';
import { VscSettings } from 'react-icons/vsc';

interface ISalaryPageBodyProps {
  isAuthLoading: boolean;
}

const SalaryPageBody = ({ isAuthLoading }: ISalaryPageBodyProps) => {
  const { t } = useTranslation(['common', 'salary']);

  return (
    <div>
      {isAuthLoading ? (
        <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
          <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
        </div>
      ) : (
        <>
          {/* Sidebar */}
          <div className="">
            <SalarySidebar />
          </div>

          {/* ----- Desktop ----- */}
          <main className="hidden min-h-100vh bg-surface-neutral-main-background md:flex">
            <div className="mt-100px flex-1 px-80px md:ml-80px">
              {/* Page Title */}
              <section className="flex flex-col gap-16px pb-20px pt-60px">
                <div className="text-h2 font-semibold leading-h2 text-text-neutral-secondary">
                  {t('salary:SALARY.EMPLOYEES_LIST')}
                </div>
                {/* line */}
                <hr className="my-10px grow border-divider-stroke-lv-4" />
              </section>
              {/* Buttons */}
              <section className="flex justify-end gap-16px">
                <div className="flex cursor-pointer items-center gap-8px rounded-xs border border-button-stroke-secondary px-24px py-10px text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover">
                  <div className="text-inherit">
                    <AiOutlineUserAdd size={20} />
                  </div>
                  <p className="text-base font-medium text-inherit">
                    {t('salary:SALARY.ADD_NEW_EMPLOYEE')}
                  </p>
                </div>
                <div className="flex cursor-pointer items-center gap-8px rounded-xs border border-button-stroke-secondary px-24px py-10px text-button-text-secondary hover:border-button-stroke-primary-hover hover:text-button-text-primary-hover">
                  <div className="text-inherit">
                    <LuTrash2 size={20} />
                  </div>
                  <p className="text-base font-medium text-inherit">
                    {t('salary:SALARY.ONE_CLICK_REMOVAL')}
                  </p>
                </div>
              </section>
              {/* Divider */}
              <section className="flex items-center gap-lv-4 pt-20px">
                <div className="flex gap-lv-2">
                  <Image src="/icons/employee.svg" alt="Employee Icon" width={16} height={16} />
                  <div className="text-sm font-medium text-divider-text-lv-1">
                    {t('salary:SALARY.EMPLOYEES_LIST')}
                  </div>
                </div>
                {/* line */}
                <hr className="grow border-divider-stroke-lv-3" />
              </section>
              {/* search bar */}
              <section className="mt-40px flex grow items-center justify-between gap-8px rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px focus-within:border-stroke-brand-primary focus-within:bg-input-surface-input-selected focus:border">
                <div className="grow">
                  <input
                    type="text"
                    placeholder={t('search:COMMON.SEARCH')}
                    className="w-full bg-transparent text-base font-medium placeholder:text-input-text-input-placeholder focus:outline-none"
                  />
                </div>
                <div className="cursor-pointer">
                  <IoSearch size={20} />
                </div>
              </section>
              {/* Empty */}
              <section className="mt-180px flex flex-col items-center">
                <Image src="/icons/empty.svg" alt="Empty Icon" width={40} height={40} />
                <div className="text-h6 font-semibold leading-h6 text-text-neutral-tertiary">
                  {t('salary:SALARY.EMPTY')}
                </div>
              </section>
            </div>
          </main>

          {/* ----- Mobile ----- */}
          <main className="flex h-100vh flex-col gap-lv-7 bg-surface-neutral-main-background px-16px pb-24px pt-120px md:hidden md:h-1100px">
            {/* Page Title */}
            <section className="flex flex-col justify-between gap-8px pt-20px">
              {/* title & buttons */}
              <div className="flex items-center justify-between gap-24px">
                {/* title */}
                <div className="text-base font-semibold text-text-neutral-secondary">
                  {t('salary:SALARY.EMPLOYEES_LIST')}
                </div>
                {/* buttons */}
                <div className="flex gap-12px">
                  <div className="flex cursor-pointer rounded-xs bg-button-surface-strong-secondary p-10px text-button-text-invert active:bg-button-surface-strong-secondary-hover">
                    <AiOutlineUserAdd size={16} />
                  </div>
                  <div className="flex cursor-pointer rounded-xs bg-button-surface-strong-secondary p-10px text-button-text-invert active:bg-button-surface-strong-secondary-hover">
                    <LuTrash2 size={16} />
                  </div>
                </div>
              </div>
              {/* line */}
              <hr className="my-10px grow border-divider-stroke-lv-4" />
            </section>

            {/* filters - search & filter */}
            <section className="flex items-center justify-between gap-24px">
              {/* search bar */}
              <div className="flex grow items-center justify-between gap-8px rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px focus-within:border-stroke-brand-primary focus-within:bg-input-surface-input-selected focus:border">
                <div className="grow">
                  <input
                    type="text"
                    placeholder={t('search:COMMON.SEARCH')}
                    className="w-full bg-transparent text-base font-medium placeholder:text-input-text-input-placeholder focus:outline-none"
                  />
                </div>
                <div className="cursor-pointer">
                  <IoSearch size={20} />
                </div>
              </div>
              {/* filter button */}
              <div className="cursor-pointer rounded-xs border border-button-stroke-secondary p-10px text-button-text-secondary active:border-button-stroke-primary-hover active:text-button-text-primary-hover">
                <VscSettings size={16} />
              </div>
            </section>

            {/* Divider */}
            <section className="flex items-center gap-lv-4">
              <div className="flex gap-lv-2">
                <Image src="/icons/employee.svg" alt="Employee Icon" width={16} height={16} />
                <div className="text-sm font-medium text-divider-text-lv-1">
                  {t('salary:SALARY.EMPLOYEES_LIST')}
                </div>
              </div>
              {/* line */}
              <hr className="grow border-divider-stroke-lv-3" />
            </section>

            {/* Empty */}
            <section className="flex flex-col items-center">
              <Image src="/icons/empty.svg" alt="Empty Icon" width={40} height={40} />
              <div className="text-h6 font-semibold leading-h6 text-text-neutral-tertiary">
                {t('salary:SALARY.EMPTY')}
              </div>
            </section>
          </main>
        </>
      )}
    </div>
  );
};

export default SalaryPageBody;
