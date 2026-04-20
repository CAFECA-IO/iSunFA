import { prisma } from "./src/lib/prisma"; async function main() { console.log(await prisma.user.findMany({ select: { id: true, address: true } })); } main();
