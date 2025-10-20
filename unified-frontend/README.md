# IvyLevel Unified Frontend

This is the unified frontend application for the IvyLevel platform, combining both student and coach portals into a single, cohesive experience.

## Features

- **Unified Authentication**: Single sign-on across student and coach portals
- **Role-Based Access**: Dynamic UI based on user role (student/coach)
- **AI-Powered Insights**: Integration with backend AI agents
- **Real-Time Updates**: WebSocket integration for live notifications
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Preserved Aesthetics**: Original UI/UX from both portals maintained

## Technology Stack

- **React 19.1.0** with TypeScript
- **Vite** for fast development and building
- **Redux Toolkit** for state management
- **RTK Query** for API data fetching
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Framer Motion** for animations
- **Socket.io** for real-time features

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see main project README)

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the environment variables:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── common/     # Shared components
│   ├── student/    # Student-specific components
│   └── coach/      # Coach-specific components
├── features/       # Feature modules
│   ├── auth/       # Authentication
│   ├── student/    # Student features
│   ├── coach/      # Coach features
│   ├── ai-chat/    # AI agent chat
│   └── analytics/  # Analytics dashboards
├── services/       # API and external services
├── store/          # Redux store configuration
├── styles/         # Global styles
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Key Components

### Student Portal
- `IvyScoreCard`: Displays Ivy+ readiness score with trends
- `TaskCard`: Shows individual tasks with completion tracking
- `AgentChat`: AI-powered chat interface
- `ProfileAssessment`: Comprehensive profile form

### Coach Portal
- `TrainingModule`: Progressive training system
- `VideoPlayer`: Session video playback
- `StudentCard`: Student overview cards
- `CertificateDisplay`: Training certificates

### Shared Components
- `Layout`: Main application layout
- `Navigation`: Role-based navigation
- `CrisisAlert`: Crisis detection alerts
- `NotificationCenter`: Real-time notifications

## API Integration

The frontend integrates with the following backend endpoints:

- `/api/unified/*` - Core platform APIs
- `/api/email/*` - Email intelligence APIs
- `/api/auth/*` - Authentication endpoints
- `/ws/*` - WebSocket connections

## Testing

Run unit tests:
```bash
npm run test
```

Run E2E tests:
```bash
npm run test:e2e
```

## Deployment

The application is configured for deployment on Vercel/Netlify:

1. Build the application
2. Deploy the `dist` folder
3. Configure environment variables
4. Set up custom domain

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Private - IvyLevel © 2024