// Email Service for IvyLevel Coach Training Platform
// This is a mock implementation that logs emails to console
// In production, integrate with SendGrid, AWS SES, or similar

class EmailService {
  constructor() {
    this.emailQueue = [];
    this.templates = {
      welcome: {
        subject: 'Welcome to IvyLevel Coach Training! 🎉',
        body: (data) => `
Dear ${data.coachName},

Welcome to the IvyLevel Coach Training Program! We're thrilled to have you join our community of dedicated coaches.

Your personalized learning journey has been created based on your:
- Background: ${data.background}
- Experience: ${data.experience} years
- Strengths: ${data.strengths?.join(', ')}

What's Next?
1. Complete your welcome experience
2. Watch your first training video
3. Connect with your mentor: ${data.mentorName || 'To be assigned'}

Your login credentials:
Email: ${data.email}
Temporary Password: ${data.tempPassword || 'Please use password reset link'}

Get Started: ${data.loginUrl || 'http://localhost:3000'}

Important: Please change your password after your first login.

Best regards,
The IvyLevel Team
        `
      },
      
      provisioningComplete: {
        subject: 'New Coach Provisioned - Action Required',
        body: (data) => `
Admin Alert: New Coach Provisioned

Coach Details:
- Name: ${data.coachName}
- Email: ${data.email}
- Provisioned by: ${data.adminName}
- Date: ${new Date().toLocaleDateString()}

Readiness Score: ${data.readinessScore}%
Status: ${data.status}

Recommended Actions:
${data.recommendations?.map(r => `- ${r}`).join('\n') || '- No specific recommendations'}

View full profile: ${data.profileUrl || 'Login to admin dashboard'}
        `
      },
      
      milestoneAchieved: {
        subject: '🏆 Milestone Achieved!',
        body: (data) => `
Congratulations ${data.coachName}!

You've achieved a new milestone: ${data.milestoneName}

Points Earned: +${data.points}
Total Points: ${data.totalPoints}

Keep up the great work! Your next milestone is: ${data.nextMilestone}

View your progress: ${data.dashboardUrl || 'http://localhost:3000'}
        `
      },
      
      weeklyProgress: {
        subject: 'Your Weekly Progress Summary',
        body: (data) => `
Hi ${data.coachName},

Here's your progress for the week of ${data.weekStart} - ${data.weekEnd}:

📊 Activity Summary:
- Videos Watched: ${data.videosWatched}
- Practice Sessions: ${data.practiceSessions}
- Total Time: ${data.totalTime} minutes
- Points Earned: ${data.weeklyPoints}

📈 Progress:
- Overall Progress: ${data.overallProgress}%
- Current Module: ${data.currentModule}
- Readiness Score: ${data.readinessScore}%

${data.weeklyInsight ? `💡 Insight: ${data.weeklyInsight}` : ''}

Keep learning and growing!
The IvyLevel Team
        `
      },
      
      lowEngagement: {
        subject: 'We Miss You at IvyLevel! 👋',
        body: (data) => `
Hi ${data.coachName},

We noticed you haven't logged in for ${data.daysSinceLogin} days. 

Your learning journey is waiting for you! Here's what you can do today:
- Watch the next video in your learning path
- Complete a practice coaching session
- Connect with your mentor

Need help? Reply to this email and we'll assist you.

Resume your journey: ${data.loginUrl || 'http://localhost:3000'}

Best,
The IvyLevel Team
        `
      }
    };
  }

  // Send email (mock implementation)
  async sendEmail(to, templateName, data) {
    try {
      const template = this.templates[templateName];
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }

      const email = {
        to,
        from: 'noreply@ivylevel.com',
        subject: template.subject,
        body: template.body(data),
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      // In production, integrate with email service provider
      // For now, log to console
      console.log('📧 Email Sent:', email);
      
      // Store in queue for tracking
      this.emailQueue.push(email);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true, messageId: Date.now().toString() };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send bulk emails
  async sendBulkEmails(recipients, templateName, commonData = {}) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendEmail(
        recipient.email,
        templateName,
        { ...commonData, ...recipient }
      );
      results.push({ ...result, email: recipient.email });
    }
    
    return results;
  }

  // Schedule email (mock implementation)
  scheduleEmail(to, templateName, data, sendAt) {
    const scheduledEmail = {
      to,
      templateName,
      data,
      sendAt,
      status: 'scheduled',
      id: Date.now().toString()
    };
    
    console.log('📅 Email Scheduled:', scheduledEmail);
    
    // In production, use job queue like Bull or similar
    const delay = new Date(sendAt) - new Date();
    if (delay > 0) {
      setTimeout(() => {
        this.sendEmail(to, templateName, data);
      }, delay);
    }
    
    return scheduledEmail.id;
  }

  // Get email history
  getEmailHistory(filterBy = {}) {
    let history = [...this.emailQueue];
    
    if (filterBy.to) {
      history = history.filter(email => email.to === filterBy.to);
    }
    
    if (filterBy.dateFrom) {
      history = history.filter(email => 
        new Date(email.timestamp) >= new Date(filterBy.dateFrom)
      );
    }
    
    return history;
  }

  // Email automation triggers
  async triggerWelcomeEmail(coachData) {
    return this.sendEmail(coachData.email, 'welcome', coachData);
  }

  async triggerProvisioningAlert(adminEmail, coachData) {
    return this.sendEmail(adminEmail, 'provisioningComplete', coachData);
  }

  async triggerMilestoneEmail(coachEmail, milestoneData) {
    return this.sendEmail(coachEmail, 'milestoneAchieved', milestoneData);
  }

  async triggerWeeklyProgressEmails() {
    // This would be called by a cron job in production
    console.log('📧 Triggering weekly progress emails...');
    // Implementation would fetch all active coaches and send summaries
  }

  async triggerEngagementEmails() {
    // Check for inactive coaches and send re-engagement emails
    console.log('📧 Checking for inactive coaches...');
    // Implementation would query coaches with no recent activity
  }
}

// Create singleton instance
const emailService = new EmailService();

// Export service
export default emailService;

// Export for use in Firebase Functions or cron jobs
export const {
  sendEmail,
  sendBulkEmails,
  scheduleEmail,
  triggerWelcomeEmail,
  triggerProvisioningAlert,
  triggerMilestoneEmail,
  triggerWeeklyProgressEmails,
  triggerEngagementEmails
} = emailService;