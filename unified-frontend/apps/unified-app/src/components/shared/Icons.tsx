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

// Star Icon
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

// Target Icon
export const TargetIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 18C15.3 18 18 15.3 18 12C18 8.7 15.3 6 12 6C8.7 6 6 8.7 6 12C6 15.3 8.7 18 12 18Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Book Icon
export const BookIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M22 4.7V16.8C22 17.9 21.1 18.9 19.9 19L12.4 19.8C12.1 19.8 11.9 19.8 11.6 19.8L4.1 19C2.9 18.9 2 17.9 2 16.8V4.7C2 3.4 3.1 2.4 4.3 2.5L11.4 3.2C11.8 3.2 12 3.5 12 3.9V20" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3.5V19.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 4.7L12 3.9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 7H9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 11H9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Video Icon
export const VideoIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M15 10L11 7V17L15 14V10Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 12C22 17.5 17.5 22 12 22C6.5 22 2 17.5 2 12C2 6.5 6.5 2 12 2C17.5 2 22 6.5 22 12Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Users Icon
export const UsersIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Calendar Icon
export const CalendarIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M8 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 10H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Clock Icon
export const ClockIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 6V12L16 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// File Text Icon
export const FileTextIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13H8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17H8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9H9H8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Search Icon
export const SearchIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 21L16.65 16.65" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Filter Icon
export const FilterIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M22 3H2L9 12.46V19L15 21V12.46L22 3Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Download Icon
export const DownloadIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 10L12 15L17 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Play Icon
export const PlayIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M5 3L19 12L5 21V3Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Trending Up Icon
export const TrendingUpIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M23 6L13.5 15.5L8.5 10.5L1 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 6H23V12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Check Circle Icon
export const CheckCircleIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.76488 14.1003 1.98232 16.07 2.85999" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 4L12 14.01L9 11.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Award Icon
export const AwardIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// Chevron Right Icon
export const ChevronRightIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M9 18L15 12L9 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

// External Link Icon
export const ExternalLinkIcon = ({ size = 24, color = ICON_COLORS.default, style = {} }) => (
  <IconWrapper size={size} color={color} style={style}>
    <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 3H21V9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 14L21 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </IconWrapper>
);

export { ICON_COLORS };

