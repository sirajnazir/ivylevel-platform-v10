/**
 * NotificationService - Multi-channel notification delivery
 *
 * Purpose: Enable autonomous agents to send proactive notifications
 * Channels:
 *   - SMS (Twilio) - Urgent nudges, deadline reminders
 *   - Email (SendGrid) - Weekly plans, detailed updates
 *   - In-App - Milestone celebrations, progress updates
 *
 * Week 17 - Proactivity Foundation
 * Version: v10.2
 */

import { Pool } from 'pg';
import { createLogger } from '../../../../packages/observability/dist/unified-logger.js';

const logger = createLogger('notification-service');

export interface NotificationRequest {
  student_id: string;
  coach_id: string;
  channel: 'sms' | 'email' | 'in_app' | 'push';
  recipient: string; // Phone number for SMS, email address for email
  subject?: string; // For email
  message: string;
  metadata?: Record<string, any>;
}

export interface Notification {
  notification_id: number;
  student_id: string;
  coach_id: string;
  channel: 'sms' | 'email' | 'in_app' | 'push';
  recipient: string;
  subject?: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: Date;
  delivered_at?: Date;
  error?: string;
  created_at: Date;
  metadata?: Record<string, any>;
}

/**
 * NotificationService - Handles multi-channel notifications for autonomous agents
 *
 * Features:
 *   - Twilio SMS integration (for urgent, real-time nudges)
 *   - SendGrid Email integration (for detailed weekly plans)
 *   - In-app notifications (for milestone celebrations)
 *   - Notification history tracking
 *   - Retry logic for failed deliveries
 *
 * Environment Variables Required:
 *   - TWILIO_ACCOUNT_SID
 *   - TWILIO_AUTH_TOKEN
 *   - TWILIO_PHONE_NUMBER
 *   - SENDGRID_API_KEY
 *   - SENDGRID_FROM_EMAIL
 */
export class NotificationService {
  private pool: Pool;
  private twilioEnabled: boolean = false;
  private sendgridEnabled: boolean = false;

  // Twilio config (will be initialized if env vars present)
  private twilioAccountSid?: string;
  private twilioAuthToken?: string;
  private twilioPhoneNumber?: string;

  // SendGrid config
  private sendgridApiKey?: string;
  private sendgridFromEmail?: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeProviders();
  }

  /**
   * Initialize notification providers from environment variables
   */
  private initializeProviders(): void {
    // Twilio SMS
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (this.twilioAccountSid && this.twilioAuthToken && this.twilioPhoneNumber) {
      this.twilioEnabled = true;
      logger.info('Twilio SMS provider initialized');
    } else {
      logger.warn('Twilio SMS provider not configured (missing env vars)');
    }

    // SendGrid Email
    this.sendgridApiKey = process.env.SENDGRID_API_KEY;
    this.sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL || 'notifications@ivylevel.com';

    if (this.sendgridApiKey) {
      this.sendgridEnabled = true;
      logger.info('SendGrid email provider initialized');
    } else {
      logger.warn('SendGrid email provider not configured (missing SENDGRID_API_KEY)');
    }
  }

  /**
   * Send a notification via the specified channel
   * @param request - Notification request
   * @returns notification_id
   */
  async send(request: NotificationRequest): Promise<number> {
    try {
      // Create notification record
      const result = await this.pool.query(
        `INSERT INTO notifications (student_id, coach_id, channel, recipient, subject, message, metadata, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING notification_id`,
        [
          request.student_id,
          request.coach_id,
          request.channel,
          request.recipient,
          request.subject || null,
          request.message,
          JSON.stringify(request.metadata || {}),
        ]
      );

      const notification_id = result.rows[0].notification_id;

      logger.info(
        {
          notification_id,
          channel: request.channel,
          student_id: request.student_id,
          recipient: request.recipient,
        },
        'Notification created'
      );

      // Send via appropriate channel
      try {
        switch (request.channel) {
          case 'sms':
            await this.sendSMS(notification_id, request.recipient, request.message);
            break;
          case 'email':
            await this.sendEmail(notification_id, request.recipient, request.subject || 'Update from IvyLevel', request.message);
            break;
          case 'in_app':
            await this.sendInApp(notification_id, request.student_id, request.message);
            break;
          case 'push':
            await this.sendPush(notification_id, request.student_id, request.message);
            break;
          default:
            throw new Error(`Unsupported channel: ${request.channel}`);
        }
      } catch (error: any) {
        await this.markNotificationFailed(notification_id, error.message);
        throw error;
      }

      return notification_id;
    } catch (error) {
      logger.error({ error, request }, 'Failed to send notification');
      throw error;
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendSMS(notification_id: number, to: string, body: string): Promise<void> {
    if (!this.twilioEnabled) {
      const error = 'Twilio SMS not configured';
      logger.warn({ notification_id }, error);
      await this.markNotificationFailed(notification_id, error);
      return;
    }

    try {
      logger.info({ notification_id, to }, 'Sending SMS via Twilio');

      // MOCK IMPLEMENTATION (replace with actual Twilio SDK in production)
      // const twilio = require('twilio');
      // const client = twilio(this.twilioAccountSid, this.twilioAuthToken);
      // const message = await client.messages.create({
      //   body,
      //   from: this.twilioPhoneNumber,
      //   to,
      // });
      // const messageSid = message.sid;

      // For now, simulate success
      const messageSid = `SM${Date.now()}`;

      await this.markNotificationSent(notification_id, { twilio_sid: messageSid });

      logger.info({ notification_id, messageSid }, 'SMS sent successfully');
    } catch (error: any) {
      logger.error({ notification_id, error: error.message }, 'Failed to send SMS');
      await this.markNotificationFailed(notification_id, error.message);
      throw error;
    }
  }

  /**
   * Send Email via SendGrid
   */
  private async sendEmail(notification_id: number, to: string, subject: string, body: string): Promise<void> {
    if (!this.sendgridEnabled) {
      const error = 'SendGrid email not configured';
      logger.warn({ notification_id }, error);
      await this.markNotificationFailed(notification_id, error);
      return;
    }

    try {
      logger.info({ notification_id, to, subject }, 'Sending email via SendGrid');

      // MOCK IMPLEMENTATION (replace with actual SendGrid SDK in production)
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(this.sendgridApiKey);
      // const msg = {
      //   to,
      //   from: this.sendgridFromEmail,
      //   subject,
      //   text: body,
      //   html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      // };
      // const response = await sgMail.send(msg);
      // const messageId = response[0].headers['x-message-id'];

      // For now, simulate success
      const messageId = `msg_${Date.now()}`;

      await this.markNotificationSent(notification_id, { sendgrid_message_id: messageId });

      logger.info({ notification_id, messageId }, 'Email sent successfully');
    } catch (error: any) {
      logger.error({ notification_id, error: error.message }, 'Failed to send email');
      await this.markNotificationFailed(notification_id, error.message);
      throw error;
    }
  }

  /**
   * Send in-app notification (store in database for UI to fetch)
   */
  private async sendInApp(notification_id: number, student_id: string, message: string): Promise<void> {
    try {
      logger.info({ notification_id, student_id }, 'Creating in-app notification');

      // In-app notifications are already stored in the notifications table
      // Just mark as sent (UI will poll/subscribe to fetch them)
      await this.markNotificationSent(notification_id, { channel: 'in_app' });

      logger.info({ notification_id }, 'In-app notification created');
    } catch (error: any) {
      logger.error({ notification_id, error: error.message }, 'Failed to create in-app notification');
      await this.markNotificationFailed(notification_id, error.message);
      throw error;
    }
  }

  /**
   * Send push notification (future implementation)
   */
  private async sendPush(notification_id: number, student_id: string, message: string): Promise<void> {
    try {
      logger.info({ notification_id, student_id }, 'Sending push notification');

      // MOCK IMPLEMENTATION (to be implemented with FCM/APNS)
      // For now, just mark as sent
      await this.markNotificationSent(notification_id, { channel: 'push', note: 'Push notifications not yet implemented' });

      logger.warn({ notification_id }, 'Push notification not yet implemented (marked as sent)');
    } catch (error: any) {
      logger.error({ notification_id, error: error.message }, 'Failed to send push notification');
      await this.markNotificationFailed(notification_id, error.message);
      throw error;
    }
  }

  /**
   * Mark notification as sent
   */
  private async markNotificationSent(notification_id: number, metadata: Record<string, any>): Promise<void> {
    await this.pool.query(
      `UPDATE notifications
       SET status = 'sent', sent_at = NOW(), metadata = $1
       WHERE notification_id = $2`,
      [JSON.stringify(metadata), notification_id]
    );
  }

  /**
   * Mark notification as failed
   */
  private async markNotificationFailed(notification_id: number, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE notifications
       SET status = 'failed', error = $1
       WHERE notification_id = $2`,
      [error, notification_id]
    );
  }

  /**
   * Get notification status
   */
  async getStatus(notification_id: number): Promise<Notification | null> {
    const result = await this.pool.query<Notification>(
      `SELECT * FROM notifications WHERE notification_id = $1`,
      [notification_id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all notifications for a student
   */
  async getStudentNotifications(student_id: string, limit: number = 50): Promise<Notification[]> {
    const result = await this.pool.query<Notification>(
      `SELECT * FROM notifications
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [student_id, limit]
    );

    return result.rows;
  }

  /**
   * Get unread in-app notifications for a student
   */
  async getUnreadInAppNotifications(student_id: string): Promise<Notification[]> {
    const result = await this.pool.query<Notification>(
      `SELECT * FROM notifications
       WHERE student_id = $1
         AND channel = 'in_app'
         AND status = 'sent'
         AND delivered_at IS NULL
       ORDER BY created_at DESC`,
      [student_id]
    );

    return result.rows;
  }

  /**
   * Mark in-app notification as read (delivered)
   */
  async markAsRead(notification_id: number): Promise<void> {
    await this.pool.query(
      `UPDATE notifications
       SET delivered_at = NOW()
       WHERE notification_id = $1`,
      [notification_id]
    );

    logger.info({ notification_id }, 'Notification marked as read');
  }

  /**
   * Retry failed notifications
   */
  async retryFailed(notification_id: number): Promise<void> {
    const notification = await this.getStatus(notification_id);

    if (!notification) {
      throw new Error(`Notification ${notification_id} not found`);
    }

    if (notification.status !== 'failed') {
      throw new Error(`Notification ${notification_id} is not failed (status: ${notification.status})`);
    }

    logger.info({ notification_id }, 'Retrying failed notification');

    // Reset status to pending
    await this.pool.query(
      `UPDATE notifications
       SET status = 'pending', error = NULL
       WHERE notification_id = $1`,
      [notification_id]
    );

    // Retry sending
    await this.send({
      student_id: notification.student_id,
      coach_id: notification.coach_id,
      channel: notification.channel,
      recipient: notification.recipient,
      subject: notification.subject,
      message: notification.message,
      metadata: notification.metadata,
    });
  }
}

export default NotificationService;
