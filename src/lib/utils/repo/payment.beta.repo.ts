import { IPaymentBeta } from "@/interfaces/payment";
import prisma from "@/client";
import { Prisma, Payment } from "@prisma/client";
import { getTimestampNow } from "@/lib/utils/common";

export async function createPayment(payment: IPaymentBeta) {
    let result: Payment | null = null;
    const nowInSecond = getTimestampNow();

    const data: Prisma.PaymentCreateInput = {
        ...payment,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
        deletedAt: null,
    };

    const paymentCreateArgs = {
        data,
    };

    try {
        result = await prisma.payment.create(paymentCreateArgs);
    } catch (error) {
        // Deprecate: ( 20240605 - Murky ) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(error);
    }

    return result;
}

export async function updatePayment(paymentId: number, payment: IPaymentBeta) {
    let result: Payment | null = null;
    const nowInSecond = getTimestampNow();

    const data: Prisma.PaymentUpdateInput = {
        ...payment,
        updatedAt: nowInSecond,
    };

    const where: Prisma.PaymentWhereUniqueInput = {
        id: paymentId,
    };

    const paymentUpdateArgs = {
        where,
        data,
    };

    try {
        result = await prisma.payment.update(paymentUpdateArgs);
    } catch (error) {
        // Deprecate: ( 20240605 - Murky ) Debugging purpose
        // eslint-disable-next-line no-console
        console.log(error);
    }

    return result;
}
