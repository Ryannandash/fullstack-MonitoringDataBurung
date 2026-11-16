const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const initialUsers = [
  { username: 'superadmin', fullName: 'Super Admin', role: 'super_admin' },
  { username: 'headkeeper', fullName: 'Head Keeper', role: 'head_keeper' },
  { username: 'keeper', fullName: 'Keeper', role: 'keeper' },
  { username: 'dokterhewan', fullName: 'Dokter Hewan', role: 'dokter_hewan' }
];

async function main() {
  const password = process.env.SEED_INITIAL_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set SEED_INITIAL_PASSWORD (minimal 12 karakter) untuk membuat akun awal.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  for (const user of initialUsers) {
    const email = `${user.username}@users.jagatsatwa.local`;
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: user.username }, { email }] },
      select: { id: true }
    });
    if (existing) {
      console.log(`Skipped existing account: ${user.username}`);
      continue;
    }

    await prisma.user.create({
      data: { ...user, email, passwordHash, isActive: true }
    });
    console.log(`Created account: ${user.username} (${user.role})`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
