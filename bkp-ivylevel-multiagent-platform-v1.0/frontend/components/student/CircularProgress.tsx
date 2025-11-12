import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';

const ProgressContainer = styled.div`
  position: relative;
  width: 500px;
  height: 500px;
  margin: 40px auto;
`;

const SVGContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RingWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FrameContainer = styled.div<{ $visible: boolean; $x: number; $y: number }>`
  position: absolute;
  top: ${props => props.$y}px;
  left: ${props => props.$x}px;
  transform: translate(-50%, -50%);
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
  z-index: 20;
`;

const TargetFrameBackground = styled.div<{ $visible: boolean; $x: number; $y: number }>`
  position: absolute;
  top: ${props => props.$y}px;
  left: ${props => props.$x}px;
  transform: translate(-50%, -50%);
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
  z-index: 20;
`;

const T20Frame = styled.div<{ $visible: boolean; $x: number; $y: number }>`
  position: absolute;
  top: ${props => props.$y}px;
  left: ${props => props.$x}px;
  transform: translate(-50%, -50%);
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
  z-index: 21;
  display: flex;
  gap: 9.78px;
  height: 34.22px;
  width: 110.36px;
`;

const CircleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ff4923;
  border-radius: 50%;
  width: 34.22px;
  height: 34.22px;
  min-width: 34.22px;
  min-height: 34.22px;
  flex-shrink: 0;
`;

const CircleText = styled.div`
  color: #ffffff;
  font-family: "Inter", sans-serif;
  font-size: 12.2px;
  font-weight: 500;
  line-height: 12.2px;
  text-align: center;
`;

const TargetContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f4f3f2;
  border-radius: 24.44px;
  height: 28.6px;
  width: 66.36px;
  padding: 0 8px;
  position: relative;
  top: 2.25px;
`;

const TargetText = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 8.7px;
  line-height: 8.7px;
  margin: 0;
  white-space: nowrap;

  span.value {
    color: #020202;
    font-weight: 500;
  }

  span.spacer {
    color: #ff7224;
    font-weight: 500;
  }

  span.label {
    color: #616479;
    font-weight: 400;
  }
`;

const ProfileContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 10;
`;

const ProfileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// Target/IVY+ frame styled components (matching T20Frame design)
const TargetFrame = styled.div<{ $visible: boolean; $x: number; $y: number }>`
  position: absolute;
  top: ${props => props.$y}px;
  left: ${props => props.$x}px;
  transform: translate(-50%, -50%);
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
  z-index: 21;
  display: flex;
  gap: 9.78px;
  height: 34.22px;
  width: 125px;
`;

const TargetCircleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #16a34a;
  border-radius: 50%;
  width: 34.22px;
  height: 34.22px;
  min-width: 34.22px;
  min-height: 34.22px;
  flex-shrink: 0;
`;

const TargetCircleText = styled.div`
  color: white;
  font-family: "Inter", sans-serif;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  text-align: center;
`;

const TargetTextContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f4f3f2;
  border-radius: 24.44px;
  height: 28.6px;
  flex: 1;
  padding: 0 8px;
  position: relative;
  top: 2.25px;
`;

const TargetLabel = styled.div`
  color: #16a34a;
  font-family: "Inter", sans-serif;
  font-size: 8.5px;
  font-weight: 600;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
`;

const ScoreDisplay = styled.div`
  position: absolute;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #FF5733 0%, #FF7043 100%);
  color: white;
  padding: 16px 32px;
  border-radius: 16px;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 24px;
  z-index: 10;
  box-shadow: 0 4px 20px rgba(255, 87, 51, 0.2);

  .score {
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
  }

  .label {
    font-size: 14px;
    opacity: 0.8;
  }
`;

import { PillarScores, IvyScoreData } from '../../types/dashboard';

interface CircularProgressProps {
  score: number;
  profileImage: string;
  pillarScores?: PillarScores;
  ivyScoreData?: IvyScoreData;
  isLoading?: boolean;
}

// Base ring configuration with paths and styling
// CLOCKWISE paths: 359.5° arcs (12:00 to 11:59)  for accurate percentage representation
// 85% score = 306° (10:12), 90% score = 324° (10:48), 100% score = 359.5° (11:59)
const baseRings = [
  {
    name: 'Aptitude',
    size: 895,
    path: "M 447.50 35.00 A 412.5 412.5 0 1 1 443.90 35.02",
    color: "#FFBB6D",
    strokeWidth: 69.8544,
    backgroundColor: "#E5E7EB",
  },
  {
    name: 'Passion',
    size: 1090,
    path: "M 545.00 35.00 A 510 510 0 1 1 540.55 35.02",
    color: "#FF6E6D",
    strokeWidth: 69.8544,
    backgroundColor: "#E5E7EB",
  },
  {
    name: 'Service',
    size: 1287,
    path: "M 643.50 35.00 A 608.5 608.5 0 1 1 638.19 35.02",
    color: "#55AAAA",
    strokeWidth: 69.8544,
    backgroundColor: "#E5E7EB",
  },
  {
    name: 'Identity',
    size: 1482,
    path: "M 741.00 35.00 A 706 706 0 1 1 734.84 35.03",
    color: "#979797",
    strokeWidth: 69.8544,
    backgroundColor: "#E5E7EB",
  },
  {
    name: 'Ivy+ Score',
    size: 1750,
    path: "M 875.00 50.00 A 825 825 0 1 1 867.80 50.03",
    // Special: gradient layer goes from 6:00 (180°) to current score
    gradientPath: "M 875.00 875.00 A 825 825 0 0 1 207.56 340.08", // 6:00 to 10:12 (85%)
    strokeWidth: 100,
    backgroundColor: "#E5E7EB",
  },
];

// Function to create rings with dynamic scores
const createRingsWithScores = (pillarScores?: PillarScores, overallScore?: number) => {
  return baseRings.map((baseRing, index) => {
    let score = 0;
    
    if (index < 4) {
      // Pillar rings (Aptitude, Passion, Service, Identity)
      const pillarNames = ['aptitude', 'passion', 'service', 'identity'] as const;
      const pillarName = pillarNames[index];
      score = pillarScores?.[pillarName]?.score || baseRing.score || 0;
    } else {
      // Ivy+ Score ring
      score = overallScore || 87;
    }
    
    return {
      ...baseRing,
      score: Math.round(score)
    };
  });
};

const calculatePointOnPath = (pathD: string, percentage: number): { x: number, y: number } => {
  const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  tempSvg.appendChild(path);
  document.body.appendChild(tempSvg);

  const length = path.getTotalLength();

  // CLOCKWISE paths: percentage maps directly to visual angle
  // 0% = 12:00, 25% = 3:00, 50% = 6:00, 75% = 9:00, 85% = 10:12, 90% = 10:48
  const point = path.getPointAtLength(length * percentage);

  console.log(`[calculatePointOnPath] percentage=${percentage}, length=${length}, position=${length * percentage}, point=(${point.x}, ${point.y})`);

  document.body.removeChild(tempSvg);

  return { x: point.x, y: point.y };
};

export const CircularProgress: React.FC<CircularProgressProps> = ({ 
  score, 
  profileImage, 
  pillarScores, 
  ivyScoreData, 
  isLoading = false 
}) => {
  const [animate, setAnimate] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [showFrames, setShowFrames] = useState(false);
  const [framePosition, setFramePosition] = useState({ x: 0, y: 0 });
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Create rings with dynamic scores
  const rings = createRingsWithScores(pillarScores, ivyScoreData?.overall_score || score);
  
  // Calculate overall score from pillar scores if available
  const overallScore = pillarScores ?
    Math.round((pillarScores.aptitude.score + pillarScores.passion.score +
                pillarScores.service.score + pillarScores.identity.score) / 4) :
    score;

  // Calculate dynamic target gap (Target IVY+ level is 90%)
  // Use the actual displayed overall score for accurate calculation
  const TARGET_IVY_LEVEL = 90;
  const displayedScore = ivyScoreData?.overall_score || overallScore;
  const calculatedTargetGap = Math.max(0, TARGET_IVY_LEVEL - displayedScore);

  // Always use calculated value for accuracy (ignore potentially stale ivyScoreData.target_gap)
  const targetGap = calculatedTargetGap;

  console.log('[CircularProgress] Target gap calculation:', {
    propsScore: score,
    overallScore,
    displayedScore,
    targetLevel: TARGET_IVY_LEVEL,
    calculatedGap: calculatedTargetGap,
    ivyScoreDataGap: ivyScoreData?.target_gap,
    finalTargetGap: targetGap
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimate(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animate && containerRef.current) {
      const duration = 2000;
      const steps = 60;
      const interval = duration / steps;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        setCurrentScore(Math.round(score * progress));
        
        if (step === steps) {
          clearInterval(timer);
          setTimeout(() => {
            const outerRing = rings[rings.length - 1];

            const scale = 0.28;
            const containerWidth = containerRef.current?.offsetWidth || 500;
            const containerHeight = containerRef.current?.offsetHeight || 500;
            const centerX = containerWidth / 2;
            const centerY = containerHeight / 2;

            // Corrected paths now cover 359.5° (almost full circle)
            // strokeDashoffset animation: dashoffset = (1 - score/100)
            //   - For 85%: dashoffset = 0.15, shows 85% of path (from 0 to 0.85)
            //   - For 90%: dashoffset = 0.10, shows 90% of path (from 0 to 0.90)
            //   - For 100%: dashoffset = 0, shows 100% of path (full arc)
            //
            // Now score percentages map directly to clock positions:
            //   85% → 85% of 360° = 306° = 10:12 o'clock
            //   90% → 90% of 360° = 324° = 10:48 o'clock
            //   100% → 100% of 359.5° = 11:59 o'clock

            // SVG coordinate system: viewBox is 1750x1750, center at (875, 875)
            // We scale down by 0.28 and center in the container
            const svgCenterX = outerRing.size / 2; // 875
            const svgCenterY = outerRing.size / 2; // 875

            // T20 indicator at current score (85%)
            // Position at 85% along the path
            const scorePercentage = score / 100; // 0.85
            const currentPoint = calculatePointOnPath(outerRing.path, scorePercentage);

            // Transform: (SVG coords - SVG center) * scale + screen center
            // Add offset to align T20 circle center with ring tip (shift right by ~30px)
            const currentX = ((currentPoint.x - svgCenterX) * scale) + centerX + 30;
            const currentY = ((currentPoint.y - svgCenterY) * scale) + centerY;

            console.log('[CircularProgress] T20 at 85%:', {
              scorePercentage,
              svgPoint: currentPoint,
              svgCenter: { x: svgCenterX, y: svgCenterY },
              scale,
              screenCenter: { x: centerX, y: centerY },
              screenX: currentX,
              screenY: currentY,
              offset: '+30px right'
            });

            setFramePosition({ x: currentX, y: currentY });

            // Target Level (IVY+) at 90% mark
            // Position at 90% along the path (10:48 o'clock)
            const targetPercentage = 0.90; // IVY+ target is 90%
            const targetPoint = calculatePointOnPath(outerRing.path, targetPercentage);

            // Transform: (SVG coords - SVG center) * scale + screen center
            // Add offset to move further right (shift right by ~30px)
            const targetX = ((targetPoint.x - svgCenterX) * scale) + centerX + 30;
            const targetY = ((targetPoint.y - svgCenterY) * scale) + centerY;

            console.log('[CircularProgress] Target at 90%:', {
              targetPercentage,
              svgPoint: targetPoint,
              svgCenter: { x: svgCenterX, y: svgCenterY },
              screenX: targetX,
              screenY: targetY,
              offset: '+30px right'
            });

            setTargetPosition({ x: targetX, y: targetY });

            setShowFrames(true);
          }, 200);
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [animate, score]);

  return (
    <ProgressContainer ref={containerRef}>
      <SVGContainer>
        {rings.map((ring, index) => {
          const pathLength = animate ? ring.score / 100 : 0;
          const scale = 0.28;
          
          return (
            <RingWrapper key={ring.name}>
              <svg
                width={ring.size}
                height={ring.size}
                viewBox={`0 0 ${ring.size} ${ring.size}`}
                style={{
                  transform: `scale(${scale})`,
                  position: 'absolute',
                }}
              >
                {ring.name === 'Ivy+ Score' && (
                  <defs>
                    <linearGradient id="paint0_linear_12076_3953" x1="-2642.5" y1="348.5" x2="2036" y2="73.5" gradientUnits="userSpaceOnUse">
                      <stop offset="0.597383" stopColor="#FF4A23"/>
                      <stop offset="0.633939" stopColor="#FF7224" stopOpacity="0.7"/>
                      <stop offset="0.665651" stopColor="#FF7224" stopOpacity="0.4"/>
                      <stop offset="0.721742" stopColor="white" stopOpacity="0.85"/>
                      <stop offset="0.766116" stopColor="white"/>
                      <stop offset="0.837615" stopColor="white"/>
                    </linearGradient>
                  </defs>
                )}

                <path
                  d={ring.path}
                  stroke={ring.backgroundColor}
                  strokeWidth={ring.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />

                <path
                  d={ring.path}
                  stroke={ring.name === 'Ivy+ Score' ? 'url(#paint0_linear_12076_3953)' : ring.color}
                  strokeWidth={ring.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  style={{
                    strokeDasharray: '1',
                    strokeDashoffset: 1 - pathLength,
                    transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  pathLength="1"
                />
              </svg>
            </RingWrapper>
          );
        })}
      </SVGContainer>

      <FrameContainer 
        $visible={showFrames} 
        $x={framePosition.x} 
        $y={framePosition.y}
      >
        <svg width="118" height="43" viewBox="0 0 118 43" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M0.936035 21.326C0.936035 9.85122 10.2382 0.549072 21.713 0.549072H22.4757C29.629 0.549072 35.938 4.16411 39.6754 9.66694C40.894 11.4611 42.8088 12.771 44.9776 12.771C46.9471 12.771 48.716 11.6741 50.0005 10.1812C53.1431 6.52837 57.7994 4.21525 62.996 4.21525H100.543C110.007 4.21525 117.679 11.8874 117.679 21.3514C117.679 30.8154 110.007 38.4876 100.543 38.4876H62.996C57.776 38.4876 53.1011 36.1535 49.958 32.4721C48.6828 30.9784 46.9197 29.8814 44.9556 29.8814C42.8 29.8814 40.8967 31.1829 39.6875 32.9673C35.9516 38.4801 29.6367 42.1029 22.4757 42.1029H21.713C10.2382 42.1029 0.936035 32.8008 0.936035 21.326Z" fill="white"/>
        </svg>
      </FrameContainer>

      <T20Frame 
        $visible={showFrames}
        $x={framePosition.x}
        $y={framePosition.y}
      >
        <CircleContainer>
          <CircleText>T20</CircleText>
        </CircleContainer>
        <TargetContainer>
          <TargetText>
            <span className="value">{targetGap}%</span>
            <span className="spacer">&nbsp;</span>
            <span className="label">to target</span>
          </TargetText>
        </TargetContainer>
      </T20Frame>

      <ProfileContainer>
        <ProfileImage src={profileImage} alt="Profile" />
      </ProfileContainer>

      <TargetFrameBackground
        $visible={showFrames}
        $x={targetPosition.x}
        $y={targetPosition.y}
      >
        <svg width="133" height="43" viewBox="0 0 133 43" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M0.936035 21.326C0.936035 9.85122 10.2382 0.549072 21.713 0.549072H22.4757C29.629 0.549072 35.938 4.16411 39.6754 9.66694C40.894 11.4611 42.8088 12.771 44.9776 12.771C46.9471 12.771 48.716 11.6741 50.0005 10.1812C53.1431 6.52837 57.7994 4.21525 62.996 4.21525H115.543C125.007 4.21525 132.679 11.8874 132.679 21.3514C132.679 30.8154 125.007 38.4876 115.543 38.4876H62.996C57.776 38.4876 53.1011 36.1535 49.958 32.4721C48.6828 30.9784 46.9197 29.8814 44.9556 29.8814C42.8 29.8814 40.8967 31.1829 39.6875 32.9673C35.9516 38.4801 29.6367 42.1029 22.4757 42.1029H21.713C10.2382 42.1029 0.936035 32.8008 0.936035 21.326Z" fill="white"/>
        </svg>
      </TargetFrameBackground>

      <TargetFrame
        $visible={showFrames}
        $x={targetPosition.x}
        $y={targetPosition.y}
      >
        <TargetCircleContainer>
          <TargetCircleText>IVY+</TargetCircleText>
        </TargetCircleContainer>
        <TargetTextContainer>
          <TargetLabel>Target Level</TargetLabel>
        </TargetTextContainer>
      </TargetFrame>

      <ScoreDisplay>
        <div>
          <div className="score">{currentScore}%</div>
          <div className="label">Overall Score</div>
        </div>
      </ScoreDisplay>
    </ProgressContainer>
  );
};