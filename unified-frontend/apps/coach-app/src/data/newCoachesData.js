// Extracted data from onboarding emails for new coaches
export const newCoachesData = {
  kelvin: {
    name: "Kelvin",
    email: "kelvin@ivymentors.co",
    startDate: "2024-07-05",
    student: {
      name: "Abhi",
      profile: "Computer Science & Business Aspirant",
      gameplanVideo: "https://drive.google.com/file/d/1dgx7k3J_z0PO7cOVMqKuFOajl_x_Dulg",
      gameplanReport: "Abhi's Game Plan Report",
      focusAreas: ["weak spots", "summer plans", "priority areas", "quick wins"],
      executionDoc: "Kelvin & Abhi's Execution Doc"
    },
    trainingNeeds: {
      primaryVideo: "Andrew & Aarnav - Video", // 168-hour session example
      primaryDoc: "Andrew & Aarnav - Doc",
      studentType: "CS & Business",
      sessionType: "168-hour first session",
      priority: "Quick wins to build confidence"
    }
  },
  
  jamie: {
    name: "Jamie",
    email: "jamie@ivymentors.co",
    startDate: "2024-05-28",
    student: {
      name: "Zainab",
      profile: "Average Academics and BioMed Aspirant",
      gameplanVideo: "Video Session Recording",
      gameplanReport: "Zainab's Game Plan Report Draft v1.0",
      focusAreas: ["weak spots", "summer plans", "priority areas", "quick wins"],
      executionDoc: "Jamie & Zainab's Execution Doc"
    },
    trainingNeeds: {
      primaryVideo: "Marissa & Zainab - Video", // 168-hour session
      primaryDoc: "Marissa & Zainab - Doc",
      additionalResources: {
        similarStudent: "Iqra - Average Profile (BioMed)",
        referenceVideo: "Marissa & Iqra Session",
        referenceDoc: "Ivylevel Marissa & Katie <> Iqra Weekly Planning"
      },
      studentType: "BioMed",
      sessionType: "168-hour first session",
      priority: "Average academics improvement"
    }
  },
  
  noor: {
    name: "Noor",
    email: "noor@ivymentors.co",
    startDate: "2024-05-07",
    students: [
      {
        name: "Beya",
        profile: "Upperclassman (Junior)",
        gameplanReport: "Beya's Report",
        executionDoc: "Beya's Execution Doc",
        type: "junior"
      },
      {
        name: "Hiba",
        profile: "Underclassman (Sophomore)",
        gameplanReport: "Hiba's Report",
        executionDoc: "Hiba's Execution Doc",
        type: "sophomore"
      }
    ],
    trainingNeeds: {
      sophomoreTraining: {
        video: "Marissa & Iqra",
        doc: "Marissa & Iqra Doc"
      },
      juniorTraining: {
        video: "Erin & Srinidhi",
        doc: "Erin & Srinidhi Doc"
      },
      masterDoc: "Coach Resources",
      priority: "Handling different grade levels",
      sessionType: "168-hour first session for multiple students"
    }
  }
};

// Key training patterns identified
export const trainingPatterns = {
  byStudentType: {
    "CS & Business": ["technical skills", "entrepreneurship", "project-based learning"],
    "BioMed": ["research opportunities", "medical shadowing", "GPA improvement"],
    "Average Academics": ["study skills", "confidence building", "gradual improvement"],
    "Upperclassman": ["college apps", "essays", "timeline management"],
    "Underclassman": ["foundation building", "extracurriculars", "long-term planning"]
  },
  
  commonRequirements: [
    "168-hour first session training",
    "Weekly execution documents",
    "Session recording protocols",
    "Recap email templates",
    "Zoom and calendar setup",
    "Payment process understanding"
  ],
  
  criticalFocusAreas: [
    "Quick wins for confidence",
    "Weak spot identification",
    "Priority area execution",
    "Summer planning",
    "Parent communication"
  ]
};