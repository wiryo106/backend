import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('===================================');
  console.log('🛠️  UTILITY PEMBUATAN AKUN BARU 🛠️');
  console.log('===================================');

  try {
    const name = await question('Nama Lengkap: ');
    if (!name) throw new Error('Nama tidak boleh kosong');

    const email = await question('Email: ');
    if (!email || !email.includes('@')) throw new Error('Email tidak valid');

    const password = await question('Password: ');
    if (!password || password.length < 6) throw new Error('Password minimal 6 karakter');

    console.log('\nPilihan Role:');
    console.log('1. ADMIN');
    console.log('2. TECHNICIAN');
    console.log('3. CUSTOMER');
    const roleInput = await question('Pilih Role (1/2/3) [default: 3]: ');
    
    let role = 'CUSTOMER';
    if (roleInput === '1') role = 'ADMIN';
    else if (roleInput === '2') role = 'TECHNICIAN';
    else if (roleInput === '3') role = 'CUSTOMER';

    const phone = await question('\nNomor Telepon (opsional): ');

    // Cek apakah email sudah ada
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error(`Email ${email} sudah terdaftar sebelumnya!`);
    }

    console.log('\nMemproses pembuatan akun...');
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phone: phone || null,
      },
    });

    console.log('===================================');
    console.log('✅ Akun berhasil dibuat!');
    console.log('===================================');
    console.log(`Nama    : ${user.name}`);
    console.log(`Email   : ${user.email}`);
    console.log(`Role    : ${user.role}`);
    console.log(`Telepon : ${user.phone || '-'}`);
    console.log('===================================');

  } catch (error) {
    console.log('\n❌ GAGAL:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
