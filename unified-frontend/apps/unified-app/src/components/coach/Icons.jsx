import React from 'react';

// Icon color constants
const ICON_COLORS = {
  primary: '#FF4A23',
  secondary: '#641432',
  default: '#616479',
  white: '#FFFFFF',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626'
};

// Base icon wrapper for consistent sizing and styling
const IconWrapper = ({ children, size = 24, color = ICON_COLORS.default, style = {} }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={style}
  >
    {children}
  </svg>
);

// Star Icon (from star-svg.svg) - Scaled to 24x24
export const StarIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path 
      d="M13.7 4.5L15.2 7.5C15.4 7.9 15.9 8.3 16.4 8.4L19 8.8C20.7 9.1 21.1 10.3 19.9 11.5L17.8 13.6C17.5 13.9 17.3 14.6 17.4 15.1L18 17.6C18.5 19.6 17.4 20.4 15.7 19.4L13.3 18.1C12.8 17.8 12 17.8 11.5 18.1L9.1 19.4C7.4 20.4 6.3 19.6 6.8 17.6L7.4 15.1C7.5 14.6 7.3 13.9 7 13.6L4.9 11.5C3.7 10.3 4.1 9.1 5.8 8.8L8.4 8.4C8.9 8.3 9.4 7.9 9.6 7.5L11.1 4.5C11.9 2.9 13.1 2.9 13.7 4.5Z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </IconWrapper>
);

// Identity Icon (Fingerprint) - Scaled to 24x24
export const IdentityIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M6.8 18.5C6.2 17.4 5.8 16.1 5.8 14.7C5.8 12.3 7.8 10.3 10.2 10.3C12.6 10.3 14.6 12.3 14.6 14.7C14.6 15 14.8 15.2 15.1 15.2C15.4 15.2 15.6 15 15.6 14.7C15.6 11.8 13.1 9.5 10.2 9.5C7.3 9.5 4.8 11.8 4.8 14.7C4.8 16.2 5.2 17.6 5.9 18.7C6.6 19.8 7.1 20.3 7.9 21.1C8 21.2 8.1 21.2 8.2 21.2C8.3 21.2 8.4 21.2 8.5 21.1C8.7 20.9 8.7 20.6 8.5 20.4C7.7 19.6 7.3 19.1 6.8 18.5Z" fill={color} stroke={color} strokeWidth="0.2"/>
    <path d="M4.9 3.5C6.5 2.6 8.3 2.1 10.2 2.1C12.1 2.1 13.7 2.5 15.6 3.5C15.7 3.5 15.7 3.6 15.8 3.6C16 3.6 16.2 3.5 16.3 3.3C16.4 3 16.3 2.7 16 2.5C13.9 1.5 12.3 1 10.2 1C8.1 1 6.1 1.5 4.3 2.5C4 2.7 3.9 3 4.1 3.3C4.3 3.6 4.6 3.7 4.9 3.5Z" fill={color} stroke={color} strokeWidth="0.2"/>
    <path d="M10.2 5.5C7.1 5.5 4.3 7.2 2.9 9.9C2.4 10.8 2.2 11.9 2.2 13.1C2.2 14.5 2.4 15.8 2.9 17.1C3 17.4 3.3 17.5 3.6 17.4C3.9 17.3 4 17 3.9 16.7C3.3 15.1 3.2 14 3.2 13.1C3.2 12.1 3.4 11.2 3.8 10.4C4.9 8 7.3 6.5 10.2 6.5C14.1 6.5 17.3 9.6 17.3 13.1C17.3 14.1 16.4 14.9 15.3 14.9C14.2 14.9 13.3 14.1 13.3 13.1C13.3 11.5 11.9 10.2 10.2 10.2C8.5 10.2 7.1 11.5 7.1 13.1C7.1 15 7.8 16.8 9.2 18.1C10.2 19.1 11.2 19.7 12.7 20.1C12.7 20.1 12.8 20.1 12.9 20.1C13.1 20.1 13.3 20 13.4 19.8C13.5 19.5 13.3 19.2 13 19.1C11.6 18.8 10.7 18.3 9.8 17.4C8.6 16.2 8 14.6 8 13.1C8 12.1 8.9 11.3 10.2 11.3C11.5 11.3 12.4 12.1 12.4 13.1C12.4 14.6 13.8 15.9 15.3 15.9C16.8 15.9 18.2 14.6 18.2 13.1C18.2 9.1 14.6 5.5 10.2 5.5Z" fill={color} stroke={color} strokeWidth="0.2"/>
    <path d="M19.3 7.7C18.3 6.3 17 5.2 15.4 4.4C12.4 2.8 8.6 2.8 5.6 4.4C4 5.2 2.6 6.3 1.7 7.7C1.5 8 1.6 8.3 1.9 8.5C2 8.6 2.1 8.6 2.2 8.6C2.4 8.6 2.6 8.5 2.7 8.4C3.6 7.1 4.7 6.1 6 5.4C8.7 3.9 12.2 3.9 14.9 5.4C16.2 6.1 17.3 7.1 18.2 8.4C18.4 8.6 18.7 8.7 18.9 8.5C19.2 8.3 19.2 8 19.3 7.7Z" fill={color} stroke={color} strokeWidth="0.2"/>
    <path d="M16.4 17.4C16 17.5 15.6 17.5 15.3 17.5C14.3 17.5 13.5 17.3 12.8 16.8C11.6 16 10.9 14.7 10.9 13.1C10.9 12.8 10.7 12.6 10.4 12.6C10.1 12.6 9.9 12.8 9.9 13.1C9.9 14.9 10.8 16.6 12.2 17.6C13.1 18.2 14.1 18.5 15.3 18.5C15.4 18.5 15.9 18.5 16.5 18.4C16.8 18.3 16.9 18 16.9 17.7C16.8 17.4 16.6 17.3 16.4 17.4Z" fill={color} stroke={color} strokeWidth="0.2"/>
  </IconWrapper>
);

// Passion Icon (Heart) - Scaled to 24x24
export const PassionIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path 
      d="M12.6 20.8C12.3 20.9 11.7 20.9 11.4 20.8C8.5 19.8 2 16 2 8.7C2 5.6 4.5 3.1 7.6 3.1C9.4 3.1 11 3.9 12 5.2C13 3.9 14.6 3.1 16.4 3.1C19.5 3.1 22 5.6 22 8.7C22 16 15.5 19.8 12.6 20.8Z" 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </IconWrapper>
);

// Service Icon (People) - Scaled to 24x24
export const ServiceIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M9.2 10.4C9.1 10.4 8.9 10.4 8.8 10.4C6.5 10.3 4.7 8.5 4.7 6.2C4.7 3.8 6.6 1.9 9 1.9C11.4 1.9 13.3 3.8 13.3 6.2C13.3 8.5 11.5 10.3 9.2 10.4Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.4 3.9C18.1 3.9 19.5 5.3 19.5 7C19.5 8.6 18.2 10 16.5 10.1C16.4 10.1 16.3 10.1 16.2 10.1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.4 14.5C2.3 16 2.3 18.4 4.4 19.8C6.8 21.5 10.7 21.5 13.1 19.8C15.2 18.3 15.2 15.9 13.1 14.5C10.7 12.8 6.8 12.8 4.4 14.5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 19.5C18.7 19.3 19.3 19 19.8 18.6C21.2 17.5 21.2 15.6 19.8 14.5C19.3 14.1 18.7 13.8 18 13.7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Additional professional icons in the same style

// Target Icon (Bullseye replacement for 🎯)
export const TargetIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 18C15.3 18 18 15.3 18 12C18 8.7 15.3 6 12 6C8.7 6 6 8.7 6 12C6 15.3 8.7 18 12 18Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Book Icon (Replacement for 📚)
export const BookIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M22 4.7V16.8C22 17.9 21.1 18.9 19.9 19L12.4 19.8C12.1 19.8 11.9 19.8 11.6 19.8L4.1 19C2.9 18.9 2 17.9 2 16.8V4.7C2 3.4 3.1 2.4 4.3 2.5L11.4 3.2C11.8 3.2 12 3.5 12 3.9V20" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3.5V19.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 4.7L12 3.9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 7H9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 11H9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Computer Icon (Replacement for 💻)
export const ComputerIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M20 5H4C2.9 5 2 5.9 2 7V15C2 16.1 2.9 17 4 17H20C21.1 17 22 16.1 22 15V7C22 5.9 21.1 5 20 5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 20H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 17V20" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Video Icon (Replacement for 🎬)
export const VideoIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M18 7V17C18 19 17 20 15 20H9C7 20 6 19 6 17V7C6 5 7 4 9 4H15C17 4 18 5 18 7Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12.5C12.8 12.5 13.5 11.8 13.5 11C13.5 10.2 12.8 9.5 12 9.5C11.2 9.5 10.5 10.2 10.5 11C10.5 11.8 11.2 12.5 12 12.5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 18V22" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 18V22" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 18V22" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Trophy Icon (Replacement for 🏆)
export const TrophyIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M12 15C15.3 15 18 12.3 18 9V4H6V9C6 12.3 8.7 15 12 15Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V19" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 19H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 7H20C21.1 7 22 7.9 22 9C22 10.1 21.1 11 20 11H18.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 7H4C2.9 7 2 7.9 2 9C2 10.1 2.9 11 4 11H5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Checkmark Icon (Replacement for ✓)
export const CheckIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M20 6L9 17L4 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Play Icon (for video player)
export const PlayIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M5 3L19 12L5 21V3Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Calendar Icon
export const CalendarIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M8 2V5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 2V5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.5 9.1H20.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Clock Icon
export const ClockIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M22 12C22 17.5 17.5 22 12 22C6.5 22 2 17.5 2 12C2 6.5 6.5 2 12 2C17.5 2 22 6.5 22 12Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.7 15.2L12 12.7V7.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// User Icon
export const UserIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M12 12C14.2 12 16 10.2 16 8C16 5.8 14.2 4 12 4C9.8 4 8 5.8 8 8C8 10.2 9.8 12 12 12Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.6 21C20.6 17.1 16.7 14 12 14C7.3 14 3.4 17.1 3.4 21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Chart Icon (for analytics)
export const ChartIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M3 22H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5.6 8.4V17H8.4V8.4C8.4 7.1 8 6.7 6.7 6.7H7.3C6 6.7 5.6 7.1 5.6 8.4Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.6 12.8V17H13.4V12.8C13.4 11.5 13 11.1 11.7 11.1H12.3C11 11.1 10.6 11.5 10.6 12.8Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.6 5V17H18.4V5C18.4 3.7 18 3.3 16.7 3.3H17.3C16 3.3 15.6 3.7 15.6 5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Document Icon
export const DocumentIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M22 10V15C22 20 20 22 15 22H9C4 22 2 20 2 15V9C2 4 4 2 9 2H14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 10H18C15 10 14 9 14 6V2L22 10Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 13H13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 17H11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Dollar Icon (for earnings)
export const DollarIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M12 2V22" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 5H9.5C8.1 5 7 6.1 7 7.5C7 8.9 8.1 10 9.5 10H14.5C15.9 10 17 11.1 17 12.5C17 13.9 15.9 15 14.5 15H7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Arrow Right Icon
export const ArrowRightIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M8.9 19.9L15.9 13C16.7 12.2 16.7 10.8 15.9 10L8.9 3.1" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Eye Icon (for view/preview)
export const EyeIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M15.6 12C15.6 13.98 13.98 15.6 12 15.6C10.02 15.6 8.4 13.98 8.4 12C8.4 10.02 10.02 8.4 12 8.4C13.98 8.4 15.6 10.02 15.6 12Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 20.3C15.5 20.3 18.8 18.2 21.1 14.6C22 13.2 22 10.8 21.1 9.4C18.8 5.8 15.5 3.7 12 3.7C8.5 3.7 5.2 5.8 2.9 9.4C2 10.8 2 13.2 2.9 14.6C5.2 18.2 8.5 20.3 12 20.3Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Close Icon (X)
export const CloseIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M18 6L6 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 6L18 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Arrow Left Icon
export const ArrowLeftIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M15.1 19.9L8.1 13C7.3 12.2 7.3 10.8 8.1 10L15.1 3.1" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// External Link Icon
export const ExternalLinkIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="15 3 21 3 21 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="10" y1="14" x2="21" y2="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Search Icon
export const SearchIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M21 21L15 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Filter Icon
export const FilterIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Alert Icon (Warning triangle)
export const AlertIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Edit Icon (Pencil)
export const EditIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Send Icon (Paper plane)
export const SendIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Attachment Icon (Paperclip)
export const AttachmentIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Trash Icon (Bin)
export const TrashIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <polyline points="3 6 5 6 21 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Plus Icon
export const PlusIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

export { ICON_COLORS };