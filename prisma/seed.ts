import { encrypt } from '@/lib/encryption';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { auth } from '../src/lib/auth/auth';
import prisma from '../src/lib/prisma';

dotenv.config();

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

  await prisma.$transaction(async (tx) => {
    console.log('Starting transaction for WABA and messaging data...');
    // 2. Create WABA (WhatsApp Business Account)
    const waba = await tx.whatsappBusinessAccount.upsert({
      where: { wabaId: '123456789012345' },
      update: {},
      create: {
        wabaId: '123456789012345',
        businessName: 'Piowsee Salon',
        systemUserToken: encrypt('EAAG...fake_token...'),
        status: 'active',
        userId: user.id,
      },
    });

    console.log('WABA created:', waba.businessName);

    // 3 Create Bot Webhook
    let webhook = await tx.botWebhook.findFirst({
      where: { name: 'Seed Webhook', userId: user.id },
    });

    if (!webhook) {
      webhook = await tx.botWebhook.create({
        data: {
          name: 'Seed Webhook',
          webhookUrl: 'https://example.com/webhook',
          passphrase: 'secret-passphrase',
          isActive: true,
          userId: user.id,
        },
      });
    }

    console.log('Bot Webhook created:', webhook.name);

    // 4. Create Phone Number
    const phoneNumber = await tx.phoneNumber.upsert({
      where: { phoneNumberId: '979032335300118' },
      update: {},
      create: {
        phoneNumberId: '979032335300118',
        displayPhoneNumber: '123456789',
        verifiedName: 'Piowsee Support',
        wabaId: waba.id,
        botWebhookId: webhook.id,
      },
    });

    console.log('Phone Number created:', phoneNumber.displayPhoneNumber);

    // 5. Create Business Profile
    await tx.businessProfile.upsert({
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

    // 6. Create Conversation
    const conversation = await tx.conversation.upsert({
      where: {
        unique_conversation: {
          phoneNumberId: phoneNumber.id,
          customerPhone: '628123456789',
        },
      },
      update: {},
      create: {
        customerPhone: '628123456789',
        customerName: 'Budi Santoso',
        phoneNumberId: phoneNumber.id,
        lastMessageAt: new Date(),
      },
    });

    console.log('Conversation created for:', conversation.customerName);

    // 7. Create Messages
    await tx.message.createMany({
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

    // 8. Write the final IDs to tests/seed-data.ts for use in repository tests
    const seedOutputPath = path.join(__dirname, '../tests/seed-data.ts');
    const seedOutputContent = `// This file is auto-generated by prisma/seed.ts. Do not edit manually.
export const SEED_DATA = {
  USER_EMAIL: '${adminEmail}', // Admin email
  REGULAR_USER_EMAIL: '${regularEmail}', // Regular user email
  WABA_META_ID: '${waba.wabaId}',
  PHONE_META_ID: '${phoneNumber.phoneNumberId}',
  CUSTOMER_PHONE: '${conversation.customerPhone}',
  WEBHOOK_NAME: '${webhook.name}',
};
`;

    fs.writeFileSync(seedOutputPath, seedOutputContent);
    console.log('Seed data exported to tests/seed-data.ts');
  });

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
