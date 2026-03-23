export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Dynamic import to avoid edge runtime issues
  const { startCronJobs } = await import('./lib/cron');
  startCronJobs();
}
