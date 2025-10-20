// emailAutomation.js - Automated email generation with resource integration

import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

class EmailAutomationService {
  constructor() {
    this.db = getFirestore();
    this.templates = {
      onboarding: 'onboarding-template',
      sessionRecap: 'session-recap-template',
      resourceShare: 'resource-share-template',
      deadline: 'deadline-reminder-template'
    };
  }

  /**
   * Generate personalized onboarding email for a coach
   */
  async generateOnboardingEmail(coachId, adminId) {
    try {
      // Get coach data
      const coach = await this.getCoachData(coachId);
      if (!coach) throw new Error('Coach not found');

      // Get assigned students
      const students = await this.getAssignedStudents(coachId);
      if (students.length === 0) throw new Error('No students assigned');

      // Get shared resources
      const sharedResources = await this.getSharedResources(coachId);
      
      // Organize resources by type and student
      const organizedResources = this.organizeResourcesByTypeAndStudent(
        sharedResources, 
        students
      );

      // Generate email content
      const emailContent = await this.buildOnboardingEmail(
        coach, 
        students, 
        organizedResources
      );

      // Save email record
      await this.saveEmailRecord(coachId, adminId, 'onboarding', emailContent);

      return emailContent;
    } catch (error) {
      console.error('Error generating onboarding email:', error);
      throw error;
    }
  }

  /**
   * Build onboarding email content
   */
  async buildOnboardingEmail(coach, students, resources) {
    const studentNames = students.map(s => s.name).join(' and ');
    const studentCount = students.length;
    
    // Group resources by category
    const gamePlans = resources.filter(r => r.type === 'game-plan');
    const trainingVideos = resources.filter(r => r.type === 'video' && r.tags.includes('168-hour'));
    const executionDocs = resources.filter(r => r.type === 'template' && r.tags.includes('execution-doc'));
    const additionalResources = resources.filter(r => 
      !gamePlans.includes(r) && 
      !trainingVideos.includes(r) && 
      !executionDocs.includes(r)
    );

    const subject = `Welcome ${coach.name}, Your Mandatory Training & Checklist Items before your first session${studentCount > 1 ? 's' : ''}!`;
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #FF4A23;
    }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .resource-item {
      margin: 10px 0;
      padding: 10px;
      background: white;
      border-left: 4px solid #FF4A23;
    }
    .resource-link {
      color: #FF4A23;
      text-decoration: none;
      font-weight: bold;
    }
    .resource-link:hover {
      text-decoration: underline;
    }
    .student-section {
      background: #FFF5F3;
      padding: 15px;
      margin: 15px 0;
      border-radius: 5px;
    }
    .action-item {
      background: #e8f5e9;
      padding: 10px;
      margin: 5px 0;
      border-radius: 5px;
    }
    .deadline-warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>Welcome to Ivylevel, ${coach.name}! 🎉</h1>
  
  <p>We're excited to have you on board!</p>
  
  <p>Below is your <strong>mandatory action list</strong> to get fully prepared before your first session${studentCount > 1 ? 's' : ''} with <strong>${studentNames}</strong>.</p>

  <div class="deadline-warning">
    <strong>⏰ Important:</strong> You have <strong>48 hours</strong> from receiving this email to complete all training modules and preparations. Your training deadline is: <strong>${this.formatDeadline(coach.trainingDeadline)}</strong>
  </div>

  <!-- Section 1: Student Game Plans -->
  <div class="section">
    <h2>1. Mandatory Review of ${studentCount > 1 ? 'Your Students\' Game Plans' : 'Your Student\'s Game Plan'}</h2>
    <p>Carefully read the entire Game Plan Report${studentCount > 1 ? 's' : ''} and watch the assessment video${studentCount > 1 ? 's' : ''}:</p>
    
    ${students.map((student, index) => `
      <div class="student-section">
        <h3>${student.name} - ${this.formatInterests(student.interests)} Aspirant</h3>
        <p><strong>Grade:</strong> ${this.capitalize(student.grade)} | <strong>GPA:</strong> ${student.gpa} | <strong>Profile:</strong> ${this.capitalize(student.academicProfile)}</p>
        
        ${gamePlans.filter(gp => this.isResourceForStudent(gp, student)).map(gp => `
          <div class="resource-item">
            <strong>📄 Game Plan Report:</strong> 
            <a href="${gp.googleDriveUrl}" class="resource-link" target="_blank">${gp.title}</a>
            ${gp.description ? `<br><small>${gp.description}</small>` : ''}
          </div>
        `).join('')}
        
        ${student.assessmentVideoUrl ? `
          <div class="resource-item">
            <strong>🎥 Assessment Video:</strong> 
            <a href="${student.assessmentVideoUrl}" class="resource-link" target="_blank">Watch ${student.name}'s Assessment Session</a>
          </div>
        ` : ''}
        
        <div class="action-item">
          <strong>Focus Areas:</strong>
          <ul>
            ${student.weakSpots.slice(0, 3).map(ws => `<li>Weak Spot: ${ws}</li>`).join('')}
            ${student.quickWins.slice(0, 3).map(qw => `<li>Quick Win: ${qw}</li>`).join('')}
            ${student.priorityAreas.slice(0, 2).map(pa => `<li>Priority: ${pa}</li>`).join('')}
          </ul>
        </div>
        
        <p><em>💡 Remember: You own the plan now! Adjust, add, or pivot strategies based on ongoing assessments and progress. Your goal is to help ${student.name} achieve quick wins to build confidence.</em></p>
      </div>
    `).join('')}
  </div>

  <!-- Section 2: Training Videos -->
  <div class="section">
    <h2>2. Mandatory New Coach Training Videos for First 168 Hour Session</h2>
    <p>Watch these training videos that match your students' profiles:</p>
    
    ${trainingVideos.length > 0 ? trainingVideos.map(video => `
      <div class="resource-item">
        <strong>🎥 Training Video:</strong> 
        <a href="${video.googleDriveUrl}" class="resource-link" target="_blank">${video.title}</a>
        ${video.duration ? `<span> (${video.duration})</span>` : ''}
        <br><small>${video.description}</small>
        ${video.tags.includes('sophomore') ? '<br><small>💡 Recommended for underclassmen like ' + students.filter(s => ['freshman', 'sophomore'].includes(s.grade)).map(s => s.name).join(', ') + '</small>' : ''}
        ${video.tags.includes('junior') || video.tags.includes('senior') ? '<br><small>💡 Recommended for upperclassmen like ' + students.filter(s => ['junior', 'senior'].includes(s.grade)).map(s => s.name).join(', ') + '</small>' : ''}
      </div>
    `).join('') : `
      <p>Training videos are being prepared for your specific student profiles. They will be shared with you shortly.</p>
    `}
    
    <div class="resource-item">
      <strong>📚 Additional Training Resources:</strong>
      <a href="#" class="resource-link">Master Document for Coaches</a>
      <br><small>This document covers topics like logistics, training, scheduling, and includes sample notes, emails, and videos.</small>
    </div>
  </div>

  <!-- Section 3: Execution Documents -->
  <div class="section">
    <h2>3. Your First Session Execution Documents and Scheduling</h2>
    
    <h3>Weekly Execution Documents (Use in Every Session):</h3>
    ${students.map(student => {
      const studentExecDoc = executionDocs.find(doc => this.isResourceForStudent(doc, student));
      return `
        <div class="resource-item">
          <strong>📋 ${coach.name} & ${student.name}:</strong> 
          ${studentExecDoc ? 
            `<a href="${studentExecDoc.googleDriveUrl}" class="resource-link" target="_blank">${studentExecDoc.title}</a>` : 
            `<a href="#" class="resource-link">Execution Doc (Will be created after first session)</a>`
          }
        </div>
      `;
    }).join('')}
    
    <h3>Scheduling:</h3>
    <div class="action-item">
      <p>📅 <strong>IMPORTANT:</strong> Update your availability for the next 3-6 months:</p>
      <p><a href="#" class="resource-link">${coach.name}'s Scheduling Document</a></p>
      <p>⚠️ Maintain consistency in session slots; inform students 24 hours ahead of any changes.</p>
    </div>
  </div>

  <!-- Section 4: Additional Resources -->
  ${additionalResources.length > 0 ? `
    <div class="section">
      <h2>4. Additional Recommended Resources</h2>
      <p>Based on your students' profiles, we recommend these additional resources:</p>
      
      ${this.groupResourcesByType(additionalResources).map(group => `
        <h3>${this.getResourceTypeLabel(group.type)}</h3>
        ${group.resources.map(resource => `
          <div class="resource-item">
            <a href="${resource.googleDriveUrl}" class="resource-link" target="_blank">${resource.title}</a>
            ${resource.relevanceScore ? `<span style="float: right; color: #666; font-size: 12px;">${resource.relevanceScore}% match</span>` : ''}
            <br><small>${resource.description}</small>
          </div>
        `).join('')}
      `).join('')}
    </div>
  ` : ''}

  <!-- Section 5: Session Guidelines -->
  <div class="section">
    <h2>5. Session Coach Responsibilities and Conduct Guidelines</h2>
    
    <h3>Before Each 1:1 Session:</h3>
    <ul>
      <li>Log in to your IvyMentors Zoom account (integrated with Google Calendar)</li>
      <li>Send Zoom Call and Calendar invites with subject: <strong>"Ivylevel ${coach.name} <> (Student Name) | Session #X"</strong></li>
      <li>CC: student, parents, contact@ivymentors.co</li>
    </ul>
    
    <h3>During the Session:</h3>
    <ul>
      <li><strong>No Show:</strong> Notify contact@ivymentors.co immediately if student is absent or 15+ minutes late</li>
      <li><strong>Recording:</strong> All sessions are auto-recorded. Start manually if needed.</li>
      <li><strong>Environment:</strong> Quiet place, desktop (not mobile), video ON</li>
      <li><strong>Screen Sharing:</strong> Always share the execution doc during sessions</li>
      <li><strong>Engagement:</strong> Ensure student's video is ON</li>
    </ul>
    
    <h3>After the Session:</h3>
    <p>Send a session recap email within 24 hours using this format:</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px;">
      Subject: Coaching Session Recap - [Week # Session #]<br><br>
      Hi [Student's Name] and Parents,<br><br>
      Here's an update on our recent session:<br><br>
      <strong>Session Highlights:</strong><br>
      • [Highlight 1]<br>
      • [Highlight 2]<br>
      • [Highlight 3]<br><br>
      <strong>Action Items Before Next Meeting [Date & Time]:</strong><br>
      • [Action Item 1]<br>
      • [Action Item 2]<br>
      • [Action Item 3]<br><br>
      <strong>Next Meeting:</strong> [Date & Time Agreed Upon]<br>
      <strong>Agenda:</strong> [Overview of Next Meeting's Agenda]<br>
      <strong>Execution Doc:</strong> [Insert Link]<br><br>
      Feel free to reach out with any questions.<br><br>
      Best,<br>
      Coach ${coach.name}<br>
      ${coach.email}
    </div>
    
    <h3>Offline Support:</h3>
    <p>Respond to student questions within 24-48 hours (max 2 per week). This is crucial for the additional $25 payment and performance bonuses.</p>
  </div>

  <!-- Section 6: Payment Process -->
  <div class="section">
    <h2>6. Payment Process</h2>
    
    <p>After completing sessions and post-call follow-ups, email your completed sessions list to <strong>contact@ivymentors.co</strong></p>
    
    <h3>Payout Request Format:</h3>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px;">
      ${students.map(student => `
        ${student.name}:<br>
        - Week N - mm/dd - $75 (1-hour session) + $25 (weekly support)<br>
        - Week N+2 - mm/dd - $75 (1-hour session) + $25 (weekly support)<br>
      `).join('<br>')}
    </div>
    
    <h3>Payment Timeline:</h3>
    <ul>
      <li>Processed biweekly via Mercury</li>
      <li>$75 after each session (within 24 hours)</li>
      <li>$25 weekly support payment before next session</li>
    </ul>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>If you have any questions or need assistance, feel free to reach out. Looking forward to seeing your sessions in action!</p>
    <p>
      Best,<br>
      Siraj<br>
      siraj@ivymentors.co
    </p>
    <hr>
    <p style="font-size: 12px; color: #999;">
      This email was automatically generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
      Ivylevel Coach Training Platform | <a href="#">Unsubscribe</a> | <a href="#">Preferences</a>
    </p>
  </div>
</body>
</html>
    `;

    const plainTextBody = this.convertHtmlToPlainText(htmlBody);

    return {
      subject,
      htmlBody,
      plainTextBody,
      recipients: {
        to: [coach.email],
        cc: ['contact@ivymentors.co', 'siraj@ivymentors.co'],
        bcc: []
      },
      metadata: {
        coachId: coach.id,
        studentIds: students.map(s => s.id),
        resourceIds: resources.map(r => r.id),
        templateType: 'onboarding'
      }
    };
  }

  /**
   * Generate session recap email
   */
  async generateSessionRecapEmail(sessionData) {
    const { coachId, studentId, sessionNumber, highlights, actionItems, nextSession } = sessionData;

    const coach = await this.getCoachData(coachId);
    const student = await this.getStudentData(studentId);

    const subject = `Coaching Session Recap - Week ${Math.ceil(sessionNumber / 2)} Session ${sessionNumber}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    h2 {
      color: #FF4A23;
    }
    .highlight {
      background: #f0f8ff;
      padding: 10px;
      margin: 5px 0;
      border-left: 3px solid #FF4A23;
    }
    .action-item {
      background: #f0fff0;
      padding: 10px;
      margin: 5px 0;
      border-left: 3px solid #4CAF50;
    }
    .next-session {
      background: #fff5f0;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h2>Hi ${student.name} and Parents,</h2>
  
  <p>Here's an update on our recent session:</p>
  
  <h3>Session Highlights:</h3>
  ${highlights.map(highlight => `
    <div class="highlight">
      • ${highlight}
    </div>
  `).join('')}
  
  <h3>Action Items Before Next Meeting (${this.formatDate(nextSession.date)})</h3>
  ${actionItems.map(item => `
    <div class="action-item">
      • ${item.task} ${item.dueDate ? `(Due: ${this.formatDate(item.dueDate)})` : ''}
    </div>
  `).join('')}
  
  <div class="next-session">
    <h3>Next Meeting Details:</h3>
    <p><strong>Date & Time:</strong> ${this.formatDate(nextSession.date)} at ${nextSession.time}</p>
    <p><strong>Agenda:</strong> ${nextSession.agenda}</p>
    <p><strong>Execution Document:</strong> <a href="${nextSession.executionDocUrl}">Click here to access</a></p>
  </div>
  
  <p>Feel free to reach out with any questions.</p>
  
  <p>
    Best,<br>
    Coach ${coach.name}<br>
    ${coach.email}
  </p>
</body>
</html>
    `;

    return {
      subject,
      htmlBody,
      plainTextBody: this.convertHtmlToPlainText(htmlBody),
      recipients: {
        to: [student.email, student.parentEmail],
        cc: ['contact@ivymentors.co', 'siraj@ivymentors.co'],
        bcc: []
      }
    };
  }

  /**
   * Generate deadline reminder email
   */
  async generateDeadlineReminderEmail(coachId, hoursRemaining) {
    const coach = await this.getCoachData(coachId);
    
    const urgency = hoursRemaining <= 12 ? 'URGENT' : 'Important';
    const subject = `${urgency}: ${hoursRemaining} Hours Remaining to Complete Training`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .urgent-header {
      background: #ff4444;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .warning-box {
      background: #fff3cd;
      border: 2px solid #ffeaa7;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .cta-button {
      display: inline-block;
      background: #FF4A23;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="urgent-header">
    <h1>${urgency}: Training Deadline Approaching!</h1>
    <h2>⏰ ${hoursRemaining} hours remaining</h2>
  </div>
  
  <p>Hi ${coach.name},</p>
  
  <p>This is a reminder that you have <strong>${hoursRemaining} hours</strong> remaining to complete your mandatory training modules.</p>
  
  <div class="warning-box">
    <strong>⚠️ What happens if you miss the deadline:</strong>
    <ul>
      <li>Your assigned students will be reassigned to another coach</li>
      <li>You'll need to restart the training process</li>
      <li>This may delay your first coaching session and payment</li>
    </ul>
  </div>
  
  <h3>Modules Remaining:</h3>
  <ul>
    ${coach.completedModules.length < 5 ? 
      [1,2,3,4,5].filter(m => !coach.completedModules.includes(m))
        .map(m => `<li>Module ${m}</li>`).join('') 
      : '<li>All modules completed! Please schedule your first session.</li>'
    }
  </ul>
  
  <p style="text-align: center; margin: 30px 0;">
    <a href="#" class="cta-button">Continue Training Now</a>
  </p>
  
  <p>If you're experiencing any difficulties, please reach out immediately at contact@ivymentors.co</p>
  
  <p>
    Best,<br>
    The Ivylevel Team
  </p>
</body>
</html>
    `;

    return {
      subject,
      htmlBody,
      plainTextBody: this.convertHtmlToPlainText(htmlBody),
      recipients: {
        to: [coach.email],
        cc: ['siraj@ivymentors.co'],
        bcc: []
      },
      priority: 'high'
    };
  }

  /**
   * Send email using your email service
   */
  async sendEmail(emailContent) {
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll save to database and return success
    
    try {
      const emailRecord = await addDoc(collection(this.db, 'emailQueue'), {
        ...emailContent,
        status: 'pending',
        createdAt: serverTimestamp(),
        scheduledFor: serverTimestamp(),
        attempts: 0
      });

      console.log('Email queued for sending:', emailRecord.id);
      return { success: true, emailId: emailRecord.id };
    } catch (error) {
      console.error('Error queueing email:', error);
      throw error;
    }
  }

  /**
   * Helper functions
   */
  
  async getCoachData(coachId) {
    const coachDoc = await getDoc(doc(this.db, 'users', coachId));
    return coachDoc.exists() ? { id: coachDoc.id, ...coachDoc.data() } : null;
  }

  async getStudentData(studentId) {
    const studentDoc = await getDoc(doc(this.db, 'students', studentId));
    return studentDoc.exists() ? { id: studentDoc.id, ...studentDoc.data() } : null;
  }

  async getAssignedStudents(coachId) {
    const studentsQuery = query(
      collection(this.db, 'students'),
      where('assignedCoachId', '==', coachId),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getSharedResources(coachId) {
    const resourcesQuery = query(
      collection(this.db, 'coachResources'),
      where('coachId', '==', coachId)
    );
    
    const snapshot = await getDocs(resourcesQuery);
    const coachResources = snapshot.docs.map(doc => doc.data());
    
    // Get full resource details
    const resources = [];
    for (const cr of coachResources) {
      const resourceDoc = await getDoc(doc(this.db, 'resources', cr.resourceId));
      if (resourceDoc.exists()) {
        resources.push({
          id: resourceDoc.id,
          ...resourceDoc.data(),
          relevanceScore: cr.relevanceScore
        });
      }
    }
    
    return resources;
  }

  organizeResourcesByTypeAndStudent(resources, students) {
    return resources;
  }

  isResourceForStudent(resource, student) {
    const gradeMatch = resource.grade.includes('all') || 
                      resource.grade.includes(student.grade);
    const subjectMatch = resource.subject.some(s => 
      student.interests.includes(s)
    );
    
    return gradeMatch || subjectMatch;
  }

  groupResourcesByType(resources) {
    const grouped = {};
    
    resources.forEach(resource => {
      if (!grouped[resource.type]) {
        grouped[resource.type] = {
          type: resource.type,
          resources: []
        };
      }
      grouped[resource.type].resources.push(resource);
    });
    
    return Object.values(grouped);
  }

  getResourceTypeLabel(type) {
    const labels = {
      'video': '🎥 Training Videos',
      'document': '📄 Documents & Reports',
      'template': '📋 Templates & Tools',
      'case-study': '🌟 Success Stories',
      'game-plan': '🎯 Game Plans'
    };
    
    return labels[type] || '📁 Resources';
  }

  formatInterests(interests) {
    if (!interests || interests.length === 0) return 'General';
    
    const formatted = interests.map(i => {
      const mappings = {
        'biomed': 'BioMed',
        'cs': 'Computer Science',
        'business': 'Business',
        'cs-business': 'CS & Business',
        'stem': 'STEM',
        'humanities': 'Humanities'
      };
      return mappings[i] || this.capitalize(i);
    });
    
    return formatted.join(' & ');
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  formatDate(date) {
    if (!date) return 'TBD';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDeadline(deadline) {
    if (!deadline) return 'Not set';
    const d = deadline.toDate ? deadline.toDate() : new Date(deadline);
    return d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  convertHtmlToPlainText(html) {
    // Simple HTML to plain text conversion
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  async saveEmailRecord(coachId, adminId, type, content) {
    await addDoc(collection(this.db, 'emailHistory'), {
      coachId,
      adminId,
      type,
      subject: content.subject,
      recipients: content.recipients,
      metadata: content.metadata,
      sentAt: serverTimestamp()
    });
  }
}

// Export service instance
const emailService = new EmailAutomationService();
export default emailService;

// Convenience functions
export const generateOnboardingEmail = async (coachId, adminId) => {
  return await emailService.generateOnboardingEmail(coachId, adminId);
};

export const generateSessionRecap = async (sessionData) => {
  return await emailService.generateSessionRecapEmail(sessionData);
};

export const generateDeadlineReminder = async (coachId, hoursRemaining) => {
  return await emailService.generateDeadlineReminderEmail(coachId, hoursRemaining);
};

export const sendEmail = async (emailContent) => {
  return await emailService.sendEmail(emailContent);
};