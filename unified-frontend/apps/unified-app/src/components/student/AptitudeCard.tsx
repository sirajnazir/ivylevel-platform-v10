import React from 'react';
import styled from 'styled-components';
import { TrendingUp, ArrowRight, Star } from 'lucide-react';

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
  color: #1dbf73;
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
  background-color: #1dbf73;
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
  background-color: #ffe6e0;
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
  color: #ff4923;
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
    background-color: rgba(255, 73, 35, 0.1);
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
  color: #FFC107;
  font-size: 7.7px;
  font-weight: 500;
`;

const ScoreStatus = styled.div`
  color: #666;
  font-size: 6.6px;
  margin-top: 2px;
`;

export const AptitudeCard = () => {
  return (
    <Container>
      <HeaderContainer>
        <HeaderContent>
          <HeaderTitle>STEM Enthusiast</HeaderTitle>
          <ScoreContainer>
            <ScoreValue>+5.08%</ScoreValue>
            <ScoreLabel>score last month</ScoreLabel>
          </ScoreContainer>
        </HeaderContent>
        <PercentageBadge>96%</PercentageBadge>
      </HeaderContainer>

      <ChartContainer>
        <svg height="107" width="187" fill="none" viewBox="0 0 187 107" xmlns="http://www.w3.org/2000/svg">
          {/* Star shape */}
          <path 
            d="M121.686 64.5239C120.469 65.713 119.915 67.4234 120.206 69.0989L120.874 72.9689L124.173 92.0603C124.902 96.2793 120.476 99.5047 116.681 97.515L96.0304 86.6964C94.5239 85.9052 92.7241 85.9098 91.22 86.701L70.5954 97.5662C66.8049 99.5628 62.3694 96.3491 63.0911 92.1301L67.0051 69.1571C67.2915 67.4816 66.7327 65.7735 65.5103 64.5867L48.7974 48.3413C45.7286 45.3557 47.412 40.1453 51.6543 39.524L74.7213 36.1474C76.407 35.9007 77.8576 34.8419 78.6096 33.3153L88.9033 12.4088C90.7962 8.56677 96.2725 8.55978 98.1748 12.3971L108.52 33.2827C109.274 34.807 110.732 35.8612 112.413 36.1032L135.491 39.4263C139.734 40.036 141.431 45.244 138.364 48.2343L121.689 64.5192L121.686 64.5239Z" 
            fill="#FFEBD3"
          />

          {/* Clip path for the star */}
          <defs>
            <clipPath id="starClip">
              <path 
                d="M121.686 64.5239C120.469 65.713 119.915 67.4234 120.206 69.0989L120.874 72.9689L124.173 92.0603C124.902 96.2793 120.476 99.5047 116.681 97.515L96.0304 86.6964C94.5239 85.9052 92.7241 85.9098 91.22 86.701L70.5954 97.5662C66.8049 99.5628 62.3694 96.3491 63.0911 92.1301L67.0051 69.1571C67.2915 67.4816 66.7327 65.7735 65.5103 64.5867L48.7974 48.3413C45.7286 45.3557 47.412 40.1453 51.6543 39.524L74.7213 36.1474C76.407 35.9007 77.8576 34.8419 78.6096 33.3153L88.9033 12.4088C90.7962 8.56677 96.2725 8.55978 98.1748 12.3971L108.52 33.2827C109.274 34.807 110.732 35.8612 112.413 36.1032L135.491 39.4263C139.734 40.036 141.431 45.244 138.364 48.2343L121.689 64.5192L121.686 64.5239Z"
              />
            </clipPath>
          </defs>

          {/* 50% fill mask */}
          <mask id="fillMask">
            <rect x="0" y="53.5" width="187" height="53.5" fill="white" />
          </mask>

          {/* Waves with both clip path and mask */}
          <g clipPath="url(#starClip)" mask="url(#fillMask)">
            {/* Wave 1 */}
            <path fill="#FFBB6D" opacity="0.3">
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
            <path fill="#FFBB6D" opacity="0.5">
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
            <path fill="#FFBB6D" opacity="0.7">
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
          <Star size={8} />
          Aptitude Score
        </ScoreTitle>
        <ScoreStatus>Your score is: Strong</ScoreStatus>
      </ScoreSection>

      <BoostContainer>
        <IconContainer>
          <TrendingUp size={13.23} color="#FF4923" />
        </IconContainer>
        <BoostContent>
          <BoostTitle>Boost Aptitude Strength</BoostTitle>
          <ScoreContainer>
            <ScoreValue>+6%</ScoreValue>
            <ScoreLabel>in 6 months</ScoreLabel>
          </ScoreContainer>
        </BoostContent>
        <ArrowContainer>
          <ArrowRight size={13.23} color="#FF4923" />
        </ArrowContainer>
      </BoostContainer>
    </Container>
  );
};