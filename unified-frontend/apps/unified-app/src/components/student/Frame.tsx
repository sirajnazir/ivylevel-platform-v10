import React from "react";
import styled from "styled-components";

const FrameContainer = styled.div`
  align-items: center;
  display: flex;
  gap: 9.78px;
  height: 34.22px;
  position: absolute;
  width: 110.36px;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
`;

const CircleContainer = styled.div`
  align-items: center;
  background-color: #ff4923;
  border-radius: 24.44px;
  display: flex;
  flex-direction: column;
  height: 34.22px;
  justify-content: center;
  padding: 8.56px;
  position: relative;
  width: 34.22px;
`;

const CircleText = styled.div`
  color: #ffffff;
  font-family: "Inter", sans-serif;
  font-size: 12.2px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 14.7px;
  margin-left: -3.44px;
  margin-right: -3.44px;
  position: relative;
  white-space: nowrap;
  width: fit-content;
`;

const TargetContainer = styled.div`
  align-items: center;
  background-color: #f4f3f2;
  border-radius: 24.44px;
  display: flex;
  gap: 7.33px;
  height: 28.6px;
  justify-content: center;
  padding: 11.13px 7.2px 9.78px 6.55px;
  position: relative;
  width: 66.36px;
`;

const TargetText = styled.p`
  font-family: "Inter", sans-serif;
  font-size: 8.7px;
  line-height: 14.7px;
  margin: -4.70px 0 -2.61px;
  position: relative;
  white-space: nowrap;
  width: fit-content;

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

export const Frame = () => {
  return (
    <FrameContainer>
      <CircleContainer>
        <CircleText>T20</CircleText>
      </CircleContainer>

      <TargetContainer>
        <TargetText>
          <span className="value">5%</span>
          <span className="spacer">&nbsp;</span>
          <span className="label">to target</span>
        </TargetText>
      </TargetContainer>
    </FrameContainer>
  );
};