import React from 'react';
import styled from 'styled-components';
import { TrendingUp, ArrowRight, Heart } from 'lucide-react';

const Container = styled.div`
  border: 1.1px solid #f4f3f2;
  border-radius: 8.82px;
  height: 203px;
  overflow: hidden;
  position: relative;
  width: 244px;
  background: white;
`;

const HeaderContainer = styled.div`
  align-items: center;
  display: flex;
  gap: 8.82px;
  padding: 9px;
  width: calc(100% - 18px);
`;

const HeaderContent = styled.div`
  align-items: flex-start;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2.21px;
  justify-content: center;
`;

const HeaderTitle = styled.div`
  color: #020202;
  font-family: "Inter", sans-serif;
  font-size: 8.8px;
  font-weight: 500;
  line-height: 11px;
  margin-top: -0.55px;
`;

const ScoreContainer = styled.div`
  align-items: center;
  display: flex;
  gap: 2.21px;
  width: 100%;
`;

const ScoreValue = styled.div`
  color: #FF6E6D;
  font-family: "Inter", sans-serif;
  font-size: 6.6px;
  font-weight: 600;
  line-height: 8.8px;
  margin-top: -0.55px;
  white-space: nowrap;
`;

const ScoreLabel = styled.div`
  color: #616479;
  font-family: "Inter", sans-serif;
  font-size: 6.6px;
  font-weight: 400;
  line-height: 8.8px;
  margin-top: -0.55px;
  white-space: nowrap;
`;

const PercentageBadge = styled.div`
  align-items: center;
  background-color: #FF6E6D;
  border-radius: 22.05px;
  color: white;
  display: inline-flex;
  font-family: "Inter", sans-serif;
  font-size: 8.8px;
  font-weight: 500;
  gap: 2.21px;
  justify-content: center;
  line-height: 13.2px;
  padding: 2.21px 7.72px;
  white-space: nowrap;
`;

const ChartContainer = styled.div`
  height: 106px;
  left: 29px;
  position: absolute;
  top: 44px;
  width: 186px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BoostContainer = styled.div`
  align-items: center;
  background-color: #FFD4D3;
  border-radius: 6.62px;
  display: flex;
  gap: 8.82px;
  left: 9px;
  padding: 2.21px 2.21px 2.21px 4.7px;
  position: absolute;
  bottom: 13px;
  width: calc(100% - 20px);
`;

const IconContainer = styled.div`
  align-items: center;
  background-color: white;
  border-radius: 4.41px;
  display: flex;
  height: 26.46px;
  justify-content: center;
  padding: 4.41px;
  width: 26.46px;
`;

const BoostContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2.21px;
`;

const BoostTitle = styled.div`
  color: #FF6E6D;
  font-family: "Inter", sans-serif;
  font-size: 7.7px;
  font-weight: 500;
  line-height: 11px;
  margin-top: -0.55px;
`;

const ArrowContainer = styled.div`
  align-items: center;
  border-radius: 4.41px;
  display: flex;
  height: 26.46px;
  justify-content: center;
  padding: 4.41px;
  width: 26.46px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 110, 109, 0.1);
  }
`;

const ScoreSection = styled.div`
  margin-top: 8px;
  padding: 0 8px;
`;

const ScoreTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #FF5733;
  font-size: 7.7px;
  font-weight: 500;
`;

const ScoreStatus = styled.div`
  color: #666;
  font-size: 6.6px;
  margin-top: 2px;
`;

export const PassionCard = () => {
  return (
    <Container>
      <HeaderContainer>
        <HeaderContent>
          <HeaderTitle>Passion Explorer</HeaderTitle>
          <ScoreContainer>
            <ScoreValue>+4.12%</ScoreValue>
            <ScoreLabel>score last month</ScoreLabel>
          </ScoreContainer>
        </HeaderContent>
        <PercentageBadge>83%</PercentageBadge>
      </HeaderContainer>

      <ChartContainer>
        <svg height="107" width="187" fill="none" viewBox="0 0 187 107" xmlns="http://www.w3.org/2000/svg">
          {/* Passion shape */}
          <path 
            d="M142.627 42.1816C142.464 45.0132 141.931 47.7854 141.099 50.4932C132.845 77.3165 94.9844 97.3182 93.4985 98.0954V98.1202C93.4985 98.1202 93.491 98.1152 93.4762 98.1078C93.4613 98.1128 93.4539 98.1202 93.4539 98.1202V98.0954C92.2429 97.4643 67.0865 84.1751 53.233 64.854C49.6866 59.9062 46.8832 54.5648 45.4072 48.9413C44.4513 45.3102 44.0575 41.5603 44.372 37.7238C47.2175 3.34389 82.265 4.14089 93.4762 19.4423C104.687 4.14089 139.735 3.34141 142.578 37.7214C142.702 39.2238 142.719 40.7089 142.627 42.1816Z" 
            fill="#FFD4D3"
          />

          {/* Clip path for the passion shape */}
          <defs>
            <clipPath id="passionClip">
              <path 
                d="M142.627 42.1816C142.464 45.0132 141.931 47.7854 141.099 50.4932C132.845 77.3165 94.9844 97.3182 93.4985 98.0954V98.1202C93.4985 98.1202 93.491 98.1152 93.4762 98.1078C93.4613 98.1128 93.4539 98.1202 93.4539 98.1202V98.0954C92.2429 97.4643 67.0865 84.1751 53.233 64.854C49.6866 59.9062 46.8832 54.5648 45.4072 48.9413C44.4513 45.3102 44.0575 41.5603 44.372 37.7238C47.2175 3.34389 82.265 4.14089 93.4762 19.4423C104.687 4.14089 139.735 3.34141 142.578 37.7214C142.702 39.2238 142.719 40.7089 142.627 42.1816Z"
              />
            </clipPath>
          </defs>

          {/* 50% fill mask */}
          <mask id="passionFillMask">
            <rect x="0" y="53.5" width="187" height="53.5" fill="white" />
          </mask>

          {/* Waves with both clip path and mask */}
          <g clipPath="url(#passionClip)" mask="url(#passionFillMask)">
            {/* Wave 1 */}
            <path fill="#FF6E6D" opacity="0.3">
              <animate
                attributeName="d"
                dur="3s"
                repeatCount="indefinite"
                values="
                  M-30 53.5 Q15.75 43.5, 46.75 53.5 T123.5 53.5 T200.25 53.5 T277 53.5 V107 H-30Z;
                  M-30 53.5 Q15.75 63.5, 46.75 53.5 T123.5 63.5 T200.25 53.5 T277 63.5 V107 H-30Z;
                  M-30 53.5 Q15.75 43.5, 46.75 53.5 T123.5 53.5 T200.25 53.5 T277 53.5 V107 H-30Z"
              />
            </path>

            {/* Wave 2 */}
            <path fill="#FF6E6D" opacity="0.5">
              <animate
                attributeName="d"
                dur="3s"
                begin="-1s"
                repeatCount="indefinite"
                values="
                  M-30 58.5 Q15.75 48.5, 46.75 58.5 T123.5 58.5 T200.25 58.5 T277 58.5 V107 H-30Z;
                  M-30 58.5 Q15.75 68.5, 46.75 58.5 T123.5 68.5 T200.25 58.5 T277 68.5 V107 H-30Z;
                  M-30 58.5 Q15.75 48.5, 46.75 58.5 T123.5 58.5 T200.25 58.5 T277 58.5 V107 H-30Z"
              />
            </path>

            {/* Wave 3 */}
            <path fill="#FF6E6D" opacity="0.7">
              <animate
                attributeName="d"
                dur="3s"
                begin="-2s"
                repeatCount="indefinite"
                values="
                  M-30 63.5 Q15.75 53.5, 46.75 63.5 T123.5 63.5 T200.25 63.5 T277 63.5 V107 H-30Z;
                  M-30 63.5 Q15.75 73.5, 46.75 63.5 T123.5 73.5 T200.25 63.5 T277 73.5 V107 H-30Z;
                  M-30 63.5 Q15.75 53.5, 46.75 63.5 T123.5 63.5 T200.25 63.5 T277 63.5 V107 H-30Z"
              />
            </path>
          </g>
        </svg>
      </ChartContainer>

      <ScoreSection>
        <ScoreTitle>
          <Heart size={8} />
          Passion Score
        </ScoreTitle>
        <ScoreStatus>Your score is: Average</ScoreStatus>
      </ScoreSection>

      <BoostContainer>
        <IconContainer>
          <TrendingUp size={13.23} color="#FF6E6D" />
        </IconContainer>
        <BoostContent>
          <BoostTitle>Boost Passion Growth</BoostTitle>
          <ScoreContainer>
            <ScoreValue>+7%</ScoreValue>
            <ScoreLabel>in 6 months</ScoreLabel>
          </ScoreContainer>
        </BoostContent>
        <ArrowContainer>
          <ArrowRight size={13.23} color="#FF6E6D" />
        </ArrowContainer>
      </BoostContainer>
    </Container>
  );
};