import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHANNEL_ID = 'gentle-reminders';
const IDS_KEY = '@solace_reminder_ids';
const ON_KEY = '@solace_reminders_on';
const TIMES_KEY = '@solace_reminder_times';

/** Times the user can change from the You page. */
export const DEFAULT_REMINDER_TIMES = {
  morning: { hour: 9, minute: 0 },
  afternoon: { hour: 15, minute: 0 },
  evening: { hour: 21, minute: 30 },
};

/**
 * Small local reminders, offered at three soft points in the day.
 * Each one opens the screen where it makes sense to land.
 */
export const REMINDERS = [
  {
    id: 'morning',
    hour: 9,
    minute: 0,
    screen: 'home',
    title: 'A quiet minute for you',
    body: 'How is your heart this morning? One honest tap is enough.',
  },
  {
    id: 'afternoon',
    hour: 15,
    minute: 0,
    screen: 'breathing',
    title: 'Two minutes to soften the day',
    body: 'Put the rest down for a moment. Breathe with me.',
  },
  {
    id: 'evening',
    hour: 21,
    minute: 30,
    screen: 'home',
    title: 'Before the day closes',
    body: 'Name how it felt, then let it be. You did enough today.',
  },
];

export const remindersSupported = Platform.OS !== 'web';

function getNotifications() {
  if (!remindersSupported) return null;
  try {
    // Loaded only on native, so the web preview never touches the native module.
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
}

let handlerConfigured = false;

export function configureNotifications() {
  const Notifications = getNotifications();
  if (!Notifications || handlerConfigured) return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(Notifications) {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Gentle reminders',
      description: 'Soft check-ins through the day',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 80],
      lightColor: '#B0664A',
      sound: null,
    });
  } catch (e) {}
}

async function cancelStored(Notifications) {
  try {
    const raw = await AsyncStorage.getItem(IDS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    await Promise.all(
      (Array.isArray(ids) ? ids : []).map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
      )
    );
  } catch (e) {}
}

export async function isRemindersEnabled() {
  try {
    return (await AsyncStorage.getItem(ON_KEY)) === '1';
  } catch (e) {
    return false;
  }
}

function cleanTime(value, fallback) {
  const hour = Number(value?.hour);
  const minute = Number(value?.minute);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return fallback;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return fallback;
  return { hour: Math.floor(hour), minute: Math.floor(minute) };
}

/** The user's own reminder times, falling back to the gentle defaults. */
export async function getReminderTimes() {
  let saved = {};
  try {
    const raw = await AsyncStorage.getItem(TIMES_KEY);
    saved = raw ? JSON.parse(raw) : {};
  } catch (e) {}
  return {
    morning: cleanTime(saved?.morning, DEFAULT_REMINDER_TIMES.morning),
    afternoon: cleanTime(saved?.afternoon, DEFAULT_REMINDER_TIMES.afternoon),
    evening: cleanTime(saved?.evening, DEFAULT_REMINDER_TIMES.evening),
  };
}

export async function saveReminderTimes(times) {
  const clean = {
    morning: cleanTime(times?.morning, DEFAULT_REMINDER_TIMES.morning),
    afternoon: cleanTime(times?.afternoon, DEFAULT_REMINDER_TIMES.afternoon),
    evening: cleanTime(times?.evening, DEFAULT_REMINDER_TIMES.evening),
  };
  try {
    await AsyncStorage.setItem(TIMES_KEY, JSON.stringify(clean));
  } catch (e) {}
  return clean;
}

export async function enableReminders(times) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return { supported: false, granted: false };
  }

  configureNotifications();
  await ensureChannel(Notifications);

  let status = (await Notifications.getPermissionsAsync()).status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    return { supported: true, granted: false };
  }

  const schedule = times ? await saveReminderTimes(times) : await getReminderTimes();
  await cancelStored(Notifications);

  const ids = [];
  for (const reminder of REMINDERS) {
    const time = schedule[reminder.id] || DEFAULT_REMINDER_TIMES[reminder.id];
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          data: { screen: reminder.screen, reminder: reminder.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
          channelId: CHANNEL_ID,
        },
      });
      ids.push(id);
    } catch (e) {}
  }

  try {
    await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
    await AsyncStorage.setItem(ON_KEY, '1');
  } catch (e) {}

  return { supported: true, granted: true, count: ids.length };
}

export async function disableReminders() {
  const Notifications = getNotifications();
  if (Notifications) {
    await cancelStored(Notifications);
  }
  try {
    await AsyncStorage.removeItem(IDS_KEY);
    await AsyncStorage.setItem(ON_KEY, '0');
  } catch (e) {}
  return { supported: remindersSupported };
}

export async function getTestReminderDelay() {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  configureNotifications();
  await ensureChannel(Notifications);
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Solace is here',
        body: 'This is how a gentle reminder will look. Tap it to come back.',
        data: { screen: 'home', reminder: 'test' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: CHANNEL_ID,
      },
    });
    return id;
  } catch (e) {
    return null;
  }
}

/** Returns a subscription with .remove(), or null when unsupported. */
export function subscribeToNotificationTaps(handler) {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  configureNotifications();

  try {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response?.notification?.request?.content?.data?.screen;
      if (screen === 'home' || screen === 'breathing' || screen === 'chat') {
        handler(screen);
      }
    });
  } catch (e) {
    return null;
  }
}

/** Screen requested by the notification that launched the app, if any. */
export async function getInitialNotificationScreen() {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  configureNotifications();

  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    const screen = response?.notification?.request?.content?.data?.screen;
    if (response && Notifications.clearLastNotificationResponseAsync) {
      await Notifications.clearLastNotificationResponseAsync();
    }
    return screen === 'home' || screen === 'breathing' || screen === 'chat' ? screen : null;
  } catch (e) {
    return null;
  }
}
