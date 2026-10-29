import 'dotenv/config'
import { prisma } from './src/lib/db'

// const email = 'sanjeev834637@gmail.com'
const email = 'rockytakatak555@gmail.com'

const user = await prisma.user.findUnique({
  where: { email },
})

if (!user) {
  console.log('User not found')
  process.exit(0)
}

console.log('Found user:', {
  id: user.id,
  email: user.email,
  name: user.name,
})

await prisma.$transaction([
  prisma.session.deleteMany({
    where: { userId: user.id },
  }),

  prisma.account.deleteMany({
    where: { userId: user.id },
  }),

  prisma.user.delete({
    where: { id: user.id },
  }),
])

console.log('User permanently deleted.')


// npx tsx zdelete-user.ts
