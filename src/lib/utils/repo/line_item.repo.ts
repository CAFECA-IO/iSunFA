// import prisma from '@/client';
// import { AccountType } from '@/constants/account';
// import { timestampInSeconds } from '../common';

// async function getSumOfLineItemsGroupByAccountInPrisma(
//   companyId: number,
//   type: AccountType,
//   startDate: number,
//   endDate: number,
// ) {
//   const startDateInSecond = timestampInSeconds(startDate);
//   const endDateInSecond = timestampInSeconds(endDate);

//   return prisma.lineItem.groupBy({
//     by: ['accountId'],
//     where: {
//       account: {
//         type,
//       },
//       voucher: {
//         journal: {
//           companyId,
//           AND: [
//             {
//               date: {
//                 gte: startDateInSecond,
//               },
//             },
//             {
//               date: {
//                 lte: endDateInSecond,
//               },
//             },
//           ],
//         }
//       }
//     }

//   });
// }
