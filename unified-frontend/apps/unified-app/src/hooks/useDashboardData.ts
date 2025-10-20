import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardDataService, { DashboardDataState } from '../services/DashboardDataService';
import { StudentProfile, AssessmentData, PillarScores, MobilityData } from '../types/dashboard';

export interface UseDashboardDataReturn {
  // Data state
  studentProfile: StudentProfile | null;
  assessmentData: AssessmentData | null;
  pillarScores: PillarScores | null;
  mobilityData: MobilityData | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  refreshData: () => Promise<void>;
  retryFailedRequests: () => Promise<void>;
  
  // Utility functions
  isDataStale: boolean;
  getDataAge: () => number;
  hasValidData: boolean;
}

export function useDashboardData(studentId: string): UseDashboardDataReturn {
  const [state, setState] = useState<DashboardDataState>({
    studentProfile: null,
    assessmentData: null,
    pillarScores: null,
    mobilityData: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  const dataService = useRef<DashboardDataService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize data service
  useEffect(() => {
    if (!dataService.current) {
      dataService.current = DashboardDataService.getInstance();
    }

    // Subscribe to data updates
    if (dataService.current && studentId) {
      unsubscribeRef.current = dataService.current.subscribe((updates) => {
        setState(prevState => ({ ...prevState, ...updates }));
      });

      // Initialize dashboard data
      dataService.current.initializeDashboard(studentId);
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (dataService.current) {
        dataService.current.destroy();
      }
    };
  }, [studentId]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    if (dataService.current && studentId) {
      try {
        await dataService.current.refreshStudentData(studentId);
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }
  }, [studentId]);

  // Retry failed requests
  const retryFailedRequests = useCallback(async () => {
    if (dataService.current && studentId) {
      try {
        await dataService.current.initializeDashboard(studentId);
      } catch (error) {
        console.error('Failed to retry requests:', error);
      }
    }
  }, [studentId]);

  // Utility functions
  const isDataStale = useCallback(() => {
    if (!state.lastUpdated) return true;
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    return Date.now() - state.lastUpdated.getTime() > staleThreshold;
  }, [state.lastUpdated]);

  const getDataAge = useCallback(() => {
    if (!state.lastUpdated) return Infinity;
    return Date.now() - state.lastUpdated.getTime();
  }, [state.lastUpdated]);

  const hasValidData = useCallback(() => {
    return !!(state.studentProfile && state.assessmentData && state.pillarScores);
  }, [state.studentProfile, state.assessmentData, state.pillarScores]);

  return {
    // Data state
    studentProfile: state.studentProfile,
    assessmentData: state.assessmentData,
    pillarScores: state.pillarScores,
    mobilityData: state.mobilityData,
    
    // Loading and error states
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    
    // Actions
    refreshData,
    retryFailedRequests,
    
    // Utility functions
    isDataStale: isDataStale(),
    getDataAge,
    hasValidData: hasValidData()
  };
}

// Specialized hooks for specific data types

export function useStudentProfile(studentId: string) {
  const { studentProfile, isLoading, error, lastUpdated } = useDashboardData(studentId);
  
  return {
    profile: studentProfile,
    isLoading,
    error,
    lastUpdated,
    hasProfile: !!studentProfile
  };
}

export function useAssessmentData(studentId: string) {
  const { assessmentData, pillarScores, isLoading, error, lastUpdated } = useDashboardData(studentId);
  
  return {
    assessment: assessmentData,
    pillarScores,
    isLoading,
    error,
    lastUpdated,
    hasAssessment: !!assessmentData,
    hasPillarScores: !!pillarScores
  };
}

export function useMobilityData(studentId: string) {
  const { mobilityData, isLoading, error, lastUpdated } = useDashboardData(studentId);
  
  return {
    mobility: mobilityData,
    isLoading,
    error,
    lastUpdated,
    hasMobilityData: !!mobilityData
  };
}

// Hook for real-time score updates
export function useScoreUpdates(studentId: string) {
  const { pillarScores, assessmentData, lastUpdated } = useDashboardData(studentId);
  const [previousScores, setPreviousScores] = useState<PillarScores | null>(null);
  const [scoreChanges, setScoreChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (pillarScores && previousScores) {
      const changes: Record<string, number> = {};
      
      Object.keys(pillarScores).forEach(pillar => {
        const current = pillarScores[pillar as keyof PillarScores];
        const previous = previousScores[pillar as keyof PillarScores];
        
        if (current && previous) {
          changes[pillar] = current.score - previous.score;
        }
      });
      
      setScoreChanges(changes);
    }
    
    if (pillarScores) {
      setPreviousScores(pillarScores);
    }
  }, [pillarScores, previousScores]);

  return {
    currentScores: pillarScores,
    scoreChanges,
    lastUpdated,
    hasChanges: Object.keys(scoreChanges).length > 0
  };
}

// Hook for data freshness monitoring
export function useDataFreshness(studentId: string) {
  const { lastUpdated, isDataStale, getDataAge } = useDashboardData(studentId);
  const [freshnessStatus, setFreshnessStatus] = useState<'fresh' | 'stale' | 'very_stale'>('fresh');

  useEffect(() => {
    const updateFreshnessStatus = () => {
      const age = getDataAge();
      
      if (age < 5 * 60 * 1000) { // Less than 5 minutes
        setFreshnessStatus('fresh');
      } else if (age < 30 * 60 * 1000) { // Less than 30 minutes
        setFreshnessStatus('stale');
      } else {
        setFreshnessStatus('very_stale');
      }
    };

    updateFreshnessStatus();
    
    // Update every minute
    const interval = setInterval(updateFreshnessStatus, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [getDataAge]);

  return {
    freshnessStatus,
    lastUpdated,
    dataAge: getDataAge(),
    isStale: isDataStale
  };
}











