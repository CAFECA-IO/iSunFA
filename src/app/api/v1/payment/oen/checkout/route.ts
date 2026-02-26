import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { mintToAddress } from '@/services/token.service';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { prisma } from '@/lib/prisma';

// Use env var or fallback to the provided test token
const OEN_ACCESS_TOKEN = process.env.OEN_ACCESS_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Ijk3MzVhYTEwLTcxMjItNGUzZC04MGJmLTVlNmFmNGE3OTBkMyJ9.eyJkb21haW4iOiJtZXJtZXIiLCJpc3MiOiJodHRwczovL3Rlc3Qub2VuLnR3IiwiYXVkIjoiaHR0cHM6Ly9wYXltZW50LWFwaS5kZXZlbG9wbWVudC5vZW4udHciLCJqdGkiOiIycmJrYlBTWmRvRFVQUmNDRnBFQ3B5TzFhQzciLCJpYXQiOjE3MzY4MzUyMzN9.Zhwz-wDUbPcwTDwUyZPK_x3iySamRe_p0ILjHJYHpvt8yzq1yg35y01dYG3bka7gYQwMkgxfGucGXVDfJ1QRnR9ZaR-PWXbmBrScw3LKYdkiZ9MNIXL4v_EM5ZoNo6tTiVyov5bOLmDboOgWpSdZnlahuMp4BWZPemZtJBANH7TjqAKbqk5N95dchMPqWjG_F7kvcB7RTyJZ3_c0D-3Sm0j_0ImbamObYnhSN3a7rwr3ApYyHjiOxLOw4isU4anbu02M5tNBUdrtGdgcjrxPcpHLQLJE6LYBDdPFOuwoIRzVrr8ZmTItkMdch3gsH5Ykgk6DuxZe-gPPftU7xph0qg";
const OEN_TRANSACTION_TOKEN = process.env.OEN_TRANSACTION_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImM4OGNkMzJjLTBkNmUtNDdmOS1hYzNmLTMxYTUwZGUxN2Y4YSJ9.eyJkb21haW4iOiJtZXJtZXIiLCJpc3MiOiJodHRwczovL3BheW1lbnQtYXBpLm9lbi50dyIsImF1ZCI6Imh0dHBzOi8vcGF5bWVudC1hcGkub2VuLnR3IiwianRpIjoiMnR0MnFYSUZaMVUzS3N2d0p4MmhzWDBHdHJGIiwiaWF0IjoxNzQxMTU3MjQwfQ.Z1UlT0VE6-0eCL694SWdyxgnhfgxdNMIOdDIuxL0gPUebUagftM6iGLCSEGsG8Vc7FNrAG0sXg38irCASdlxwR5Ik5_vpTC_byDIx8pQ48j4jl12fRcPKyDUoVZ35x8L4A4mjuha4Dtf4JreOSMVWmhfZ_Fa9hW7jR0m0WBshLM6Q_w6pv_pv1IJAPXtX6DVWo4gnvwDwqx2PthuoZcH451jKeB4tSvmbwLT0iTLqxoLj3IUBZmgCmquBc_roPRyEiVNNOFwTGQ2kwvq1_1Qq1Z4RshlGpdfoDpyfFt6ByTIf29Cru6nuVo-quL28u0nTULJdCuaAeawP7FjZsJPMg";

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        const user = await getIdentityFromDeWT(authHeader);

        if (!user) {
            return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
        }

        const { amount, credits, useSavedCard } = await request.json();
        console.log(`[OEN Checkout] Request received: amount=${amount}, credits=${credits}, useSavedCard=${useSavedCard}, userId=${user.id}`);

        if (!amount || amount <= 0 || !credits || credits <= 0) {
            console.error('[OEN Checkout] Invalid amount or credits');
            return jsonFail(ApiCode.VALIDATION_ERROR, 'Invalid amount or credits');
        }

        // Fetch user from DB to get the latest oenToken
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        });

        if (!dbUser) {
            console.error(`[OEN Checkout] User not found in DB: ${user.id}`);
            return jsonFail(ApiCode.NOT_FOUND, 'User not found');
        }
        console.log(`[OEN Checkout] User fetched from DB: hasTokens=${!!dbUser.oenToken}`);

        if (useSavedCard && dbUser.oenToken) {
            // Flow: Directly charge using the saved token
            console.log(`[OEN Checkout] Flow: Directly charge using saved token`);

            // Create a pending order first
            const order = await prisma.order.create({
                data: {
                    userId: user.id,
                    type: "OEN_PAYMENT",
                    amount: amount,
                    challenge: "N/A",
                    data: {
                        credits,
                        amount,
                        oenToken: dbUser.oenToken
                    }
                }
            });
            console.log(`[OEN Checkout] Created pending payment order: ${order.id}`);

            console.log(`[OEN Checkout] Calling OEN /token/transactions API: amount=${amount}, email=${dbUser.id}@isunfa.tw`);
            // Call OEN /token/transactions API
            const oenRes = await fetch('https://payment-api.testing.oen.tw/token/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OEN_TRANSACTION_TOKEN}`
                },
                body: JSON.stringify({
                    merchantId: "mermer",
                    amount: amount,
                    currency: "TWD",
                    token: dbUser.oenToken,
                    orderId: order.id,
                    userName: dbUser.name || "Unknown",
                    userEmail: `${dbUser.id}@isunfa.tw`, // Assuming email is not mandatory or we use a placeholder
                    productDetails: [{
                        productionCode: "ISUNFA-CREDITS",
                        description: `iSunFA Credits - ${credits}`,
                        quantity: 1,
                        unit: "pcs",
                        unitPrice: amount
                    }]
                })
            });

            const oenData = await oenRes.json();
            console.log(`[OEN Checkout] OEN /token/transactions response: status=${oenRes.status}`, JSON.stringify(oenData));

            if (oenData.code === "S0000" || oenRes.ok) { // Assuming S0000 or similar success code
                console.log(`[OEN Checkout] Charge successful, proceeding to mint ${credits} credits to ${user.address}...`);
                // Payment successful, mint points!
                const memo = JSON.stringify({ provider: "OEN", orderId: order.id, amount });
                const mintResult = await mintToAddress(CONTRACT_ADDRESSES.NTD_TOKEN, user.address, credits, memo);
                console.log(`[OEN Checkout] Mint result: success=${mintResult.success}, message=${mintResult.message}`);

                if (!mintResult.success) {
                    // Update order to fail, though payment succeeded (edge case to handle in prod, refund etc)
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { status: "MINT_FAILED", data: { ...order.data as object, oenResponse: oenData, error: mintResult.message } }
                    });
                    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Payment succeeded but minting failed: ' + mintResult.message);
                }

                const txHash = (mintResult.data as { tx: string })?.tx;

                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: "COMPLETED", transactionHash: txHash, data: { ...order.data as object, oenResponse: oenData } }
                });
                console.log(`[OEN Checkout] Order ${order.id} COMPLETED with txHash: ${txHash}`);

                return jsonOk({
                    requireBinding: false,
                    success: true,
                    txHash: txHash
                });
            } else {
                console.error(`[OEN Checkout] Charge failed via OEN`);
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: "FAILED", data: { ...order.data as object, oenResponse: oenData } }
                });
                return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Payment failed via OEN', oenData);
            }

        } else {
            console.log(`[OEN Checkout] Flow: No token or wants to bind a new card`);
            // Flow: No token or wants to bind a new card. Call OEN /checkout-token

            // Create a pending order to track this checkout intention
            const order = await prisma.order.create({
                data: {
                    userId: user.id,
                    type: "OEN_BINDING",
                    amount: amount,
                    challenge: "N/A",
                    data: {
                        credits,
                        amount
                    }
                }
            });

            // The success URL should redirect back to our frontend pricing page with a success param
            // We pass the order id in customId to map the callback back to our system
            const hostUrl = request.headers.get('host') || 'localhost:3000';
            const protocol = hostUrl.includes('localhost') ? 'http' : 'https';
            const originBase = `${protocol}://${hostUrl}`;

            const webhookBase = process.env.NEXT_PUBLIC_APP_URL || originBase;

            console.log(`[OEN Checkout] webhookBase: ${webhookBase}`);

            const oenRes = await fetch('https://payment-api.testing.oen.tw/checkout-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OEN_ACCESS_TOKEN}`
                },
                body: JSON.stringify({
                    merchantId: "mermer",
                    successUrl: `${originBase}/pricing?tab=credits&payment_success=true&order_id=${order.id}&amount=${amount}&credits=${credits}`,
                    failureUrl: `${originBase}/pricing?tab=credits&payment_failure=true&order_id=${order.id}`,
                    customId: order.id,
                    callbackUrl: `${webhookBase}/api/payment/callback/oen`
                })
            });

            const oenData = await oenRes.json();
            console.log(`[OEN Checkout] OEN /checkout-token response: status=${oenRes.status}`, JSON.stringify(oenData));

            if (oenData.code === "S0000" && oenData.data?.id) {
                const paymentId = oenData.data.id;
                console.log(`[OEN Checkout] Received checkout-token paymentId: ${paymentId}`);

                await prisma.order.update({
                    where: { id: order.id },
                    data: { data: { ...order.data as object, paymentId: paymentId } }
                });

                return jsonOk({
                    requireBinding: true,
                    paymentId: paymentId,
                    redirectUrl: `https://mermer.testing.oen.tw/checkout/subscription/create/${paymentId}`
                });
            } else {
                console.error(`[OEN Checkout] Failed to get OEN checkout token`);
                return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to get OEN checkout token', oenData);
            }
        }
    } catch (error) {
        console.error('[API] /payment/oen/checkout error:', error);
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
    }
}
