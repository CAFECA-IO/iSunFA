import { PrismaClient } from '@prisma/client'
import accounts from './seed_json/account.json'

const prisma = new PrismaClient()
async function main() {
    for (let account of accounts) {
        await prisma.account.create({
          data: account,
        });
      }
}
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })