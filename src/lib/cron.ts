import cron from 'node-cron';
import { pollAlarms, cleanupOldAlarms } from './alarms';
import { lockDueSlots, resolveDueSlots, generateDailySlots, getIsraelDateString } from './slots';

let started = false;

export function startCronJobs(): void {
  if (started) return;
  started = true;

  // Generate today's slots on startup (in case they don't exist yet)
  const today = getIsraelDateString();
  generateDailySlots(today);
  console.log(`[cron] Generated slots for ${today}`);

  // Poll Tzeva Adom every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const count = await pollAlarms();
      if (count > 0) console.log(`[cron] poll-alarms: ${count} new alarm entries`);
    } catch (err) {
      console.error('[cron] poll-alarms error:', err);
    }
  });

  // Lock and resolve slots every minute
  cron.schedule('* * * * *', () => {
    try {
      lockDueSlots();
      const resolved = resolveDueSlots();
      if (resolved > 0) console.log(`[cron] resolved ${resolved} slot groups`);
    } catch (err) {
      console.error('[cron] lock-resolve error:', err);
    }
  });

  // Generate tomorrow's slots at 00:05 IST (22:05 UTC in standard time)
  cron.schedule('5 22 * * *', () => {
    try {
      const tomorrow = getIsraelDateString();
      // Add one day
      const d = new Date(tomorrow + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      const tomorrowStr = d.toISOString().slice(0, 10);
      generateDailySlots(tomorrowStr);
      console.log(`[cron] Generated slots for ${tomorrowStr}`);
    } catch (err) {
      console.error('[cron] generate-slots error:', err);
    }
  });

  // Cleanup old alarms daily at 03:00 UTC
  cron.schedule('0 3 * * *', () => {
    try {
      const deleted = cleanupOldAlarms(30);
      console.log(`[cron] cleanup: deleted ${deleted} old alarm log entries`);
    } catch (err) {
      console.error('[cron] cleanup error:', err);
    }
  });

  console.log('[cron] All cron jobs started');
}
