import React from 'react';
import styled from 'styled-components';
import { TrendingUp, ArrowRight, Users } from 'lucide-react';

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
  color: #55AAAA;
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
  background-color: #55AAAA;
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
  background-color: #CCE6E6;
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
  color: #55AAAA;
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
    background-color: rgba(85, 170, 170, 0.1);
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
  color: #4CAF50;
  font-size: 7.7px;
  font-weight: 500;
`;

const ScoreStatus = styled.div`
  color: #666;
  font-size: 6.6px;
  margin-top: 2px;
`;

export const ServiceCard = () => {
  return (
    <Container>
      <HeaderContainer>
        <HeaderContent>
          <HeaderTitle>Community Leader</HeaderTitle>
          <ScoreContainer>
            <ScoreValue>+4.32%</ScoreValue>
            <ScoreLabel>score last month</ScoreLabel>
          </ScoreContainer>
        </HeaderContent>
        <PercentageBadge>81%</PercentageBadge>
      </HeaderContainer>

      <ChartContainer>
        <svg height="107" width="185" fill="none" viewBox="0 0 185 107" xmlns="http://www.w3.org/2000/svg">
          {/* Service shape */}
          <path 
            d="M133.489 34.8629C133.489 45.9405 124.503 54.9239 113.415 54.9239C107.822 54.9239 102.761 52.637 99.1178 48.9462C102.255 44.4116 104.09 38.9184 104.09 33.0032C104.09 28.0857 102.821 23.4572 100.588 19.4278C104.064 16.5367 108.536 14.7994 113.415 14.7994C124.501 14.7994 133.489 23.7802 133.489 34.8629Z" 
            fill="#CCE6E6"
          />

          {/* Clip path for the service shape */}
          <defs>
            <clipPath id="serviceClip">
              <path 
                d="M133.489 34.8629C133.489 45.9405 124.503 54.9239 113.415 54.9239C107.822 54.9239 102.761 52.637 99.1178 48.9462C102.255 44.4116 104.09 38.9184 104.09 33.0032C104.09 28.0857 102.821 23.4572 100.588 19.4278C104.064 16.5367 108.536 14.7994 113.415 14.7994C124.501 14.7994 133.489 23.7802 133.489 34.8629Z"
              />
            </clipPath>
          </defs>

          {/* 50% fill mask */}
          <mask id="serviceFillMask">
            <rect x="0" y="53.5" width="185" height="53.5" fill="white" />
          </mask>

          {/* Waves with both clip path and mask */}
          <g clipPath="url(#serviceClip)" mask="url(#serviceFillMask)">
            {/* Wave 1 */}
            <path fill="#55AAAA" opacity="0.3">
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
            <path fill="#55AAAA" opacity="0.5">
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
            <path fill="#55AAAA" opacity="0.7">
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
          <Users size={8} />
          Service Score
        </ScoreTitle>
        <ScoreStatus>Your score is: Average</ScoreStatus>
      </ScoreSection>

      <BoostContainer>
        <IconContainer>
          <TrendingUp size={13.23} color="#55AAAA" />
        </IconContainer>
        <BoostContent>
          <BoostTitle>Boost Service Impact</BoostTitle>
          <ScoreContainer>
            <ScoreValue>+8%</ScoreValue>
            <ScoreLabel>in 6 months</ScoreLabel>
          </ScoreContainer>
        </BoostContent>
        <ArrowContainer>
          <ArrowRight size={13.23} color="#55AAAA" />
        </ArrowContainer>
      </BoostContainer>
    </Container>
  );
};