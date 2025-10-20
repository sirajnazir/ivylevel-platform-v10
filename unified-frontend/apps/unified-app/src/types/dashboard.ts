// Core data types for the student dashboard

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  grade: number;
  school: string;
  location: {
    zip_code: string;
    state: string;
  };
  academic_profile: {
    gpa: number;
    sat_score: number;
    ap_courses: number;
    honors_courses: number;
  };
  extracurriculars: Array<{
    name: string;
    role: string;
    hours: number;
  }>;
  achievements: Array<{
    title: string;
    year: number;
  }>;
}

export interface AssessmentData {
  student_id: string;
  assessment_date: string;
  academic_performance: {
    overall_score: number;
    trend: number;
    breakdown: {
      gpa_impact: number;
      test_scores: number;
      course_rigor: number;
    };
  };
  extracurricular_engagement: {
    overall_score: number;
    trend: number;
    breakdown: {
      leadership: number;
      commitment: number;
      impact: number;
    };
  };
  community_service: {
    overall_score: number;
    trend: number;
    breakdown: {
      hours: number;
      leadership: number;
      impact: number;
    };
  };
  personal_narrative: {
    overall_score: number;
    trend: number;
    breakdown: {
      uniqueness: number;
      authenticity: number;
      potential: number;
    };
  };
  behavioral_insights: {
    personality_traits: string[];
    strengths: string[];
    areas_for_growth: string[];
  };
  admission_probabilities: {
    tier_1: number;
    tier_2: number;
    tier_3: number;
    tier_4: number;
  };
}

export interface PillarScore {
  score: number;
  trend: number;
  status: 'excellent' | 'strong' | 'average' | 'needs_improvement';
}

export interface PillarScores {
  aptitude: PillarScore;
  passion: PillarScore;
  service: PillarScore;
  identity: PillarScore;
}

export interface MobilityData {
  zip_code: string;
  state: string;
  mobility_score: number;
  income_percentile_25: number;
  income_percentile_75: number;
  college_attendance_rate: number;
  upward_mobility_rate: number;
}

// UI-specific interfaces for existing components

export interface RingData {
  percentage: number;
  color: string;
  label: string;
  strokeWidth: number;
  radius: number;
  cx: number;
  cy: number;
}

export interface IvyScoreData {
  overall_score: number;
  score_change: number;
  achievement_level: 'GOLD' | 'SILVER' | 'BRONZE';
  target_gap: number;
  tier_probability: number;
}

export interface PillarCardData {
  title: string;
  score: number;
  trend: number;
  status: string;
  description: string;
  boost_recommendations: string[];
  icon: string;
  color: string;
}

export interface AptitudeCardData extends PillarCardData {
  academic_breakdown: {
    gpa: number;
    test_scores: number;
    course_rigor: number;
  };
  profile_type: string;
}

export interface PassionCardData extends PillarCardData {
  engagement_metrics: {
    activities_count: number;
    leadership_roles: number;
    hours_committed: number;
  };
  passion_projects: string[];
}

export interface ServiceCardData extends PillarCardData {
  service_metrics: {
    total_hours: number;
    organizations: number;
    leadership_roles: number;
  };
  impact_areas: string[];
}

export interface IdentityCardData extends PillarCardData {
  narrative_elements: {
    uniqueness_score: number;
    authenticity_score: number;
    differentiation_potential: number;
  };
  cultural_background: string[];
  personal_story: string;
}

// Animation and UI state interfaces

export interface AnimationState {
  isAnimating: boolean;
  progress: number;
  duration: number;
  easing: string;
}

export interface LoadingState {
  isLoading: boolean;
  skeleton: boolean;
  error: string | null;
  retryCount: number;
}

export interface DataFreshness {
  lastUpdated: Date;
  isStale: boolean;
  cacheAge: number;
  source: 'live' | 'cached' | 'fallback';
}

// API response interfaces

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface AssessmentResponse extends ApiResponse<AssessmentData> {
  confidence: number;
  model_version: string;
}

export interface MobilityResponse extends ApiResponse<MobilityData> {
  data_source: string;
  last_updated: string;
}

// Error handling interfaces

export interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorCode?: string;
  retryable: boolean;
  fallbackData?: any;
}

// Real-time update interfaces

export interface DataUpdate {
  type: 'score_change' | 'new_assessment' | 'mobility_update' | 'profile_update';
  timestamp: Date;
  data: any;
  priority: 'high' | 'medium' | 'low';
}

export interface UpdateNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  duration: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

// Performance monitoring interfaces

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  animationFPS: number;
  memoryUsage: number;
  apiResponseTime: number;
}

export interface PerformanceThresholds {
  maxLoadTime: number;
  minFPS: number;
  maxMemoryUsage: number;
  maxApiResponseTime: number;
}

// Accessibility interfaces

export interface AccessibilityState {
  screenReaderActive: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// Responsive design interfaces

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  largeDesktop: number;
}

export interface ResponsiveState {
  currentBreakpoint: keyof ResponsiveBreakpoints;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}











