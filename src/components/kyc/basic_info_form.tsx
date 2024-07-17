import { BasicInfoKeys, IBasicInfo } from '@/interfaces/kyc_basic_info';

const BasicInfoForm = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChange,
}: {
  data: IBasicInfo;
  onChange: (key: BasicInfoKeys, value: string) => void;
}) => {
  return <>BasicInfoForm</>;
};

export default BasicInfoForm;
