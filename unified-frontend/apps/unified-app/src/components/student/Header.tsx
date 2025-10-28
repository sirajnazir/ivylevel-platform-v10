import React from 'react';
import styled from 'styled-components';
import { Search, Bell, Flame } from 'lucide-react';
import { LogoutButton } from '../shared/LogoutButton';

const HeaderContainer = styled.header`
  background: white;
  height: 64px;
  border-bottom: 1px solid #EAEAEA;
  display: flex;
  align-items: center;
  padding: 0 32px;
  justify-content: space-between;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 48px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    color: #FF5733;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 8px;
`;

const NavItem = styled.a<{ $active?: boolean }>`
  color: ${props => props.$active ? '#FF5733' : '#666'};
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 24px;
  background: ${props => props.$active ? '#FF5733' : 'transparent'};
  background-opacity: ${props => props.$active ? '0.1' : '1'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.$active && `
    background: rgba(255, 87, 51, 0.1);
  `}

  &:hover {
    background: ${props => props.$active ? 'rgba(255, 87, 51, 0.1)' : '#F5F5F5'};
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: #F5F5F5;
  padding: 8px 16px;
  border-radius: 24px;
  width: 240px;
  gap: 8px;
  transition: all 0.2s ease;

  &:focus-within {
    background: #EAEAEA;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-size: 14px;
  color: #333;

  &::placeholder {
    color: #999;
  }
`;

const NotificationBadge = styled.div`
  position: relative;
  cursor: pointer;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 8px;
    background: #FF5733;
    border-radius: 50%;
    border: 2px solid white;
  }
`;

const ProfilePic = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
`;


export const Header = ({ activeTab = 'assessment', onTabChange }) => {
  const handleTabClick = (tabName) => {
    if (onTabChange) {
      onTabChange(tabName);
    }
  };

  return (
    <HeaderContainer>
      <LeftSection>
        <Logo>
          <Flame size={24} />
        </Logo>
        <Nav>
          <NavItem 
            $active={activeTab === 'assessment'} 
            onClick={() => handleTabClick('assessment')}
            style={{ cursor: 'pointer' }}
          >
            Assessment
          </NavItem>
          <NavItem 
            $active={activeTab === 'gameplan'} 
            onClick={() => handleTabClick('gameplan')}
            style={{ cursor: 'pointer' }}
          >
            Game Plan
          </NavItem>
          <NavItem 
            $active={activeTab === 'preparation'} 
            onClick={() => handleTabClick('preparation')}
            style={{ cursor: 'pointer' }}
          >
            Preparation
          </NavItem>
          <NavItem
            $active={activeTab === 'application'}
            onClick={() => handleTabClick('application')}
            style={{ cursor: 'pointer' }}
          >
            Application
          </NavItem>
          <NavItem
            $active={activeTab === 'growth_transformations'}
            onClick={() => handleTabClick('growth_transformations')}
            style={{ cursor: 'pointer' }}
          >
            Growth Journey
          </NavItem>
          <NavItem
            $active={activeTab === 'sessions'}
            onClick={() => handleTabClick('sessions')}
            style={{ cursor: 'pointer' }}
          >
            Sessions
          </NavItem>
          <NavItem
            $active={activeTab === 'evidence'}
            onClick={() => handleTabClick('evidence')}
            style={{ cursor: 'pointer' }}
          >
            Evidence & Growth
          </NavItem>
          <NavItem
            $active={activeTab === 'aichat'}
            onClick={() => handleTabClick('aichat')}
            style={{ cursor: 'pointer' }}
          >
            AI Chat
          </NavItem>
        </Nav>
      </LeftSection>
      <RightSection>
        <SearchBar>
          <Search size={18} color="#999" />
          <SearchInput placeholder="Search" />
        </SearchBar>
        <NotificationBadge>
          <Bell size={20} color="#666" />
        </NotificationBadge>
        <ProfilePic 
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100" 
          alt="Profile"
        />
        <LogoutButton />
      </RightSection>
    </HeaderContainer>
  );
};