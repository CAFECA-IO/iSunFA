import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUserSetting } from '@/interfaces/user_setting';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

// ToDo: (20240924 - Jacky) Implement the logic to get the user settings data from the database
async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserSetting[] | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Implement the logic to get the user settings data from the database
  // ToDo: (20240924 - Jacky) Format the user settings data to the IUserSetting interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  payload = [
    {
      id: 1,
      userId: 101,
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        country: 'USA',
        phone: '1234567890',
        language: 'English',
      },
      notificationSetting: {
        systemNotification: true,
        updateAndSubscriptionNotification: false,
        emailNotification: true,
      },
      createdAt: 1627847284,
      updatedAt: 1627847284,
      deletedAt: 0,
    },
    {
      id: 2,
      userId: 102,
      personalInfo: {
        firstName: 'Jane',
        lastName: 'Smith',
        country: 'Canada',
        phone: '0987654321',
        language: 'French',
      },
      notificationSetting: {
        systemNotification: false,
        updateAndSubscriptionNotification: true,
        emailNotification: false,
      },
      createdAt: 1627847284,
      updatedAt: 1627847284,
      deletedAt: 0,
    },
  ];
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
}

// ToDo: (20240924 - Jacky) Implement the logic to create a new user setting in the database
async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserSetting | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Validate the request body
  // ToDo: (20240924 - Jacky) Implement the logic to create a new user setting in the database
  // ToDo: (20240924 - Jacky) Format the user settings data to the IUserSetting interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  const {
    firstName,
    lastName,
    country,
    phone,
    language,
    systemNotification,
    updateAndSubscriptionNotification,
    emailNotification,
  } = req.body;

  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newIUserSetting: IUserSetting = {
    id: 3,
    userId: req.body.userId, // ToDo: (20240926 - Jacky) Get the user ID from the session
    personalInfo: {
      firstName,
      lastName,
      country,
      phone,
      language,
    },
    notificationSetting: {
      systemNotification,
      updateAndSubscriptionNotification,
      emailNotification,
    },
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
    deletedAt: 0,
  };

  payload = newIUserSetting;
  statusMessage = STATUS_MESSAGE.CREATED;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUserSetting[] | IUserSetting | null }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUserSetting[] | IUserSetting | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserSetting[] | IUserSetting | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IUserSetting[] | IUserSetting | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
