import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { IvyScoreData, AssessmentData } from '../../types/dashboard';

const Container = styled.div`
  background-color: #ff504f;
  border: 5.59px solid #ffdcdb;
  border-radius: 22.37px;
  height: 200px;
  position: relative;
  width: 380px;
  margin-top: 40px;
`;

const Title = styled.div`
  color: #ffffff;
  font-family: "Inter", sans-serif;
  font-size: 16.8px;
  font-weight: 500;
  height: 23px;
  left: 17px;
  letter-spacing: 0;
  line-height: 22.4px;
  position: absolute;
  top: 16px;
  white-space: nowrap;
`;

const ScoreIncrease = styled.div`
  align-items: center;
  display: inline-flex;
  gap: 4.19px;
  left: 17px;
  position: absolute;
  top: 47px;
`;

const ScoreText = styled.p`
  color: #f4f3f2;
  font-family: "Inter", sans-serif;
  font-size: 8.4px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 11.2px;
  margin-top: -0.29px;
  position: relative;
  white-space: nowrap;
`;

const PercentageBadge = styled.div`
  align-items: flex-start;
  background-color: #ffffff;
  border: 1.13px solid #14d77c;
  border-radius: 107.01px;
  display: inline-flex;
  gap: 2.1px;
  padding: 0px 4px;
  margin-left: 4px;
`;

const PercentageValue = styled.div`
  color: #1dbf73;
  font-family: "Inter", sans-serif;
  font-size: 8.4px;
  font-weight: 600;
  letter-spacing: -0.17px;
  line-height: 11.2px;
  display: flex;
  align-items: center;
  gap: 2px;
`;

const AchievementCard = styled.div`
  backdrop-filter: blur(30.76px);
  background-color: #ffffff;
  border-radius: 13.98px;
  display: flex;
  flex-direction: column;
  height: 140px;
  justify-content: space-between;
  position: absolute;
  right: 20px;
  top: 20px;
  width: 110px;
  padding: 12px 8px;
`;

const AchievementContent = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

const AchievementIcon = styled.div`
  height: 42px;
  width: 42px;
  position: relative;
`;

const AchievementInfo = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`;

const AchievementLabel = styled.div`
  color: #969696;
  font-family: "Inter", sans-serif;
  font-size: 8.4px;
  font-weight: 500;
  text-align: center;
`;

const AchievementLevel = styled.div`
  color: #eab605;
  font-family: "Inter", sans-serif;
  font-size: 16.8px;
  font-weight: 700;
  text-align: center;
`;

const ScoreBoost = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1.4px;
  margin-bottom: 12px;
`;

const BoostValue = styled.div`
  color: #1dbf73;
  font-family: "Inter", sans-serif;
  font-size: 9.8px;
  font-weight: 700;
  line-height: 14px;
`;

const BoostLabel = styled.div`
  color: #969696;
  font-family: "Inter", sans-serif;
  font-size: 8.4px;
  font-weight: 400;
  line-height: 12.6px;
`;

const BoostButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const BoostButton = styled.button`
  align-items: center;
  background-color: #ff4923;
  border: none;
  border-radius: 19.4px;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  font-family: "Inter", sans-serif;
  font-size: 11.2px;
  font-weight: 700;
  gap: 0.78px;
  height: 25.22px;
  justify-content: center;
  letter-spacing: -0.22px;
  padding: 9.98px 7.76px;
  width: 90px;

  &:hover {
    background-color: #e63d1a;
  }
`;

const ScoreDisplay = styled.div`
  align-items: flex-end;
  display: inline-flex;
  gap: 2.8px;
  left: 53px;
  position: absolute;
  top: 72px;
`;

const ScoreNumber = styled.div`
  color: #ffffff;
  font-family: "Inter", sans-serif;
  font-size: 69.9px;
  font-weight: 400;
  letter-spacing: -6.29px;
  line-height: 69.9px;
  text-align: center;
  transition: all 2s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ScorePercent = styled.div`
  color: #ffffff;
  font-family: "Inter", sans-serif;
  font-size: 25.2px;
  font-weight: 400;
  letter-spacing: -2.27px;
  line-height: 40.5px;
  text-align: center;
`;

const StatusBar = styled.div`
  align-items: center;
  display: flex;
  gap: 7.94px;
  justify-content: center;
  left: 20px;
  position: absolute;
  bottom: 20px;
  width: 166px;
`;

const StatusBadge = styled.div<{ $dark?: boolean }>`
  backdrop-filter: blur(27.69px);
  background-color: ${props => props.$dark ? 'rgba(0, 0, 0, 0.7)' : '#f1f1f1'};
  border-radius: 12.58px;
  color: ${props => props.$dark ? '#ffffff' : '#f56e0d'};
  font-family: "Inter", sans-serif;
  font-size: 8.8px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 12.6px;
  padding: 2.52px 8px;
  text-align: center;
  flex: 1;
`;

interface IvyScoreCardProps {
  score: number;
  ivyScoreData?: IvyScoreData;
  assessmentData?: AssessmentData;
  isLoading?: boolean;
}

export const IvyScoreCard: React.FC<IvyScoreCardProps> = ({ 
  score, 
  ivyScoreData, 
  assessmentData, 
  isLoading = false 
}) => {
  const [currentScore, setCurrentScore] = useState(0);
  const [animate, setAnimate] = useState(false);

  // Calculate real score change from assessment data
  const calculateScoreChange = () => {
    if (!assessmentData) return 12; // Fallback
    
    // Check if all required properties exist
    const hasAllData = assessmentData.academic_performance?.overall_score !== undefined &&
                      assessmentData.extracurricular_engagement?.overall_score !== undefined &&
                      assessmentData.community_service?.overall_score !== undefined &&
                      assessmentData.personal_narrative?.overall_score !== undefined;
    
    if (!hasAllData) return 12; // Fallback if data is incomplete
    
    const currentScores = [
      assessmentData.academic_performance.overall_score,
      assessmentData.extracurricular_engagement.overall_score,
      assessmentData.community_service.overall_score,
      assessmentData.personal_narrative.overall_score
    ];
    
    const averageCurrent = currentScores.reduce((a, b) => a + b, 0) / currentScores.length;
    
    // Calculate trend from individual pillar trends
    const trends = [
      assessmentData.academic_performance.trend || 0,
      assessmentData.extracurricular_engagement.trend || 0,
      assessmentData.community_service.trend || 0,
      assessmentData.personal_narrative.trend || 0
    ];
    
    const averageTrend = trends.reduce((a, b) => a + b, 0) / trends.length;
    
    return Math.round(averageTrend * 10) / 10; // Round to 1 decimal
  };

  // Determine achievement level based on overall score
  const getAchievementLevel = () => {
    const overallScore = ivyScoreData?.overall_score || score;
    if (overallScore >= 90) return 'GOLD';
    if (overallScore >= 80) return 'SILVER';
    if (overallScore >= 70) return 'BRONZE';
    return 'BRONZE';
  };

  // Calculate score boost potential
  const calculateScoreBoost = () => {
    if (!assessmentData) return 6.6; // Fallback
    
    // Calculate potential improvement based on areas for growth
    const currentScores = [
      assessmentData.academic_performance.overall_score,
      assessmentData.extracurricular_engagement.overall_score,
      assessmentData.community_service.overall_score,
      assessmentData.personal_narrative.overall_score
    ];
    
    const minScore = Math.min(...currentScores);
    const maxPotential = 100 - minScore;
    
    // Realistic boost based on weakest area
    return Math.round((maxPotential * 0.3) * 10) / 10;
  };

  // Determine T20 level based on admission probability
  const getT20Level = () => {
    if (!assessmentData?.admission_probabilities) return 'SILVER';
    
    const tier1Prob = assessmentData.admission_probabilities.tier_1;
    if (tier1Prob >= 0.25) return 'GOLD';
    if (tier1Prob >= 0.15) return 'SILVER';
    return 'BRONZE';
  };

  const scoreChange = calculateScoreChange();
  const achievementLevel = getAchievementLevel();
  const scoreBoost = calculateScoreBoost();
  const t20Level = getT20Level();
  const isPositiveChange = scoreChange >= 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimate(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animate) {
      const duration = 2000;
      const steps = 60;
      const interval = duration / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        setCurrentScore(Math.round(score * progress));
        if (step === steps) clearInterval(timer);
      }, interval);

      return () => clearInterval(timer);
    }
  }, [animate, score]);

  return (
    <Container>
      <Title>Your Ivy+ Ready Score</Title>
      
      <ScoreIncrease>
        <ScoreText>Change vs last 180 days</ScoreText>
        <PercentageBadge>
          <PercentageValue>
            {isPositiveChange ? <ArrowUp size={7} /> : <ArrowDown size={7} />}
            {Math.abs(scoreChange)}%
          </PercentageValue>
        </PercentageBadge>
      </ScoreIncrease>

      <AchievementCard>
        <AchievementContent>
          <AchievementIcon>
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20.6075" cy="21.1915" r="18.1215" fill="white" stroke="url(#paint0_linear_12019_120111)" strokeWidth="4.83239"/>
              <path d="M21.4484 19.9223V23.0547C21.7816 20.3273 24.104 18.214 26.9196 18.214V24.4657C26.9196 27.5132 24.4502 29.9826 21.4027 29.9826V28.2024C17.3884 28.1763 14.1416 24.9165 14.1416 20.8989V12.6155C18.1755 12.6155 21.4484 15.8851 21.4484 19.9223Z" fill="url(#paint1_linear_12019_120111)"/>
              <path d="M20.6206 13.1399C21.474 12.6709 22.1754 11.9673 22.6417 11.1125C23.11 11.9659 23.8143 12.6677 24.669 13.1336C23.8151 13.6018 23.1135 14.3056 22.6479 15.1609C22.1794 14.3078 21.4753 13.6055 20.6206 13.1399Z" fill="url(#paint2_linear_12019_120111)"/>
              <defs>
                <linearGradient id="paint0_linear_12019_120111" x1="20.5476" y1="-19.2508" x2="-28.14" y2="46.6004" gradientUnits="userSpaceOnUse">
                  <stop offset="0.0416801" stopColor="#FFEEAA"/>
                  <stop offset="0.215011" stopColor="#F4D144"/>
                  <stop offset="0.667554" stopColor="#B5971E"/>
                  <stop offset="0.927172" stopColor="#D4B53B"/>
                </linearGradient>
                <linearGradient id="paint1_linear_12019_120111" x1="20.512" y1="4.19959" x2="-1.01917" y2="25.6259" gradientUnits="userSpaceOnUse">
                  <stop offset="0.0416801" stopColor="#FFEEAA"/>
                  <stop offset="0.215011" stopColor="#F4D144"/>
                  <stop offset="0.667554" stopColor="#B5971E"/>
                  <stop offset="0.927172" stopColor="#D4B53B"/>
                </linearGradient>
                <linearGradient id="paint2_linear_12019_120111" x1="22.6389" y1="9.15076" x2="17.8403" y2="15.6411" gradientUnits="userSpaceOnUse">
                  <stop offset="0.0416801" stopColor="#FFEEAA"/>
                  <stop offset="0.215011" stopColor="#F4D144"/>
                  <stop offset="0.667554" stopColor="#B5971E"/>
                  <stop offset="0.927172" stopColor="#D4B53B"/>
                </linearGradient>
              </defs>
            </svg>
          </AchievementIcon>

          <AchievementInfo>
            <AchievementLabel>Achieve</AchievementLabel>
            <AchievementLevel>{achievementLevel}</AchievementLevel>
          </AchievementInfo>

          <ScoreBoost>
            <BoostValue>{scoreBoost}%</BoostValue>
            <BoostLabel>score boost</BoostLabel>
          </ScoreBoost>
        </AchievementContent>

        <BoostButtonWrapper>
          <BoostButton>Boost Score</BoostButton>
        </BoostButtonWrapper>
      </AchievementCard>

      <ScoreDisplay>
        <ScoreNumber>{currentScore}</ScoreNumber>
        <ScorePercent>%</ScorePercent>
      </ScoreDisplay>

      <StatusBar>
        <StatusBadge>T20 LEVEL</StatusBadge>
        <StatusBadge $dark>{t20Level}</StatusBadge>
      </StatusBar>
    </Container>
  );
};