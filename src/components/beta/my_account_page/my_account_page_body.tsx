import React from 'react';
import { IPaginatedData } from '@/interfaces/pagination';
import { ILoginDevice } from '@/interfaces/login_device';

interface IMyAccountPageBodyProps {
  loginDevices: IPaginatedData<ILoginDevice[]> | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MyAccountPageBody: React.FC<IMyAccountPageBodyProps> = ({ loginDevices }) => {
  return <div></div>;
};

export default MyAccountPageBody;
