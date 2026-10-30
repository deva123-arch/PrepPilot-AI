/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Server-side Administrative Tooling: Create or Promote Platform Administrator
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <email> <password> [fullName]
 *
 * Example:
 *   npx tsx scripts/create-admin.ts lead.admin@preppilot.com SecurePass123! "Lead Administrator"
 *
 * Environment variables alternative:
 *   ADMIN_EMAIL=admin@preppilot.com ADMIN_PASSWORD=SecurePass123! npx tsx scripts/create-admin.ts
 */

import {
  initAuthDatabase,
  findUserByEmail,
  createAdminUser,
  validateEmail,
  validatePasswordStrength,
  logAuditEvent,
} from '../server/auth-db.js';

async function main() {
  console.log('--- PrepPilot AI Administrative Account Creator ---');

  initAuthDatabase();

  const emailArg = process.argv[2] || process.env.ADMIN_EMAIL;
  const passwordArg = process.argv[3] || process.env.ADMIN_PASSWORD;
  const nameArg = process.argv[4] || process.env.ADMIN_NAME || 'Platform Administrator';

  if (!emailArg || !passwordArg) {
    console.error('Error: Administrator email and password are required.');
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password> [fullName]');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const password = passwordArg;
  const name = nameArg.trim();

  if (!validateEmail(email)) {
    console.error(`Error: "${email}" is not a valid email address.`);
    process.exit(1);
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    console.error(`Error: Password strength check failed: ${strength.reason}`);
    process.exit(1);
  }

  const existing = findUserByEmail(email);
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`User "${email}" is already an active platform administrator (ID: ${existing.id}).`);
      process.exit(0);
    }

    // Promote existing user to administrator
    existing.role = 'admin';
    existing.status = 'active';

    logAuditEvent({
      actorId: 'admin_cli',
      actorEmail: 'cli@preppilot.internal',
      action: 'ADMIN_PROMOTED_CLI',
      targetId: existing.id,
      details: `Existing student user ${email} promoted to administrator via CLI`,
      ip: '127.0.0.1',
    });

    console.log(`Successfully elevated existing user "${email}" (ID: ${existing.id}) to Administrator.`);
    process.exit(0);
  }

  try {
    const adminUser = await createAdminUser({
      name,
      email,
      password,
    });

    console.log('Administrator account created successfully:');
    console.log(`  ID: ${adminUser.id}`);
    console.log(`  Name: ${adminUser.name}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Role: ${adminUser.role}`);
    console.log(`  Status: ${adminUser.status}`);
    console.log('You can now log in via the PrepPilot Admin Portal.');
    process.exit(0);
  } catch (err: any) {
    console.error(`Error creating administrator account: ${err.message}`);
    process.exit(1);
  }
}

main();
