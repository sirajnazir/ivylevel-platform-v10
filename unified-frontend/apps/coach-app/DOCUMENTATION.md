# Smart Coach Onboarding and Training Platform Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Features](#features)
5. [Getting Started](#getting-started)
6. [Authentication](#authentication)
7. [User Roles](#user-roles)
8. [Training Modules](#training-modules)
9. [Development Guide](#development-guide)
10. [Production Deployment](#production-deployment)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

## Overview

The Smart Coach Onboarding and Training Platform is a comprehensive web application designed to onboard and train educational coaches for the Ivylevel coaching program. The platform features a progressive training system with interactive modules, resource management, and role-based access control.

### Key Features:
- 🔐 Secure authentication system (Firebase-ready)
- 👥 Role-based dashboards (Admin & Coach)
- 📚 5-module progressive training program
- 📊 Real-time progress tracking
- 🎯 Personalized resource hub
- ⏱️ 48-hour training deadline enforcement
- 📱 Fully responsive design

## Technology Stack

### Frontend Framework
- **React 19.1.0** - Latest React with concurrent features
- **React DOM 19.1.0** - DOM-specific methods for React

### Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **PostCSS 8.5.3** - CSS transformation tool
- **Autoprefixer 10.4.21** - Automatic CSS vendor prefixing

### Authentication & Backend
- **Firebase 11.8.1** - Authentication, database, and hosting
  - Currently using mock implementation
  - Ready for Firebase integration

### UI Components
- **Lucide React 0.511.0** - Icon library
- Custom SVG icon components

### Testing
- **Jest** - JavaScript testing framework
- **React Testing Library 16.3.0** - React component testing
- **Testing Library DOM 10.4.0** - DOM testing utilities
- **Testing Library Jest DOM 6.6.3** - Custom Jest matchers

### Build Tools
- **React Scripts 5.0.1** - Create React App configuration

## Project Structure

```
ivylevel-coach-training/
├── public/                    # Static assets
│   ├── index.html            # Main HTML template
│   ├── manifest.json         # PWA manifest
│   ├── favicon.ico           # Site favicon
│   └── logo*.png             # PWA icons
│
├── src/                      # Source code
│   ├── App.js               # Main application component
│   ├── SmartResourceHub.js  # Resource management component
│   ├── index.js             # React entry point
│   ├── index.css            # Global styles
│   ├── App.css              # App-specific styles
│   ├── input.css            # Tailwind input file
│   └── [various backups]    # Version history files
│
├── logo/                     # Brand assets
│   ├── *.svg                # SVG logos
│   └── *.jpg                # Image assets
│
├── build/                    # Production build (generated)
├── dist/                     # Tailwind output
│   └── output.css           # Compiled CSS
│
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
└── .gitignore              # Git ignore rules
```

## Features

### 1. Authentication System
- Mock Firebase authentication implementation
- Login/logout functionality with session persistence
- Password visibility toggle
- Error handling and loading states
- Test credentials for easy development

### 2. Admin Dashboard
- **Coach Management**
  - Create new coach accounts
  - View all coaches in a comprehensive table
  - Track training progress and deadlines
  - Monitor certification status

- **Resource Sharing**
  - Share Google Drive resources
  - View-only permissions enforcement
  - Track shared resources per coach

- **Analytics**
  - Total coaches count
  - Active training tracking
  - Certification metrics

### 3. Coach Dashboard
- Progressive training flow
- Visual progress indicators
- Time tracking and deadlines
- Module completion tracking

### 4. Training Modules

#### Module 1: Welcome & Commitment
- Personal impact visualization
- Earning potential display ($25,000/year)
- Bonus structure explanation
- Commitment agreement
- 48-hour deadline warning

#### Module 2: Student Mastery
- Interactive student profile review
- Smart Resource Hub integration
- Comprehension assessment (80% pass rate)
- Personalized learning resources

#### Module 3: Technical Setup
- Professional email configuration
- Zoom setup verification
- Payment account setup (Mercury)
- Technical readiness checklist

#### Module 4: Session Practice
- 60-minute coaching simulation
- 4 scenario management exercises
- Response evaluation system
- 85% minimum score requirement

#### Module 5: Final Certification
- Coach commitment pledge
- Emergency protocol testing
- First session scheduling
- Certificate generation

### 5. Smart Resource Hub
- Personalized game plans
- Training video library
- Similar student success stories
- Session tools and templates
- Progress tracking

## Getting Started

### Prerequisites
- Node.js 14+ and npm 6+
- Git for version control
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ivylevel-coach-training
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```
   The app will open at http://localhost:3000

### Available Scripts

- `npm start` - Runs the development server
- `npm build` - Creates production build in `/build`
- `npm test` - Runs the test suite
- `npm run eject` - Ejects from Create React App (irreversible)

## Authentication

### Test Credentials

**Admin Account:**
- Email: admin@ivylevel.com
- Password: admin123

**Coach Account:**
- Email: coach@ivylevel.com
- Password: coach123

### Firebase Integration (Future)

The application is prepared for Firebase integration. To connect Firebase:

1. Create a Firebase project
2. Add Firebase configuration to environment variables
3. Update the mock auth functions in App.js
4. Enable Authentication and Firestore in Firebase Console

## User Roles

### Admin Role
- Full platform access
- Coach account management
- Resource sharing capabilities
- Analytics and reporting
- Training oversight

### Coach Role
- Access to training modules
- Personal dashboard
- Resource hub access
- Progress tracking
- Certificate generation

## Training Modules

### Module Flow
1. Modules must be completed sequentially
2. Minimum scores required to progress
3. Progress is saved automatically
4. 48-hour deadline from start

### Scoring Requirements
- Module 2 Quiz: 80% minimum
- Module 4 Simulation: 85% minimum
- Module 5 Emergency Protocols: 100% required

## Development Guide

### Code Style
- React functional components with hooks
- Inline styles for component isolation
- Consistent color scheme (#FF4A23 primary)
- Mobile-first responsive design

### State Management
- React Context for authentication
- Local state with useState hooks
- Mock database in memory
- Progress tracking per user

### Adding New Features
1. Create feature branch
2. Implement with existing patterns
3. Test thoroughly
4. Update documentation
5. Create pull request

## Production Deployment

### Build for Production
```bash
npm run build
```

This creates an optimized production build in the `/build` folder.

### Deployment Options

#### 1. Firebase Hosting
```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

#### 2. Netlify
- Connect GitHub repository
- Set build command: `npm run build`
- Set publish directory: `build`

#### 3. Vercel
```bash
npm install -g vercel
vercel
```

### Environment Variables
Create `.env.local` for local development:
```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
```

## Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm test -- --coverage
```

### Writing Tests
- Use React Testing Library
- Test user interactions
- Mock external dependencies
- Focus on behavior, not implementation

## Troubleshooting

### Common Issues

1. **Build fails with Tailwind errors**
   - Ensure PostCSS config is correct
   - Check Tailwind config file
   - Clear node_modules and reinstall

2. **Authentication not working**
   - Verify test credentials
   - Check console for errors
   - Ensure mock auth is enabled

3. **Styles not applying**
   - Check Tailwind classes
   - Verify CSS imports
   - Clear browser cache

4. **Module progression blocked**
   - Check minimum score requirements
   - Verify previous modules completed
   - Review console for errors

### Debug Mode
Add to URL: `?debug=true` to enable verbose logging

### Support
For issues or questions:
- Check existing documentation
- Review code comments
- Contact development team

---

## Future Enhancements

1. **Firebase Integration**
   - Real authentication
   - Cloud Firestore database
   - Real-time updates
   - File storage

2. **Additional Features**
   - Video recording integration
   - Live Zoom API integration
   - Automated certificate generation
   - Email notifications

3. **Analytics**
   - Training completion rates
   - Performance metrics
   - User engagement tracking
   - Success rate analysis

4. **Mobile App**
   - React Native version
   - Offline capability
   - Push notifications
   - Native features

---

**Version:** 0.1.0  
**Last Updated:** December 2024  
**Maintained by:** Ivylevel Development Team