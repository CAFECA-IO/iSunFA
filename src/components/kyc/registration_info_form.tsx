import { RegistrationInfoKeys, IRegistrationInfo } from '@/interfaces/kyc_registration_info';

const RegistrationInfoForm = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChange,
}: {
  data: IRegistrationInfo;
  onChange: (key: RegistrationInfoKeys, value: string) => void;
}) => {
  return <>RegistrationInfoForm</>;
};

export default RegistrationInfoForm;
