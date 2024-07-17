import { ContactInfoKeys, IContactInfo } from '@/interfaces/kyc_contact_info';

const ContactInfoForm = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChange,
}: {
  data: IContactInfo;
  onChange: (key: ContactInfoKeys, value: string) => void;
}) => {
  return <>ContactInfoForm</>;
};

export default ContactInfoForm;
