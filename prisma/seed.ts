import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

import { auth } from '../src/lib/auth/auth';
import prisma from '../src/lib/prisma';

dotenv.config();

const PREFIX = 'enc:';

/**
 * Simplified encryption helper for seed to avoid alias/import issues
 */
function encrypt(text: string): string {
  const key = process.env.WABA_TOKEN_ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error(
      'WABA_TOKEN_ENCRYPTION_KEY must be exactly 32 characters in .env',
    );
  }
  const encrypted = CryptoJS.AES.encrypt(text, key).toString();
  return `${PREFIX}${encrypted}`;
}

async function main() {
  console.log('Seed started...');

  // 1. Create Admin User via Better Auth API
  const adminEmail = 'admin@piowsee.com';
  const password = 'password123';

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    console.log('Creating new admin user via Better Auth...');
    const result = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password,
        name: 'Admin Piowsee',
      },
    });

    if (!result || !result.user) {
      throw new Error('Failed to create admin user via Better Auth API');
    }

    adminUser = result.user as unknown as typeof adminUser;

    // Explicitly set the admin role (Better Auth signUp doesn't allow setting role directly for security)
    await prisma.user.update({
      where: { id: adminUser!.id },
      data: { role: 'admin' },
    });

    console.log('Admin user created and role assigned:', adminUser!.email);
  } else {
    console.log('Admin user already exists:', adminUser.email);
  }

  // 1.1 Create Regular User via Better Auth API
  const regularEmail = 'user@piowsee.com';
  let regularUser = await prisma.user.findUnique({
    where: { email: regularEmail },
  });

  if (!regularUser) {
    console.log('Creating new regular user via Better Auth...');
    const result = await auth.api.signUpEmail({
      body: {
        email: regularEmail,
        password,
        name: 'Regular User',
      },
    });

    if (!result || !result.user) {
      throw new Error('Failed to create regular user via Better Auth API');
    }

    regularUser = result.user as unknown as typeof regularUser;
    console.log('Regular user created:', regularEmail);
  } else {
    console.log('Regular user already exists:', regularEmail);
  }

  const user = regularUser; // Main user for subsequent seeding
  if (!user) throw new Error('Regular user not found after creation/check');

  // 2. Create WABA (WhatsApp Business Account)
  const waba = await prisma.whatsappBusinessAccount.upsert({
    where: { wabaId: '123456789012345' },
    update: {},
    create: {
      id: 'waba_seed_123',
      wabaId: '123456789012345',
      businessName: 'Piowsee Salon',
      systemUserToken: encrypt('EAAG...fake_token...'), // Encrypted for security
      webhookVerifyToken: 'verify_token_123',
      status: 'active',
      userId: user.id,
    },
  });

  console.log('WABA created:', waba.businessName);

  // 3. Create Phone Number
  const phoneNumber = await prisma.phoneNumber.upsert({
    where: { phoneNumberId: '9876543210' },
    update: {},
    create: {
      id: 'pn_seed_123',
      phoneNumberId: '9876543210',
      displayPhoneNumber: '123456789',
      verifiedName: 'Piowsee Support',
      wabaId: waba.id,
    },
  });

  console.log('Phone Number created:', phoneNumber.displayPhoneNumber);

  // 4. Create Business Profile
  await prisma.businessProfile.upsert({
    where: { phoneNumberId: phoneNumber.id },
    update: {},
    create: {
      phoneNumberId: phoneNumber.id,
      address: 'Piowsee Street 123, Indonesia',
      description: 'Your premium beauty salon.',
      vertical: 'BEAUTY',
      email: 'support@piowsee.com',
      websites: ['https://piowsee.com'],
    },
  });

  // 5. Create Conversation
  const conversation = await prisma.conversation.upsert({
    where: {
      unique_conversation: {
        phoneNumberId: phoneNumber.id,
        customerPhone: '628123456789',
      },
    },
    update: {},
    create: {
      id: 'conv_seed_123',
      customerPhone: '628123456789',
      customerName: 'Budi Santoso',
      phoneNumberId: phoneNumber.id,
      lastMessageAt: new Date(),
    },
  });

  console.log('Conversation created for:', conversation.customerName);

  // 6. Create Messages
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        direction: 'incoming',
        source: 'customer',
        type: 'text',
        content: 'Hi! Is the salon open today?',
        status: 'read',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      },
      {
        conversationId: conversation.id,
        direction: 'outgoing',
        source: 'admin',
        type: 'text',
        content: 'Hello Budi! Yes, we are open until 8 PM.',
        status: 'delivered',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      },
    ],
  });

  console.log('Messages seeded.');
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
