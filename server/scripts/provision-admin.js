#!/usr/bin/env node

/**
 * One-time Local Admin Provisioning Script
 *
 * Targets: admin@example.com
 *
 * Safety Guarantees:
 * - Uses existing local server configuration and Supabase Admin client.
 * - Verifies that admin@example.com exists in auth.users and public.users with role=admin BEFORE making changes.
 * - Prompts interactively for a password with masked terminal input (no plaintext echo).
 * - Never prints or exposes passwords, SUPABASE_URL, SUPABASE_SECRET_KEY, or tokens.
 * - Does not create new or duplicate auth or database rows.
 * - Uses supabase.auth.admin.updateUserById() to update password and set email_confirm=true.
 * - Verifies post-condition: public.users still has role=admin and is_active=true.
 */

import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Dynamically import the existing configured Supabase client
const { supabase } = await import('../src/config/supabase.js');

const TARGET_EMAIL = 'admin@example.com';

function promptPassword(promptText) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(promptText);

    if (stdin.isTTY) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      let password = '';

      const onData = (char) => {
        const str = char.toString();
        switch (str) {
          case '\n':
          case '\r':
          case '\u0004': // End of transmission
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(password);
            break;
          case '\u0003': // Ctrl+C
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            process.exit(1);
            break;
          case '\u0008': // Backspace
          case '\x7f':
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            password += str;
            process.stdout.write('*');
            break;
        }
      };

      stdin.on('data', onData);
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function provisionAdmin() {
  console.log('====================================================');
  console.log('       SIH26034 Admin Account Provisioning          ');
  console.log('====================================================\n');

  console.log(`[VERIFY] Checking pre-conditions for target: ${TARGET_EMAIL}...`);

  // 1. Verify existence in auth.users
  const { data: authUsersData, error: authListErr } = await supabase.auth.admin.listUsers();
  if (authListErr) {
    throw new Error(`Failed to query Supabase Auth users: ${authListErr.message}`);
  }

  const authUser = authUsersData.users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());
  if (!authUser) {
    throw new Error(`Target user ${TARGET_EMAIL} was not found in Supabase Auth (auth.users).`);
  }

  // 2. Verify existence in public.users with the exact same UUID
  const { data: dbUser, error: dbErr } = await supabase
    .from('users')
    .select('id, name, email, role, is_active')
    .eq('id', authUser.id)
    .single();

  if (dbErr || !dbUser) {
    throw new Error(`Matching database record for ${TARGET_EMAIL} (ID: ${authUser.id}) was not found in public.users.`);
  }

  // 3. Verify that role is admin
  if (dbUser.role !== 'admin') {
    throw new Error(`User ${TARGET_EMAIL} does not have admin role in public.users (current role: ${dbUser.role}).`);
  }

  console.log('[VERIFY] Pre-conditions verified successfully:');
  console.log(`  - Auth UID:       ${authUser.id}`);
  console.log(`  - Database Name:  ${dbUser.name}`);
  console.log(`  - Database Email: ${dbUser.email}`);
  console.log(`  - Database Role:  ${dbUser.role}`);
  console.log(`  - Active Status:  ${dbUser.is_active}\n`);

  // 4. Interactive masked password prompt
  console.log('Enter a new password for this Admin account (min 6 characters):');
  const password = await promptPassword('New Password: ');

  if (!password || password.length < 6) {
    console.error('\n[ERROR] Password must be at least 6 characters long. Aborting.');
    process.exit(1);
  }

  const confirmPassword = await promptPassword('Confirm Password: ');

  if (password !== confirmPassword) {
    console.error('\n[ERROR] Passwords do not match. Aborting.');
    process.exit(1);
  }

  console.log('\n[UPDATING] Updating credentials via Supabase Admin SDK...');

  // 5. Update password and confirm email using Admin SDK
  const { data: updatedAuthUser, error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
    password: password,
    email_confirm: true,
  });

  if (updateErr) {
    throw new Error(`Failed to update password in Supabase Auth: ${updateErr.message}`);
  }

  // Ensure user is marked active in public.users if it wasn't already
  if (!dbUser.is_active) {
    await supabase.from('users').update({ is_active: true }).eq('id', authUser.id);
  }

  // 6. Post-verification: Confirm role and active status remain intact
  const { data: finalDbUser, error: finalDbErr } = await supabase
    .from('users')
    .select('id, name, email, role, is_active')
    .eq('id', authUser.id)
    .single();

  if (finalDbErr || !finalDbUser) {
    throw new Error('Could not re-verify database record after update.');
  }

  if (finalDbUser.role !== 'admin' || !finalDbUser.is_active) {
    throw new Error(`Post-verification failed: role=${finalDbUser.role}, is_active=${finalDbUser.is_active}`);
  }

  console.log('\n====================================================');
  console.log('           ADMIN PROVISIONING COMPLETE              ');
  console.log('====================================================');
  console.log(`Account Email:   ${finalDbUser.email}`);
  console.log(`Account Role:    ${finalDbUser.role}`);
  console.log(`Account Status:  ${finalDbUser.is_active ? 'Active' : 'Inactive'}`);
  console.log(`Email Confirmed: Yes`);
  console.log('\nYou can now log in at:');
  console.log('  http://localhost:5173/login');
  console.log('with your email and the password you just configured.');
  console.log('====================================================');
}

provisionAdmin().catch((err) => {
  console.error(`\n[FATAL ERROR] Provisioning failed: ${err.message}`);
  process.exit(1);
});
