/**
 * Info: (20240927 - Murky)
 * This file is not router, but all small function for voucher/index and voucher/read
 */
export const mockVouchersReturn = [
  {
    id: 1001,
    eventId: null, // Info: (20240927 - Murky) will be null if not recurring, integer if recurring
    hasRead: true,
    status: 'uploaded', // Info: (20240927 - Murky) "uploaded" or "upcoming"
    canBeEdit: true, // Info: (20240927 - Murky) true or false
    voucherNo: '240417-001',
    voucherDate: 1000000,
    type: 'payment', // Info: (20240927 - Murky)  payment or transfer or receiving
    note: 'This is a note',
    createAt: 1000000,
    updateAt: 1000000,
    deletedAt: null, // Info: (20240927 - Murky) if have Number then it is deleted
    reverseAt: 1727317, // Info: (20240927 - Murky) if have Number then it is reversed
    certificates: [
      {
        id: 1,
        inputOrOutput: 'input',
        certificateDate: 10000001,
        certificateNo: 'AB-12345678',
        currencyAlias: 'TWD',
        priceBeforeTax: 4000,
        taxRatio: 5,
        taxPrice: 200,
        totalPrice: 4200,
        counterPartyId: 1,
        invoiceType: 'triplicate_uniform_invoice',
        deductible: true,
        connectToId: null,
        name: 'invoice001.jpg',
        url: '/api/v2/certificate/1',
        type: 'invoice',
        connectToType: 'voucher',
        mimeTYpe: 'image/jpeg',
        size: '3.0 MB',
        uploadProgress: 50,
        aiResultId: 'douhvjax_-1',
        aiStatus: 'success',
        createAt: 10000000,
        updateAt: 10000000,
      },
    ],
    reverseVoucherIds: [
      // Info: (20240927 - Murky) 或是完整的voucher?
      {
        id: 1111,
        voucherNo: '240817-001',
      },
      {
        id: 1112,
        voucherNo: '240817-002',
      },
    ],
    issuer: {
      // Info: (20240927 - Murky) IUser
      id: 1001,
      name: 'Murky',
      fullName: 'Tiny Murky',
      email: 'fakeemail@cool.com',
      phone: '1234567890',
      imageId: '/api/v2/image/1001.jpg',
      agreementList: ['agreement1', 'agreement2'],
      createdAt: 1000000,
      updatedAt: 1000000,
    },
    counterParty: {
      // Info: (20240927 - Murky) ICustomerVendor
      id: 1001,
      companyId: 1001,
      name: 'Cool LLC',
      taxId: '12345678',
      type: 'customer',
      note: 'This is a note',
      createdAt: 1000000,
      updatedAt: 1000000,
    },
    payableInfo: {
      // Info: (20240927 - Murky) payableInfo 如果存在，那麼receivingInfo就會都是0
      total: 1000,
      alreadyHappened: 400,
      remain: 600,
    },
    receivingInfo: {
      total: 1000,
      alreadyHappened: 400,
      remain: 600,
    },
    recurringInfo: {
      type: 'month', // Info: (20240927 - Murky) month or year or week or atOnce
      startDate: 1000000,
      endDate: 1000100,
      daysOfWeek: [0, 1, 2], // Info: (20240927 - Murky) 這邊是示範，如果type是week, 這個array才有東西, 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
      daysOfMonth: [1, 15, 30], // Info: (20240927 - Murky) 這邊是示範，如果type是month, 這個array才有東西
      daysOfYears: [
        {
          month: 1,
          day: 1,
        },
        {
          month: 12,
          day: 25,
        },
      ], // Info: (20240927 - Murky) 這邊是示範，如果type是year, 這個array才有東西
    },
    assets: [
      // Info: (20240927 - Murky) IAssetItem
      {
        id: 1,
        acquisitionDate: 1632511200,
        assetType: '123 Machinery',
        assetNumber: 'A000010',
        assetName: 'MackBook',
        purchasePrice: 100000,
        accumulatedDepreciation: 5000,
        residualValue: 5000,
        remainingTimestamp: 1761580800,
        assetStatus: 'normal', // Info: (20240927 - Murky) AssetStatus.NORMAL,
      },
    ],
    lineItemsInfo: {
      sum: {
        debit: true,
        amount: 1000,
      },
      lineItems: [
        {
          id: 1001,
          amount: 1000,
          description: 'This is a description',
          debit: true,
          account: {
            id: 1001,
            companyId: 1001,
            system: 'IFRS',
            type: 'Asset',
            debit: true,
            liquidity: true,
            code: '1001',
            name: 'Cash',
            forUser: true,
            parentCode: '1000',
            rootCode: '1000',
            createdAt: 1000000,
            updatedAt: 1000000,
            level: 1,
            deletedAt: null,
          },
          voucherId: 1001,
          createdAt: 1000000,
          updatedAt: 1000000,
          deletedAt: null,
        },
        {
          id: 1002,
          amount: 1001,
          description: 'This is a description',
          debit: false,
          account: {
            id: 1002,
            companyId: 1001,
            system: 'IFRS',
            type: 'Asset',
            debit: true,
            liquidity: true,
            code: '1002',
            name: 'Accounts Receivable',
            forUser: true,
            parentCode: '1000',
            rootCode: '1000',
            createdAt: 1000000,
            updatedAt: 1000000,
            level: 1,
            deletedAt: null,
          },
          voucherId: 1001,
          createdAt: 1000000,
          updatedAt: 1000000,
          deletedAt: null,
        },
      ],
    },
  },
];
