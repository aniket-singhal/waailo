/**
 * Idempotent seed: global reference data (roles, statutory rates, default templates)
 * plus a demo company with an owner for local development.
 *
 * Run with: npm run seed
 */
import { PrismaClient, RoleName, NotificationChannel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedRoles() {
  const roles: RoleName[] = [
    RoleName.OWNER,
    RoleName.HR_ADMIN,
    RoleName.MANAGER,
    RoleName.EMPLOYEE,
  ];
  for (const name of roles) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Seeded ${roles.length} roles`);
}

async function seedStatutoryRates() {
  const effectiveFrom = new Date('2024-04-01');
  const rates = [
    {
      code: 'EPF',
      description: 'Employees Provident Fund (employee 12% of capped basic)',
      config: { employeeRate: 0.12, employerRate: 0.12, wageCeiling: 1500000 },
    },
    {
      code: 'ESI',
      description: 'Employees State Insurance (applies under wage ceiling)',
      config: { employeeRate: 0.0075, employerRate: 0.0325, wageCeilingMonthly: 2100000 },
    },
    {
      code: 'PT',
      description: 'Professional Tax (Karnataka default slab)',
      config: { state: 'KA', slabs: [{ upto: 2500000, tax: 0 }, { upto: null, tax: 20000 }] },
    },
    {
      code: 'TDS',
      description: 'Income Tax TDS — simplified new-regime estimate (paise, annual taxable slabs)',
      config: {
        standardDeduction: 7_500_000, // ₹75,000
        rebateLimitTaxable: 70_000_000, // taxable ≤ ₹7,00,000 → nil
        cessRate: 0.04,
        slabs: [
          { upto: 30_000_000, rate: 0 }, // up to ₹3,00,000
          { upto: 70_000_000, rate: 0.05 }, // ₹3–7L
          { upto: 100_000_000, rate: 0.1 }, // ₹7–10L
          { upto: 120_000_000, rate: 0.15 }, // ₹10–12L
          { upto: 150_000_000, rate: 0.2 }, // ₹12–15L
          { upto: null, rate: 0.3 }, // above ₹15L
        ],
      },
    },
  ];
  for (const r of rates) {
    const existing = await prisma.statutoryRate.findFirst({
      where: { country: 'IN', code: r.code, effectiveFrom },
    });
    if (!existing) {
      await prisma.statutoryRate.create({ data: { country: 'IN', effectiveFrom, ...r } });
    }
  }
  console.log(`Seeded ${rates.length} statutory rates`);
}

async function seedTemplates() {
  const templates = [
    {
      eventKey: 'EmployeeInvited',
      channel: NotificationChannel.EMAIL,
      subject: 'You are invited to {{companyName}} on Waailo HR',
      body: 'Hi {{firstName}}, accept your invite: {{inviteUrl}}',
    },
    {
      eventKey: 'LeaveDecided',
      channel: NotificationChannel.EMAIL,
      subject: 'Your leave request was {{decision}}',
      body: 'Hi {{firstName}}, your leave from {{startDate}} to {{endDate}} was {{decision}}.',
    },
  ];
  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: {
        companyId_eventKey_channel_locale: {
          companyId: null as unknown as string,
          eventKey: t.eventKey,
          channel: t.channel,
          locale: 'en',
        },
      },
      update: {},
      create: { companyId: null, locale: 'en', ...t },
    });
  }
  console.log(`Seeded ${templates.length} default notification templates`);
}

async function seedDemoCompany() {
  const slug = 'demo-co';
  const existing = await prisma.company.findUnique({ where: { slug } });
  if (existing) {
    console.log('Demo company already exists, skipping');
    return;
  }
  const company = await prisma.company.create({
    data: { name: 'Demo Co', slug, country: 'IN', currency: 'INR', status: 'ACTIVE' },
  });
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.OWNER } });
  const passwordHash = await bcrypt.hash('Password123!', 10);
  await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'owner@demo.co',
      passwordHash,
      status: 'ACTIVE',
      roles: { create: [{ roleId: ownerRole.id }] },
    },
  });
  console.log('Seeded demo company (owner@demo.co / Password123!)');
}

async function main() {
  await seedRoles();
  await seedStatutoryRates();
  await seedTemplates();
  await seedDemoCompany();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
