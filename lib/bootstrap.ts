/** Emails allowed to bootstrap the very first admin, from ADMIN_BOOTSTRAP_EMAILS. */
export function bootstrapEmails() {
  return (process.env.ADMIN_BOOTSTRAP_EMAILS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}
