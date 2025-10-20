// src/services/emailProvider.js
// Email provider service with fallback for development

class EmailProvider {
  constructor() {
    this.provider = process.env.REACT_APP_EMAIL_PROVIDER || 'console';
    this.sgMail = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.provider === 'sendgrid' && process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sgMail = sgMail;
        this.initialized = true;
        console.log('SendGrid email provider initialized');
        return true;
      } catch (error) {
        console.error('Failed to initialize SendGrid:', error);
        this.provider = 'console';
      }
    }
    
    if (this.provider === 'console') {
      console.log('Using console email provider (development mode)');
      this.initialized = true;
      return true;
    }
    
    return false;
  }

  async sendEmail(emailContent) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.provider === 'sendgrid' && this.sgMail) {
      const msg = {
        to: emailContent.recipients.to,
        cc: emailContent.recipients.cc || [],
        bcc: emailContent.recipients.bcc || [],
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ivylevel.com',
        subject: emailContent.subject,
        html: emailContent.htmlBody,
        text: emailContent.plainTextBody
      };

      try {
        const response = await this.sgMail.send(msg);
        console.log('Email sent successfully via SendGrid');
        return { 
          success: true, 
          provider: 'sendgrid',
          messageId: response[0].headers['x-message-id']
        };
      } catch (error) {
        console.error('SendGrid error:', error);
        throw error;
      }
    } else {
      // Console provider for development
      console.log('=== EMAIL SIMULATION ===');
      console.log('To:', emailContent.recipients.to.join(', '));
      if (emailContent.recipients.cc?.length > 0) {
        console.log('CC:', emailContent.recipients.cc.join(', '));
      }
      console.log('Subject:', emailContent.subject);
      console.log('--- EMAIL BODY ---');
      console.log(emailContent.plainTextBody);
      console.log('=== END EMAIL ===');
      
      // Save to file for testing
      if (typeof window === 'undefined') {
        const fs = require('fs');
        const path = require('path');
        const emailDir = path.join(process.cwd(), 'test-emails');
        
        if (!fs.existsSync(emailDir)) {
          fs.mkdirSync(emailDir);
        }
        
        const filename = `email-${Date.now()}.html`;
        fs.writeFileSync(
          path.join(emailDir, filename),
          emailContent.htmlBody
        );
        
        console.log(`Email HTML saved to: test-emails/${filename}`);
      }
      
      return { 
        success: true, 
        provider: 'console',
        messageId: `console-${Date.now()}`
      };
    }
  }

  async sendBulkEmails(emails) {
    const results = [];
    
    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        results.push({ email: email.recipients.to[0], ...result });
      } catch (error) {
        results.push({ 
          email: email.recipients.to[0], 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  }
}

// Export singleton instance
const emailProvider = new EmailProvider();
export default emailProvider;

// Convenience function
export const sendEmail = async (emailContent) => {
  return await emailProvider.sendEmail(emailContent);
};