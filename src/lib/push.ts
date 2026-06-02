/**
 * Unified push sender.
 *
 * Sends a notification to one or more users across BOTH delivery channels:
 *   - native (FCM/APNs) via firebase-admin → device_push_tokens
 *   - web push (VAPID) via web-push → push_subscriptions
 *
 * Stale tokens / subscriptions are auto-pruned.
 *
 * Use from server-side code only (API routes, server actions, scheduled
 * functions). Requires SUPABASE_SERVICE_ROLE_KEY,
 * FIREBASE_SERVICE_ACCOUNT_JSON, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { getFirebaseMessaging } from './firebase-admin';

export interface PushPayload {
  title: string;
  body: string;
  /** Deep-link path the client should navigate to on tap. e.g. "/messages/abc". */
  url?: string;
  /** Arbitrary extra data delivered to the client. */
  data?: Record<string, string>;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Send a push to a single user across every device they've registered.
 * Resolves with the number of successful deliveries.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  return sendPushToUsers([userId], payload);
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  const supabase = adminClient();
  let sent = 0, failed = 0;

  // 1. Native (FCM) -----------------------------------------------------
  const { data: tokens } = await supabase
    .from('device_push_tokens')
    .select('token')
    .in('user_id', userIds);

  if (tokens && tokens.length > 0) {
    try {
      const messaging = getFirebaseMessaging();
      const tokenList = tokens.map((t) => t.token);
      const data: Record<string, string> = { ...(payload.data || {}) };
      if (payload.url) data.url = payload.url;

      const resp = await messaging.sendEachForMulticast({
        tokens: tokenList,
        notification: { title: payload.title, body: payload.body },
        data,
        // iOS/Android per-platform tuning
        apns: { payload: { aps: { sound: 'default' } } },
        android: { priority: 'high', notification: { sound: 'default' } },
      });

      const stale: string[] = [];
      resp.responses.forEach((r, i) => {
        if (r.success) sent++;
        else {
          failed++;
          const code = r.error?.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-argument'
          ) {
            stale.push(tokenList[i]);
          }
        }
      });
      if (stale.length > 0) {
        await supabase.from('device_push_tokens').delete().in('token', stale);
      }
    } catch (err) {
      console.error('FCM send error:', err);
      failed += tokens.length;
    }
  }

  // 2. Web push (VAPID) -------------------------------------------------
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .in('user_id', userIds);

  if (subs && subs.length > 0) {
    try {
      webpush.setVapidDetails(
        'mailto:' + (process.env.RESEND_FROM_EMAIL || 'hello@example.com'),
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      );

      const stale: string[] = [];
      await Promise.allSettled(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
              JSON.stringify({
                title: payload.title,
                body: payload.body,
                url: payload.url || '/',
                ...(payload.data || {}),
              })
            );
            sent++;
          } catch (err: unknown) {
            failed++;
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 410 || status === 404) stale.push(sub.endpoint);
          }
        })
      );
      if (stale.length > 0) {
        await supabase.from('push_subscriptions').delete().in('endpoint', stale);
      }
    } catch (err) {
      console.error('Web push send error:', err);
    }
  }

  return { sent, failed };
}
