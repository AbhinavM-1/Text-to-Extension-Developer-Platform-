import { Activity } from '../models/Activity.js';

export async function recordActivity({ user, type, title, description = '', metadata = {} }) {
  try {
    if (!user || !type || !title) return null;
    return await Activity.create({
      user,
      type,
      title,
      description,
      metadata,
    });
  } catch (error) {
    console.warn(`Activity logging failed: ${error.message}`);
    return null;
  }
}

export function todayUsage(user) {
  const date = new Date().toISOString().slice(0, 10);
  const usage = user?.generationUsage || {};
  return {
    date,
    count: usage.date === date ? usage.count || 0 : 0,
  };
}
