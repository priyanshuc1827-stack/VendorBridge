import { run } from '../config/db';

/**
 * Record system operations within the activity_logs table.
 */
export const logActivity = async (
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  description: string
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    await run(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId, description, timestamp]
    );
  } catch (err: any) {
    console.error(`Activity logging failed for action [${action}]:`, err.message);
  }
};

/**
 * Push an alert notification to the targeted user inside the notifications table.
 */
export const createNotification = async (
  userId: number,
  title: string,
  message: string
): Promise<void> => {
  try {
    await run(
      `INSERT INTO notifications (user_id, title, message, is_read) 
       VALUES (?, ?, ?, 0)`,
      [userId, title, message]
    );
  } catch (err: any) {
    console.error(`Notification creation failed for user [${userId}]:`, err.message);
  }
};
