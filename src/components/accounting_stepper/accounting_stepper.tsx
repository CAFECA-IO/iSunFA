import Image from 'next/image';

const AccountingStepper = () => {
  const displayStepOne = (
    <div className="z-10 flex flex-col items-center gap-2px text-sm text-primaryYellow5">
      <Image src="/icons/input_active.svg" width={30} height={30} alt="step_1_input_type" />
      <p>Input Type</p>
    </div>
  );

  const displayConnectingLineOne = (
    <div className="absolute left-40px top-12px h-4px w-90px bg-lightGray6 md:w-180px"></div>
  );

  const displayStepTwo = (
    <div className="z-10 flex flex-col items-center gap-2px text-sm text-lightGray4">
      <Image src="/icons/form.svg" width={30} height={30} alt="step_2_fill_up_form" />
      <p>Fill Up Form</p>
    </div>
  );

  return (
    <div className="relative flex items-center gap-40px md:gap-120px">
      {/* Info: (20240422 - Julian) Step 1 */}
      {displayStepOne}

      {/* Info: (20240422 - Julian) Connecting Line */}
      {displayConnectingLineOne}

      {/* Info: (20240422 - Julian) Step 2 */}
      {displayStepTwo}

      {/* Info: (20240422 - Julian) Connecting Line */}
      <div className="absolute right-30px top-12px h-4px w-90px bg-lightGray6 md:w-180px"></div>

      {/* Info: (20240422 - Julian) Step 3 */}
      <div className="z-10 flex flex-col items-center gap-2px text-sm text-lightGray4">
        <Image src="/icons/confirm.svg" width={30} height={30} alt="step_3_confirm" />
        <p>Confirm</p>
      </div>
    </div>
  );
};

export default AccountingStepper;
