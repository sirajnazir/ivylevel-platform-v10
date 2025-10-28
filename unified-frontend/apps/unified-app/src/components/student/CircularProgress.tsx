import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { Target } from 'lucide-react';

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

const TargetIndicator = styled.div<{ $visible: boolean; $x: number; $y: number }>`
  position: absolute;
  top: ${props => props.$y}px;
  left: ${props => props.$x}px;
  transform: translate(-50%, -50%);
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
  background: #E8F5E9;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
  color: #2E7D32;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const IvyBadge = styled.div<{ $visible: boolean; $x: number; $y: number }>`
  background: #FFD700;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: #333;
  position: absolute;
  top: ${props => props.$y}px;
  left: ${props => props.$x}px;
  transform: translate(-50%, -50%);
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
const baseRings = [
  {
    name: 'Aptitude',
    size: 895,
    path: "M447.641 35.4554C546.276 35.4554 641.64 70.8292 716.415 135.153C791.19 199.476 840.416 288.484 855.155 386.011C869.894 483.538 849.167 583.117 796.739 666.665C744.311 750.212 663.659 812.186 569.429 841.332C475.199 870.479 373.641 864.865 283.198 825.51C192.754 786.155 119.424 715.668 76.5246 626.852C33.6247 538.035 24.0001 436.778 49.3986 341.47C74.7972 246.161 133.534 163.122 214.943 107.432",
    color: "#FFBB6D",
    strokeWidth: 69.8544,
    backgroundColor: "#E5E7EB",
  },
  {
    name: 'Passion',
    size: 1090,
    path: "M544.921 35.057C656.184 35.057 764.394 71.447 853.048 138.677C941.703 205.908 1005.94 300.289 1035.95 407.427C1065.97 514.565 1060.12 628.58 1019.3 732.084C978.477 835.588 904.923 922.901 809.855 980.707C714.787 1038.51 603.421 1063.64 492.742 1052.25C382.063 1040.87 278.144 993.598 196.835 917.649C115.525 841.7 61.2867 741.242 42.3912 631.595C23.4958 521.948 40.9802 409.13 92.1781 310.346",
    color: "#FF6E6D",
    strokeWidth: 69.8544,
    backgroundColor: "#E5E7EB",
  },
  {
    name: 'Service',
    size: 1287,
    path: "M643.643 35.852C772.734 35.852 898.472 76.958 1002.63 153.213C1106.8 229.467 1183.97 336.909 1222.97 459.967C1261.98 583.025 1260.78 715.306 1219.56 837.64C1178.34 959.973 1099.24 1066 993.716 1140.36C888.194 1214.72 761.734 1253.55 632.664 1251.22C503.594 1248.89 378.619 1205.52 275.852 1127.39C173.084 1049.27 97.8632 940.449 61.0898 816.707C24.3163 692.964 27.901 560.726 71.3243 439.158",
    color: "#55AAAA",
    strokeWidth: 69.8544,
    backgroundColor: "#E5E7EB",
  },
  {
    name: 'Identity',
    size: 1482,
    path: "M741.356 35.8817C888.312 35.8817 1031.6 81.7701 1151.22 167.141C1270.83 252.511 1360.8 373.102 1408.57 512.078C1456.34 651.053 1459.52 801.476 1417.67 942.346C1375.81 1083.22 1291.02 1207.5 1175.12 1297.85C1059.21 1388.2 917.993 1440.1 771.168 1446.31C624.344 1452.52 479.245 1412.73 356.128 1332.49C233.012 1252.25 138.024 1135.57 84.426 998.733C30.828 861.9 21.2951 711.746 57.1583 569.233",
    color: "#979797",
    strokeWidth: 69.8544,
    backgroundColor: "#E5E7EB",
  },
  {
    name: 'Ivy+ Score',
    size: 1750,
    path: "M875 50C1057.97 50 1235.74 110.822 1380.36 222.9C1524.98 334.978 1628.24 491.951 1673.9 669.129C1719.56 846.306 1705.02 1033.64 1632.58 1201.65C1560.14 1369.66 1433.9 1508.83 1273.72 1597.25C1113.54 1685.68 928.508 1718.35 747.732 1690.12C566.956 1661.9 400.692 1574.38 275.092 1441.33C149.492 1308.29 71.6828 1137.27 53.9041 955.165C36.1253 773.065 79.3854 590.221 176.88 435.394",
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
  const point = path.getPointAtLength(length * (1 - percentage));

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

            // T20 indicator at current score (85%)
            const sweepPercentage = score / 100;
            const currentPoint = calculatePointOnPath(outerRing.path, sweepPercentage);
            const currentX = (currentPoint.x * scale) + centerX;
            const currentY = (currentPoint.y * scale) + centerY;
            setFramePosition({ x: currentX, y: currentY });

            // Target Level / IVY+ at 100% mark
            const targetPoint = calculatePointOnPath(outerRing.path, 1.0);
            const targetX = (targetPoint.x * scale) + centerX;
            const targetY = (targetPoint.y * scale) + centerY;
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
          <span className="value">{ivyScoreData?.target_gap || 5}%</span>
          <span className="spacer">&nbsp;</span>
          <span className="label">to target</span>
        </TargetText>
        </TargetContainer>
      </T20Frame>

      <ProfileContainer>
        <ProfileImage src={profileImage} alt="Profile" />
      </ProfileContainer>

      <TargetIndicator
        $visible={showFrames}
        $x={targetPosition.x}
        $y={targetPosition.y}
      >
        <Target size={16} />
        Target Level
      </TargetIndicator>

      <IvyBadge
        $visible={showFrames}
        $x={targetPosition.x + 80}
        $y={targetPosition.y}
      >
        IVY+
      </IvyBadge>

      <ScoreDisplay>
        <div>
          <div className="score">{currentScore}%</div>
          <div className="label">Overall Score</div>
        </div>
      </ScoreDisplay>
    </ProgressContainer>
  );
};