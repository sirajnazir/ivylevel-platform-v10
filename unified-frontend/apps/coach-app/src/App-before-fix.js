import React, { useState, useEffect, createContext, useContext } from 'react';
// Import SmartResourceHub component
import SmartResourceHub from './SmartResourceHub';
// Import SmartResourceHub component
import SmartResourceHub from './SmartResourceHub';


// Brand Logo Components
const IvylevelLogo = ({ style = {} }) => (
  <svg style={{height: '48px', ...style}} width="16" height="24" viewBox="0 0 16 24" fill="none">
    <path d="M8.76172 11.3337V15.0312C9.15499 11.8118 11.8963 9.31723 15.2198 9.31723V16.6968C15.2198 20.294 12.305 23.2088 8.70775 23.2088V21.1076C3.96925 21.0767 0.136818 17.2289 0.136818 12.4865V2.70879C4.89845 2.70879 8.76172 6.56821 8.76172 11.3337Z" fill="#FF4A23"/>
    <path d="M7.78311 3.32667L8.29085 3.04763C8.9667 2.6762 9.5221 2.11907 9.89143 1.44207L10.1688 0.933643L10.4462 1.43917C10.8178 2.11642 11.3759 2.67289 12.0542 3.04261L12.5618 3.31929L12.057 3.5961C11.3785 3.96814 10.8212 4.52722 10.4513 5.20685L10.1761 5.71233L9.89774 5.20538C9.52591 4.52826 8.96772 3.97196 8.28935 3.60243L7.78311 3.32667Z" fill="#FF4A23"/>
  </svg>
);

const IvylevelLogoSmall = ({ style = {} }) => (
  <svg style={{height: '32px', ...style}} width="16" height="24" viewBox="0 0 16 24" fill="none">
    <path d="M8.76172 11.3337V15.0312C9.15499 11.8118 11.8963 9.31723 15.2198 9.31723V16.6968C15.2198 20.294 12.305 23.2088 8.70775 23.2088V21.1076C3.96925 21.0767 0.136818 17.2289 0.136818 12.4865V2.70879C4.89845 2.70879 8.76172 6.56821 8.76172 11.3337Z" fill="#FF4A23"/>
    <path d="M7.78311 3.32667L8.29085 3.04763C8.9667 2.6762 9.5221 2.11907 9.89143 1.44207L10.1688 0.933643L10.4462 1.43917C10.8178 2.11642 11.3759 2.67289 12.0542 3.04261L12.5618 3.31929L12.057 3.5961C11.3785 3.96814 10.8212 4.52722 10.4513 5.20685L10.1761 5.71233L9.89774 5.20538C9.52591 4.52826 8.96772 3.97196 8.28935 3.60243L7.78311 3.32667Z" fill="#FF4A23"/>
  </svg>
);

const IvylevelFullLogo = ({ style = {} }) => (
  <svg style={{width: '92px', height: '27px', ...style}} viewBox="0 0 92 27" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.34866 11.2647V15.0609C9.75237 11.7555 12.5671 9.19429 15.9792 9.19429V16.771C15.9792 20.4644 12.9866 23.457 9.29325 23.457V21.2997C4.42835 21.2681 0.493347 17.3173 0.493347 12.4482V2.4093C5.382 2.4093 9.34866 6.37184 9.34866 11.2647Z" fill="#FE4A22"/>
    <path d="M8.34308 3.04325C9.37714 2.4749 10.2275 1.62228 10.7924 0.586304C11.3598 1.62053 12.2135 2.47106 13.2492 3.03571C12.2143 3.60315 11.364 4.45602 10.7999 5.49266C10.232 4.45868 9.3788 3.60753 8.34308 3.04325Z" fill="#FE4A22"/>
    <path d="M51.1788 5.17236H52.6249V21.5033H51.1788V5.17236Z" fill="#641432"/>
    <path d="M24.5442 6.5116H24.4901C24.0476 6.5116 23.6889 6.86935 23.6889 7.31064C23.6889 7.75197 24.0476 8.10972 24.4901 8.10972H24.5442C24.9867 8.10972 25.3454 7.75197 25.3454 7.31064C25.3454 6.86935 24.9867 6.5116 24.5442 6.5116Z" fill="#641432"/>
    <path d="M23.8066 10.2825V21.5041H25.2532V10.2825H23.8066Z" fill="#641432"/>
    <path d="M32.6366 18.448C32.7066 18.277 32.7729 18.0981 32.835 17.9115L35.6113 10.2825H37.1512L32.765 21.5041H31.2018L26.8627 10.2825H28.4725L31.2485 17.9115C31.311 18.067 31.373 18.2264 31.4351 18.3897C31.4976 18.553 31.5597 18.7047 31.6218 18.8446C31.6842 19.0468 31.7501 19.2413 31.8201 19.4279C31.8901 19.6146 31.9563 19.7935 32.0184 19.9647C32.0809 19.8089 32.1467 19.6496 32.2167 19.4862C32.2867 19.3229 32.3529 19.1479 32.415 18.9613C32.4929 18.7902 32.5666 18.6191 32.6366 18.448Z" fill="#641432"/>
    <path d="M44.4157 17.6548C44.3537 17.8103 44.2874 17.9814 44.2174 18.1681C44.1474 18.3547 44.0658 18.5413 43.9724 18.728L43.8325 19.1013C43.7858 19.2257 43.7471 19.3501 43.7158 19.4746C43.3892 18.728 43.1405 18.1292 42.9692 17.6781L40.0062 10.2825H38.3968L42.9459 21.2008L40.8461 26.4269H42.386L48.7319 10.2825H47.1921L44.4157 17.6548Z" fill="#641432"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M63.1106 10.6771C62.364 10.1949 61.462 9.95386 60.4046 9.95386C59.4247 9.95386 58.5382 10.2066 57.7449 10.7121C56.9517 11.2176 56.3255 11.9174 55.8668 12.8118C55.4081 13.7061 55.1785 14.7132 55.1785 15.833C55.1785 17.0929 55.4002 18.1738 55.8434 19.0759C56.2867 19.9781 56.9088 20.6622 57.7099 21.1288C58.5107 21.5954 59.4401 21.8287 60.498 21.8287C61.4466 21.8287 62.2669 21.6654 62.959 21.3388C63.6514 21.0122 64.1917 20.5689 64.5804 20.0093C64.9696 19.4492 65.2183 18.8115 65.327 18.0961H63.8805C63.7405 18.936 63.3714 19.5698 62.7723 19.9977C62.1736 20.4251 61.4233 20.6389 60.5213 20.6389C59.7589 20.6389 59.0864 20.4639 58.5032 20.1143C57.9199 19.7644 57.4649 19.247 57.1383 18.5627C56.8117 17.8783 56.6405 17.0618 56.625 16.113H65.397V15.7864C65.397 14.6199 65.2029 13.5972 64.8138 12.7185C64.425 11.8397 63.8572 11.1592 63.1106 10.6771ZM56.695 14.9932C56.7884 13.8733 57.1696 12.9517 57.8382 12.2285C58.5069 11.5053 59.3622 11.1437 60.4046 11.1437C61.4466 11.1437 62.3173 11.4936 62.9239 12.1935C63.5306 12.8934 63.8418 13.8267 63.8572 14.9932H56.695Z" fill="#641432"/>
    <path d="M72.0414 18.448C72.1114 18.277 72.1777 18.0981 72.2397 17.9115L75.0161 10.2825H76.556L72.1697 21.5041H70.6066L66.2675 10.2825H67.8773L70.6532 17.9115C70.7157 18.067 70.7778 18.2264 70.8399 18.3897C70.9024 18.553 70.9645 18.7047 71.0265 18.8446C71.089 19.0468 71.1549 19.2413 71.2249 19.4279C71.2948 19.6146 71.3611 19.7935 71.4232 19.9647C71.4857 19.8089 71.5515 19.6496 71.6215 19.4862C71.6915 19.3229 71.7577 19.1479 71.8198 18.9613C71.8977 18.7902 71.9714 18.6191 72.0414 18.448Z" fill="#641432"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M85.2609 10.6771C84.5143 10.1949 83.6123 9.95386 82.5545 9.95386C81.5746 9.95386 80.688 10.2066 79.8948 10.7121C79.1015 11.2176 78.4758 11.9174 78.0166 12.8118C77.5579 13.7061 77.3284 14.7132 77.3284 15.833C77.3284 17.0929 77.55 18.1738 77.9933 19.0759C78.4366 19.9781 79.059 20.6622 79.8598 21.1288C80.6609 21.5954 81.59 21.8287 82.6478 21.8287C83.5965 21.8287 84.4168 21.6654 85.1092 21.3388C85.8012 21.0122 86.3416 20.5689 86.7307 20.0093C87.1194 19.4492 87.3681 18.8115 87.4773 18.0961H86.0308C85.8908 18.936 85.5213 19.5698 84.9226 19.9977C84.3235 20.4251 83.5731 20.6389 82.6711 20.6389C81.9091 20.6389 81.2363 20.4639 80.653 20.1143C80.0698 19.7644 79.6148 19.247 79.2882 18.5627C78.9615 17.8783 78.7907 17.0618 78.7749 16.113H87.5473V15.7864C87.5473 14.6199 87.3527 13.5972 86.964 12.7185C86.5749 11.8397 86.0075 11.1592 85.2609 10.6771ZM78.8449 14.9932C78.9382 13.8733 79.3194 12.9517 79.9881 12.2285C80.6568 11.5053 81.5125 11.1437 82.5545 11.1437C83.5965 11.1437 84.4676 11.4936 85.0742 12.1935C85.6808 12.8934 85.9916 13.8267 86.0075 14.9932H78.8449Z" fill="#641432"/>
    <path d="M90.0909 5.17236H91.5374V21.5033H90.0909V5.17236Z" fill="#641432"/>
  </svg>
);



// Category Icon Components
const IdentityIcon = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} width="15" height="16" viewBox="0 0 15 16" fill="none">
    <path d="M4.79058 13.0716C4.31889 12.2257 4.06944 11.1888 4.06944 10.0661C4.06944 8.17944 5.70274 6.6436 7.70638 6.6436C9.7139 6.6436 11.3433 8.17947 11.3433 10.0661C11.3433 10.2805 11.5187 10.456 11.7332 10.456C11.9476 10.456 12.123 10.2805 12.123 10.0661C12.123 7.74675 10.1427 5.86395 7.70642 5.86395C5.27012 5.86395 3.28979 7.75066 3.28979 10.0661C3.28979 11.3213 3.57436 12.4947 4.1123 13.4536C4.63855 14.3931 5.00499 14.8257 5.67935 15.5079C5.7573 15.5858 5.85476 15.6248 5.9561 15.6248C6.05357 15.6248 6.15491 15.5898 6.22507 15.5079C6.38101 15.3598 6.38101 15.1103 6.22898 14.9583C5.62866 14.3541 5.29343 13.9682 4.79058 13.0716Z" fill="currentColor" stroke="currentColor" strokeWidth="0.111375"/>
    <path d="M3.37087 2.07889C4.70794 1.34993 6.16582 0.979624 7.71339 0.979624C9.26483 0.979624 10.5629 1.31098 12.0559 2.08281C12.1144 2.1101 12.1729 2.12567 12.2352 2.12567C12.3756 2.12567 12.512 2.04772 12.5822 1.91517C12.6796 1.72415 12.6055 1.48639 12.4145 1.38893C10.8241 0.566448 9.37399 0.200012 7.71339 0.200012C6.03719 0.200012 4.45066 0.601531 2.99665 1.39284C2.80563 1.49809 2.73938 1.73197 2.84071 1.92299C2.94596 2.11398 3.17985 2.18027 3.37087 2.07889Z" fill="currentColor" stroke="currentColor" strokeWidth="0.111375"/>
    <path d="M7.67805 3.96567C5.16376 3.96567 2.86388 5.3729 1.82309 7.54805C1.46834 8.2848 1.28905 9.13458 1.28905 10.0701C1.28905 11.1226 1.47616 12.1283 1.85817 13.1535C1.93612 13.3562 2.15831 13.4576 2.36103 13.3835C2.56374 13.3056 2.66508 13.0834 2.591 12.8806C2.1271 11.6372 2.07254 10.6782 2.07254 10.0701C2.07254 9.25152 2.22457 8.51478 2.52862 7.88328C3.44078 5.97319 5.46391 4.74141 7.68193 4.74141C10.7965 4.74141 13.3303 7.13097 13.3303 10.0701C13.3303 10.9082 12.6013 11.5865 11.7087 11.5865C10.8161 11.5865 10.0871 10.9043 10.0871 10.0701C10.0871 8.80322 9.01121 7.77412 7.68584 7.77412C6.36046 7.77412 5.28458 8.80322 5.28458 10.0701C5.28458 11.6099 5.8849 13.0561 6.97248 14.1398C7.81447 14.9778 8.6253 15.4378 9.86877 15.777C9.89995 15.7887 9.93503 15.7926 9.97011 15.7926C10.1416 15.7926 10.2976 15.6795 10.3443 15.508C10.4028 15.3014 10.2781 15.087 10.0715 15.0285C8.97218 14.7284 8.25491 14.323 7.51817 13.5901C6.57871 12.6546 6.06028 11.4033 6.06028 10.074C6.06028 9.23595 6.78924 8.55768 7.68189 8.55768C8.57453 8.55768 9.3035 9.23986 9.3035 10.074C9.3035 11.3409 10.3833 12.37 11.7048 12.37C13.0262 12.37 14.106 11.3409 14.106 10.074C14.106 6.70606 11.2214 3.96567 7.67805 3.96567Z" fill="currentColor" stroke="currentColor" strokeWidth="0.111375"/>
    <path d="M14.6525 5.57953C13.8767 4.49586 12.8944 3.64605 11.7289 3.04576C9.27307 1.78277 6.13898 1.78668 3.68707 3.05355C2.51763 3.65774 1.5314 4.51534 0.759569 5.60683C0.634842 5.78224 0.677709 6.02391 0.853124 6.14868C0.92329 6.19546 1.00124 6.21884 1.07923 6.21884C1.20008 6.21884 1.3209 6.16428 1.39889 6.05903C2.09664 5.06892 2.98932 4.29318 4.04572 3.74746C6.27935 2.59363 9.13668 2.58972 11.3742 3.73968C12.4267 4.27762 13.3154 5.04944 14.0171 6.03177C14.1418 6.20719 14.3874 6.24618 14.5628 6.12142C14.7382 5.99662 14.7772 5.75494 14.6525 5.57953Z" fill="currentColor" stroke="currentColor" strokeWidth="0.111375"/>
    <path d="M12.3562 13.3289C12.0443 13.3834 11.7286 13.403 11.5415 13.403C10.7619 13.403 10.1148 13.2198 9.56512 12.8455C8.61788 12.2023 8.05264 11.1655 8.05264 10.0701C8.05264 9.85565 7.87722 9.68024 7.66282 9.68024C7.44841 9.68024 7.27299 9.85565 7.27299 10.0701C7.27299 11.4266 7.96687 12.7052 9.12461 13.4926C9.79897 13.9487 10.6137 14.1826 11.5414 14.1826C11.6506 14.1826 12.0365 14.1787 12.4926 14.0968C12.7031 14.0578 12.8473 13.8551 12.8083 13.6446C12.7693 13.4341 12.5667 13.2899 12.3562 13.3289Z" fill="currentColor" stroke="currentColor" strokeWidth="0.111375"/>
  </svg>
);

const HeartIcon = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} width="17" height="17" viewBox="0 0 17 17" fill="none">
    <path d="M9.10916 14.075C8.88827 14.153 8.52444 14.153 8.30355 14.075C6.41946 13.4318 2.20948 10.7486 2.20948 6.20078C2.20948 4.19325 3.8272 2.56903 5.82174 2.56903C7.00417 2.56903 8.05017 3.14076 8.70636 4.02433C9.36254 3.14076 10.415 2.56903 11.591 2.56903C13.5855 2.56903 15.2032 4.19325 15.2032 6.20078C15.2032 10.7486 10.9933 13.4318 9.10916 14.075Z" stroke="currentColor" strokeWidth="0.974531" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ServiceIcon = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} width="17" height="16" viewBox="0 0 17 16" fill="none">
    <path d="M6.86125 7.29462C6.79628 7.28812 6.71832 7.28812 6.64685 7.29462C5.10059 7.24264 3.87268 5.97575 3.87268 4.4165C3.87268 2.82477 5.15907 1.53189 6.7573 1.53189C8.34903 1.53189 9.64191 2.82477 9.64191 4.4165C9.63541 5.97575 8.4075 7.24264 6.86125 7.29462Z" stroke="currentColor" strokeWidth="0.974531" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.5715 2.83127C12.8319 2.83127 13.8454 3.85128 13.8454 5.10517C13.8454 6.33308 12.8709 7.3336 11.6559 7.37908C11.604 7.37258 11.5455 7.37258 11.487 7.37908" stroke="currentColor" strokeWidth="0.974531" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.61281 9.69196C2.04056 10.7445 2.04056 12.4596 3.61281 13.5056C5.39945 14.701 8.32954 14.701 10.1162 13.5056C11.6884 12.4531 11.6884 10.738 10.1162 9.69196C8.33604 8.50303 5.40595 8.50303 3.61281 9.69196Z" stroke="currentColor" strokeWidth="0.974531" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.8254 13.2263C13.2932 13.1288 13.7349 12.9404 14.0988 12.661C15.1123 11.9009 15.1123 10.647 14.0988 9.88687C13.7414 9.614 13.3061 9.43209 12.8449 9.32814" stroke="currentColor" strokeWidth="0.974531" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StarIcon = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} width="17" height="17" viewBox="0 0 17 17" fill="none">
    <path d="M9.83032 3.15785L10.9738 5.44475C11.1297 5.7631 11.5455 6.06845 11.8963 6.12692L13.9688 6.47126C15.2942 6.69215 15.606 7.65369 14.651 8.60223L13.0398 10.2135C12.7669 10.4863 12.6175 11.0126 12.7019 11.3894L13.1632 13.3839C13.527 14.9627 12.6889 15.5734 11.2921 14.7483L9.34955 13.5983C8.99872 13.3904 8.42049 13.3904 8.06317 13.5983L6.1206 14.7483C4.73027 15.5734 3.88567 14.9562 4.2495 13.3839L4.71078 11.3894C4.79524 11.0126 4.64581 10.4863 4.37294 10.2135L2.76172 8.60223C1.81317 7.65369 2.11852 6.69215 3.44389 6.47126L5.51639 6.12692C5.86073 6.06845 6.27653 5.7631 6.43245 5.44475L7.5759 3.15785C8.1996 1.91695 9.21311 1.91695 9.83032 3.15785Z" stroke="currentColor" strokeWidth="0.974531" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Additional consistent icons for the platform
const TargetIcon = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const BookIcon = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const TechIcon = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const VideoIcon = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const AwardIcon = ({ style = {} }) => (
  <svg style={{width: '24px', height: '24px', ...style}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15l-2 5-8-5 8-15 8 15-8 5-2-5z" />
  </svg>
);

// Mock Auth Context - Simulates Firebase Auth
const AuthContext = createContext({});

// Mock database - stores data in memory during session
const mockDatabase = {
  users: {
    'admin-uid': {
      id: 'admin-uid',
      email: 'admin@ivylevel.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    'coach1-uid': {
      id: 'coach1-uid',
      email: 'coach1@ivylevel.com',
      name: 'Sarah Johnson',
      role: 'coach',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      student: {
        name: 'Emma Chen',
        grade: '11th Grade',
        focusArea: 'pre-med',
        culturalBackground: 'Asian-American'
      },
      progress: {
        welcome: { completed: false },
        mastery: { completed: false, score: 0 },
        technical: { completed: false },
        simulation: { completed: false, score: 0 },
        certification: { completed: false }
      },
       // For coach1-uid, after the progress property, ADD:
      sharedResources: [
        {
          id: 'res1',
          title: 'Emma Chen - SAT Prep Strategy',
          type: 'gdrive',
          category: 'aptitude',
          categoryColor: '#FFBB6D',
          url: 'https://drive.google.com/file/d/SAMPLE_ID_1/view',
          addedDate: new Date().toISOString(),
          viewOnly: true
        }
      ]
    },
    'coach2-uid': {
      id: 'coach2-uid',
      email: 'coach2@ivylevel.com',
      name: 'Michael Roberts',
      role: 'coach',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      student: {
        name: 'Alex Kumar',
        grade: '12th Grade',
        focusArea: 'engineering',
        culturalBackground: 'South Asian'
      },
      progress: {
        welcome: { completed: false },
        mastery: { completed: false, score: 0 },
        technical: { completed: false },
        simulation: { completed: false, score: 0 },
        certification: { completed: false }
      },
      sharedResources: [
        {
          id: 'res2',
          title: 'Alex Kumar - Engineering Portfolio Guide',
          type: 'gdrive',
          url: 'https://drive.google.com/file/d/SAMPLE_ID_2/view',
          addedDate: new Date().toISOString(),
          viewOnly: true
        }
      ]
    }
  },
  credentials: {
    'admin@ivylevel.com': { password: 'Admin123!', uid: 'admin-uid' },
    'coach1@ivylevel.com': { password: 'Coach123!', uid: 'coach1-uid' },
    'coach2@ivylevel.com': { password: 'Coach123!', uid: 'coach2-uid' }
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const login = async (email, password) => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const creds = mockDatabase.credentials[email];
      if (!creds || creds.password !== password) {
        return { success: false, error: 'Invalid email or password' };
      }
      
      const userInfo = mockDatabase.users[creds.uid];
      setUser({ uid: creds.uid, email: email });
      setUserData(userInfo);
      
      // Update last login
      mockDatabase.users[creds.uid].lastLogin = new Date().toISOString();
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
  
  const logout = async () => {
    setUser(null);
    setUserData(null);
  };
  
  const createCoach = async (email, password, coachData) => {
    // Generate unique ID
    const uid = `coach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to mock database
    mockDatabase.users[uid] = {
      id: uid,
      email: email,
      name: coachData.name,
      role: 'coach',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      student: {
        name: coachData.studentName,
        grade: coachData.studentGrade,
        focusArea: coachData.studentFocus,
        culturalBackground: 'To be determined'
      },
      progress: {
        welcome: { completed: false },
        mastery: { completed: false, score: 0 },
        technical: { completed: false },
        simulation: { completed: false, score: 0 },
        certification: { completed: false }
      }
    };
    
    mockDatabase.credentials[email] = { password: password, uid: uid };
    
    return { success: true, uid: uid };
  };
  
  const updateTrainingProgress = async (moduleId, data) => {
    if (!user || !userData) return;
    
    // Update mock database
    mockDatabase.users[user.uid].progress[moduleId] = {
      ...mockDatabase.users[user.uid].progress[moduleId],
      ...data
    };
    
    // Update local state
    setUserData({
      ...userData,
      progress: {
        ...userData.progress,
        [moduleId]: {
          ...userData.progress[moduleId],
          ...data
        }
      }
    });
    
    // Check if all modules completed
    const progress = mockDatabase.users[user.uid].progress;
    const allCompleted = Object.values(progress).every(m => m.completed);
    if (allCompleted) {
      mockDatabase.users[user.uid].status = 'certified';
      mockDatabase.users[user.uid].certifiedAt = new Date().toISOString();
      setUserData(prev => ({
        ...prev,
        status: 'certified',
        certifiedAt: new Date().toISOString()
      }));
    }
  };

  const shareResourceWithCoach = async (coachId, resource) => {
    if (!userData || userData.role !== 'admin') return { success: false, error: 'Unauthorized' };
    
    const newResource = {
      id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...resource,
      addedDate: new Date().toISOString(),
      viewOnly: true
    };
    
    if (!mockDatabase.users[coachId].sharedResources) {
      mockDatabase.users[coachId].sharedResources = [];
    }
    
    mockDatabase.users[coachId].sharedResources.push(newResource);
    
    return { success: true, resourceId: newResource.id };
  };
  
  const getAllCoaches = () => {
    return Object.values(mockDatabase.users).filter(u => u.role === 'coach');
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      login, 
      logout, 
      updateTrainingProgress,
      createCoach,
      getAllCoaches,
      shareResourceWithCoach
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Admin Dashboard Component
const AdminDashboard = () => {
  // Focus area category colors
  const focusAreaColors = {
    'pre-med': '#FFBB6D', // Aptitude focus
    'engineering': '#FFBB6D', // Aptitude focus
    'business': '#FF6E6D', // Passion focus
    'liberal-arts': '#9698A6', // Personal context focus
    'stem': '#FFBB6D' // Aptitude focus
  };

  const { logout, createCoach, getAllCoaches, shareResourceWithCoach } = useAuth();
  const [coaches, setCoaches] = useState([]);
  const [newCoach, setNewCoach] = useState({ email: '', name: '', studentName: '', studentGrade: '', studentFocus: '' });
  const [loading, setLoading] = useState(false);
  const [creatingCoach, setCreatingCoach] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCoachForResource, setSelectedCoachForResource] = useState(null);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'gdrive' }); 
  
  useEffect(() => {
    // Load coaches
    setCoaches(getAllCoaches());
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setCoaches(getAllCoaches());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [getAllCoaches]);
  
  const handleCreateCoach = async (e) => {
    e.preventDefault();
    setCreatingCoach(true);
    
    try {
      // Generate temporary password
      const tempPassword = `Coach${Math.random().toString(36).substr(2, 9)}!`;
      
      // Create coach
      const result = await createCoach(newCoach.email, tempPassword, newCoach);
      
      if (result.success) {
        alert(`Coach created! Temporary password: ${tempPassword}`);
        setNewCoach({ email: '', name: '', studentName: '', studentGrade: '', studentFocus: '' });
        setShowCreateForm(false);
        // Refresh coaches list
        setCoaches(getAllCoaches());
      }
    } catch (error) {
      alert('Error creating coach: ' + error.message);
    }
    
    setCreatingCoach(false);
  };
  
  const getProgressPercentage = (progress) => {
    if (!progress) return 0;
    const modules = Object.keys(progress);
    const completed = modules.filter(m => progress[m]?.completed).length;
    return Math.round((completed / modules.length) * 100);
  };
  
  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return 'N/A';
    const now = new Date();
    const expires = new Date(expiresAt);
    const hours = Math.floor((expires - now) / (1000 * 60 * 60));
    if (hours < 0) return 'Expired';
    return `${hours}h remaining`;
  };
  
  // Icons
  
  
  const Plus = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
  
  const LogOut = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
  
  const Clock = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12,6 12,12 16,14"></polyline>
    </svg>
  );
  
  const ChartBar = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
  
  const AlertTriangle = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
  
  return (
    <div style={{minHeight: '100vh', background: '#F5F5F5'}}>
      {/* Header */}
      <div style={{background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <IvylevelFullLogo style={{height: '32px'}} />
              <h1 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#020202', margin: 0}}>Admin Dashboard</h1>
            </div>
            <p style={{color: '#616479'}}>Manage coach onboarding and training</p>
          </div>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#FF4A23',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <LogOut />
            Logout
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{maxWidth: '1200px', margin: '0 auto', padding: '24px'}}>
        {/* Stats */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px'}}>
          <div style={{background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{color: '#616479', fontSize: '0.875rem'}}>Total Coaches</p>
                <p style={{fontSize: '2rem', fontWeight: 'bold', color: '#020202'}}>{coaches.length}</p>
              </div>
              <ServiceIcon style={{color: '#FF4A23'}} />
            </div>
          </div>
          <div style={{background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{color: '#616479', fontSize: '0.875rem'}}>Active Training</p>
                <p style={{fontSize: '2rem', fontWeight: 'bold', color: '#020202'}}>
                  {coaches.filter(c => c.status === 'pending').length}
                </p>
              </div>
              <ChartBar style={{color: '#FF4A23'}} />
            </div>
          </div>
          <div style={{background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{color: '#616479', fontSize: '0.875rem'}}>Certified</p>
                <p style={{fontSize: '2rem', fontWeight: 'bold', color: '#020202'}}>
                  {coaches.filter(c => c.status === 'certified').length}
                </p>
              </div>
              <svg style={{width: '20px', height: '20px', color: '#FF4A23'}} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div style={{background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div>
                <p style={{color: '#616479', fontSize: '0.875rem'}}>Expired</p>
                <p style={{fontSize: '2rem', fontWeight: 'bold', color: '#020202'}}>
                  {coaches.filter(c => {
                    const expires = new Date(c.expiresAt);
                    return expires < new Date() && c.status === 'pending';
                  }).length}
                </p>
              </div>
              <AlertTriangle style={{color: 'inherit'}} />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
          <h2 style={{fontSize: '1.25rem', fontWeight: 'bold'}}>Coach Management</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: '#FF4A23',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Plus />
            Add New Coach
          </button>
        </div>
        
        {/* Create Coach Form */}
        {showCreateForm && (
          <div style={{background: 'white', borderRadius: '8px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
            <h3 style={{fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '16px'}}>Create New Coach</h3>
            <form onSubmit={handleCreateCoach}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px'}}>
                <div>
                  <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#616479', marginBottom: '4px'}}>
                    Coach Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newCoach.email}
                    onChange={(e) => setNewCoach({...newCoach, email: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#616479', marginBottom: '4px'}}>
                    Coach Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newCoach.name}
                    onChange={(e) => setNewCoach({...newCoach, name: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#616479', marginBottom: '4px'}}>
                    Student Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newCoach.studentName}
                    onChange={(e) => setNewCoach({...newCoach, studentName: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#616479', marginBottom: '4px'}}>
                    Student Grade
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 11th Grade"
                    value={newCoach.studentGrade}
                    onChange={(e) => setNewCoach({...newCoach, studentGrade: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div style={{gridColumn: 'span 2'}}>
                  <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#616479', marginBottom: '4px'}}>
                    Student Focus Area
                  </label>
                  <select
                    required
                    value={newCoach.studentFocus}
                    onChange={(e) => setNewCoach({...newCoach, studentFocus: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Select focus area</option>
                    <option value="pre-med">Pre-Med</option>
                    <option value="engineering">Engineering</option>
                    <option value="business">Business</option>
                    <option value="liberal-arts">Liberal Arts</option>
                    <option value="stem">STEM</option>
                  </select>
                </div>
              </div>
              <div style={{display: 'flex', gap: '12px'}}>
                <button
                  type="submit"
                  disabled={creatingCoach}
                  style={{
                    padding: '8px 24px',
                    background: creatingCoach ? '#9ca3af' : '#FF4A23',
                    color: 'white',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: creatingCoach ? 'not-allowed' : 'pointer'
                  }}
                >
                  {creatingCoach ? 'Creating...' : 'Create Coach'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: '8px 24px',
                    background: '#e5e7eb',
                    color: '#616479',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Coaches Table */}
        <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: '#F5F5F5', borderBottom: '1px solid #e5e7eb'}}>
                <th style={{padding: '12px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#616479'}}>Coach</th>
                <th style={{padding: '12px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#616479'}}>Student</th>
                <th style={{padding: '12px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#616479'}}>Progress</th>
                <th style={{padding: '12px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#616479'}}>Status</th>
                <th style={{padding: '12px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#616479'}}>Time Remaining</th>
                <th style={{padding: '12px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500', color: '#616479'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((coach) => (
                <tr key={coach.id} style={{borderBottom: '1px solid #e5e7eb'}}>
                  <td style={{padding: '16px 24px'}}>
                    <div>
                      <p style={{fontWeight: '500', color: '#020202'}}>{coach.name}</p>
                      <p style={{fontSize: '0.875rem', color: '#616479'}}>{coach.email}</p>
                    </div>
                  </td>
                  <td style={{padding: '16px 24px'}}>
                    <div>
                      <p style={{color: '#616479'}}>{coach.student?.name}</p>
                      <p style={{fontSize: '0.875rem', color: '#616479'}}>{coach.student?.grade} • {coach.student?.focusArea}</p>
                    </div>
                  </td>
                  <td style={{padding: '16px 24px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <div style={{flex: 1, height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
                        <div style={{
                          width: `${getProgressPercentage(coach.progress)}%`,
                          height: '100%',
                          background: '#FF4A23',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{fontSize: '0.875rem', color: '#616479'}}>
                        {getProgressPercentage(coach.progress)}%
                      </span>
                    </div>
                  </td>
                  <td style={{padding: '16px 24px'}}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      background: coach.status === 'certified' ? '#dcfce7' : 
                                 coach.status === 'pending' ? '#fef3c7' : '#fecaca',
                      color: coach.status === 'certified' ? '#FF4A23' : 
                            coach.status === 'pending' ? '#d97706' : '#dc2626'
                    }}>
                      {coach.status}
                    </span>
                  </td>
                  <td style={{padding: '16px 24px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '4px', color: getTimeRemaining(coach.expiresAt) === 'Expired' ? '#dc2626' : '#6b7280'}}>
                      <Clock />
                      <span style={{fontSize: '0.875rem'}}>{getTimeRemaining(coach.expiresAt)}</span>
                    </div>
                  </td>
                  <td style={{padding: '16px 24px'}}>
                    <div style={{display: 'flex', gap: '8px'}}>
                    <button
                      onClick={() => {
                        setSelectedCoachForResource(coach);
                        setShowResourceModal(true);
                      }}
                      style={{
                        padding: '4px 12px',
                        background: '#FF4A23',
                        color: 'white',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Share Resources
                    </button>
                    <button
                      style={{
                        padding: '4px 12px',
                        background: '#f3f4f6',
                        color: '#616479',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      View Details
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
           </tbody>
          </table>
        </div>
        
        {/* Resource Sharing Modal */}
        {showResourceModal && selectedCoachForResource && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '24px'}}>
                Share Resources with {selectedCoachForResource.name}
              </h3>
              
              <div style={{marginBottom: '24px'}}>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#616479', marginBottom: '4px'}}>
                  Resource Title
                </label>
                <input
                  type="text"
                  value={newResource.title}
                  onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                  placeholder="e.g., SAT Prep Strategy Guide"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div style={{marginBottom: '24px'}}>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#616479', marginBottom: '4px'}}>
                  Google Drive Link (View Only)
                </label>
                <input
                  type="url"
                  value={newResource.url}
                  onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                  placeholder="https://drive.google.com/file/d/.../view"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
                <p style={{fontSize: '0.75rem', color: '#616479', marginTop: '4px'}}>
                  Ensure link is set to "Anyone with link can view" in Google Drive sharing settings
                </p>
              </div>
              
              <div style={{background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
                <p style={{fontSize: '0.875rem', fontWeight: '500', color: '#92400e'}}>
                  ⚠️ Important: This resource will be VIEW ONLY. Coaches cannot download or edit.
                </p>
              </div>
              
              {/* Existing Resources */}
              {selectedCoachForResource.sharedResources && selectedCoachForResource.sharedResources.length > 0 && (
                <div style={{marginBottom: '24px'}}>
                  <h4 style={{fontWeight: '500', marginBottom: '12px'}}>Currently Shared Resources:</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {selectedCoachForResource.sharedResources.map((res) => (
                      <div key={res.id} style={{
                        padding: '12px',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}>
                        <div style={{fontWeight: '500'}}>{res.title}</div>
                        <div style={{color: '#616479', fontSize: '0.75rem'}}>
                          Added: {new Date(res.addedDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
                <button
                  onClick={() => {
                    setShowResourceModal(false);
                    setSelectedCoachForResource(null);
                    setNewResource({ title: '', url: '', type: 'gdrive' });
                  }}
                  style={{
                    padding: '8px 24px',
                    background: '#e5e7eb',
                    color: '#616479',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (newResource.title && newResource.url) {
                      await shareResourceWithCoach(selectedCoachForResource.id, newResource);
                      setNewResource({ title: '', url: '', type: 'gdrive' });
                      // Refresh coaches list
                      setCoaches(getAllCoaches());
                    }
                  }}
                  disabled={!newResource.title || !newResource.url}
                  style={{
                    padding: '8px 24px',
                    background: newResource.title && newResource.url ? '#FF4A23' : '#9ca3af',
                    color: 'white',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: newResource.title && newResource.url ? 'pointer' : 'not-allowed'
                  }}
                >
                  Share Resource
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Category Legend Component
const CategoryLegend = () => (
  <div style={{display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '16px'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
      <div style={{width: '12px', height: '12px', background: '#FFBB6D', borderRadius: '2px'}}></div>
      <span style={{fontSize: '0.75rem', color: '#616479'}}>Aptitude</span>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
      <div style={{width: '12px', height: '12px', background: '#FF6E6D', borderRadius: '2px'}}></div>
      <span style={{fontSize: '0.75rem', color: '#616479'}}>Passion</span>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
      <div style={{width: '12px', height: '12px', background: '#55AAAA', borderRadius: '2px'}}></div>
      <span style={{fontSize: '0.75rem', color: '#616479'}}>Community</span>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
      <div style={{width: '12px', height: '12px', background: '#9698A6', borderRadius: '2px'}}></div>
      <span style={{fontSize: '0.75rem', color: '#616479'}}>Identity</span>
    </div>
  </div>
);


// Enhanced Login Component
const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTestCreds, setShowTestCreds] = useState(true);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };
  
  // Test credentials for easy access
  const testCredentials = [
    { email: 'admin@ivylevel.com', password: 'Admin123!', role: 'Admin' },
    { email: 'coach1@ivylevel.com', password: 'Coach123!', role: 'Coach (Sarah)' },
    { email: 'coach2@ivylevel.com', password: 'Coach123!', role: 'Coach (Michael)' }
  ];
  
  // Icons
  const Lock = () => (
    <svg style={{width: '24px', height: '24px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
  
  const Eye = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
  
  const EyeOff = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
  
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #FFF5F2, #FFE5DF)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'}}>
      <div style={{maxWidth: '960px', width: '100%', display: 'flex', gap: '48px', alignItems: 'center'}}>
        {/* Left Side - Login Form */}
        <div style={{flex: 1, background: 'white', borderRadius: '16px', padding: '48px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}}>
          <div style={{textAlign: 'center', marginBottom: '32px'}}>
            <h1 style={{fontSize: '2rem', fontWeight: 'bold', color: '#020202', marginBottom: '8px'}}>Welcome Back</h1>
            <p style={{color: '#616479'}}>Sign in to your Ivylevel account</p>
          </div>
          
          {/* Test Credentials Box */}
          {!showTestCreds && (
            <div style={{textAlign: 'center', marginBottom: '16px'}}>
              <button
                onClick={() => setShowTestCreds(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF4A23',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Show test credentials
              </button>
            </div>
          )}
          
          {showTestCreds && (
            <div style={{background: '#FFE5DF', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                <h4 style={{fontWeight: '600', color: '#D63A1A'}}>Test Credentials</h4>
                <button
                  onClick={() => setShowTestCreds(false)}
                  style={{background: 'none', border: 'none', cursor: 'pointer', color: '#D63A1A'}}
                >
                  ×
                </button>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {testCredentials.map((cred, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword(cred.password);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'white',
                      border: '1px solid #FFBB6D',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.875rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FFF5F2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <span style={{color: '#616479'}}>{cred.role}</span>
                    <span style={{color: '#616479', fontSize: '0.75rem'}}>Click to use</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#616479', marginBottom: '8px'}}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#FF4A23'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div style={{marginBottom: '24px'}}>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#616479', marginBottom: '8px'}}>
                Password
              </label>
              <div style={{position: 'relative'}}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '12px 48px 12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#FF4A23'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#616479'
                  }}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
            
            {error && (
              <div style={{background: '#fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px'}}>
                <p style={{fontSize: '0.875rem', color: '#dc2626'}}>{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.125rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 10px 20px rgba(255, 74, 35, 0.2)'
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                {loading ? (
                  <>
                    <div style={{width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite'}}></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <Lock />
                    <span>Sign In</span>
                  </>
                )}
              </div>
            </button>
          </form>
        </div>
        
        {/* Right Side - Branding */}
        <div style={{flex: 1}}>
          <div style={{marginBottom: '32px'}}>
            <IvylevelFullLogo style={{height: '56px', marginBottom: '24px'}} />
            <h2 style={{fontSize: '2rem', fontWeight: '600', color: '#020202', lineHeight: '1.2'}}>
              New Coach Onboarding & Training Portal
            </h2>
          </div>
          <p style={{fontSize: '1.125rem', color: '#616479', lineHeight: '1.6', marginBottom: '32px'}}>
            Transform students' futures through personalized college guidance. 
            Join our community of Ivylevel coaches making a difference.
          </p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: 'white', border: '2px solid #FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: '#FF4A23'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#020202'}}>Comprehensive Training</h3>
                <p style={{fontSize: '0.875rem', color: '#616479'}}>Master proven coaching methodologies</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: 'white', border: '2px solid #FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: '#FF4A23'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#020202'}}>Earn $2,100+/month</h3>
                <p style={{fontSize: '0.875rem', color: '#616479'}}>Top coaches earn over $25k annually</p>
              </div>
            </div>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div style={{width: '48px', height: '48px', background: 'white', border: '2px solid #FFE5DF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg style={{width: '24px', height: '24px', color: '#FF4A23'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 style={{fontWeight: '600', color: '#020202'}}>Impact Lives</h3>
                <p style={{fontSize: '0.875rem', color: '#616479'}}>Guide students to their dream colleges</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

// Main App Component with Authentication
const App = () => {
  const { user, userData, loading: authLoading, updateTrainingProgress, logout } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentModule, setCurrentModule] = useState(0);
  const [completedModules, setCompletedModules] = useState([]);
  const [trainingStats, setTrainingStats] = useState({
    startTime: Date.now(),
    totalTime: 0,
    moduleScores: {},
    averageScore: 0
  });
  
  useEffect(() => {
    if (userData && userData.progress) {
      // Load progress from database
      const completed = [];
      const scores = {};
      
      Object.keys(userData.progress).forEach(moduleId => {
        if (userData.progress[moduleId].completed) {
          completed.push(moduleId);
          if (userData.progress[moduleId].score) {
            scores[moduleId] = userData.progress[moduleId].score;
          }
        }
      });
      
      setCompletedModules(completed);
      setTrainingStats(prev => ({
        ...prev,
        moduleScores: scores,
        averageScore: Object.keys(scores).length > 0 
          ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length)
          : 0
      }));
      
      // Set current module to next incomplete one
      const modules = ['welcome', 'mastery', 'technical', 'simulation', 'certification'];
      const nextIncomplete = modules.findIndex(m => !completed.includes(m));
      if (nextIncomplete !== -1) {
        setCurrentModule(nextIncomplete);
      }
    }
  }, [userData]);
  
  // Update training stats timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTrainingStats(prev => ({
        ...prev,
        totalTime: Math.floor((Date.now() - prev.startTime) / 1000)
      }));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const handleModuleComplete = async (moduleId, score = null) => {
    const updatedModules = [...completedModules, moduleId];
    setCompletedModules(updatedModules);
    
    let newScores = { ...trainingStats.moduleScores };
    if (score !== null) {
      newScores[moduleId] = score;
    }
    
    const avgScore = Object.keys(newScores).length > 0
      ? Math.round(Object.values(newScores).reduce((a, b) => a + b, 0) / Object.keys(newScores).length)
      : 0;
    
    setTrainingStats(prev => ({
      ...prev,
      moduleScores: newScores,
      averageScore: avgScore
    }));
    
    // Update database
    await updateTrainingProgress(moduleId, {
      completed: true,
      completedAt: new Date().toISOString(),
      score: score,
      timeSpent: trainingStats.totalTime
    });
    
    if (currentModule < modules.length - 1) {
      setCurrentModule(currentModule + 1);
    }
  };
  
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Not authenticated - show login
  if (!user) {
    return <LoginScreen />;
  }
  
  // Admin user - show admin dashboard
  if (userData?.role === 'admin') {
    return <AdminDashboard />;
  }
  
  // Coach user - show training flow
  const coach = {
    name: userData?.name || user.displayName || 'Coach',
    email: user.email,
    expiresAt: userData?.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  };
  
  const student = userData?.student || {
    name: "Student",
    grade: "11th Grade",
    focusArea: "pre-med",
    culturalBackground: "Asian-American"
  };
  
  const modules = [
    { id: 'welcome', name: 'Welcome & Commitment', icon: <TargetIcon />, categoryColor: '#FF4A23' },
    { id: 'mastery', name: 'Student Mastery', icon: <BookIcon />, categoryColor: '#9698A6' }, // Personal context
    { id: 'technical', name: 'Technical Setup', icon: <TechIcon />, categoryColor: '#FFBB6D' }, // Aptitude tools
    { id: 'simulation', name: 'Session Practice', icon: <VideoIcon />, categoryColor: '#FF6E6D' }, // Passion coaching
    { id: 'certification', name: 'Final Certification', icon: <AwardIcon />, categoryColor: '#55AAAA' } // Community impact
  ];
  
  const renderModule = () => {
    switch (modules[currentModule].id) {
      case 'welcome':
        return <EnhancedWelcomeExperience coach={coach} student={student} onComplete={() => handleModuleComplete('welcome')} />;
      case 'mastery':
        return <StudentMasteryModule student={student} onComplete={(score) => handleModuleComplete('mastery', score)} />;
      case 'technical':
        return <TechnicalValidationModule coach={coach} onComplete={() => handleModuleComplete('technical')} />;
      case 'simulation':
        return <SessionSimulationModule student={student} onComplete={(score) => handleModuleComplete('simulation', score)} />;
      case 'certification':
        return <FinalCertificationModule coach={coach} student={student} trainingStats={trainingStats} onComplete={() => handleModuleComplete('certification')} />;
      default:
        return null;
    }
  };
  
  // Training completed
  if (completedModules.length === modules.length) {
    return (
      <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'}}>

      
      {/* Global Radio Button Styles */}
      <style>{`
        input[type="radio"] {
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          width: 20px;
          height: 20px;
          border: 2px solid #d1d5db !important;
          border-radius: 50% !important;
          background-color: white !important;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
          outline: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        input[type="radio"]:focus {
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
          border-color: #FF4A23 !important;
        }
        
        input[type="radio"]:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
          border-color: #FF4A23 !important;
        }
        
        input[type="radio"]:checked {
          border-color: #FF4A23 !important;
          background-color: white !important;
        }
        
        input[type="radio"]:checked::after {
          content: '';
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #FF4A23;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        input[type="radio"]:hover {
          border-color: #FF4A23 !important;
        }
        
        /* Override any other styles */
        input[type="radio"]::-moz-focus-inner {
          border: 0 !important;
        }
        
        /* Ensure radio buttons are always visible */
        input[type="radio"]:not(:checked) {
          border: 2px solid #9ca3af !important;
        }
      `}</style>
        <div style={{background: 'white', borderRadius: '20px', padding: '48px', textAlign: 'center', maxWidth: '600px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)'}}>
          <div style={{fontSize: '64px', marginBottom: '24px'}}>🎉</div>
          <h1 style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#020202', marginBottom: '16px'}}>
            Congratulations, {coach.name}!
          </h1>
          <p style={{fontSize: '1.25rem', color: '#616479', marginBottom: '32px'}}>
            You're now certified and ready to make a difference in {student.name}'s life.
          </p>
          <div style={{background: '#f3f4f6', borderRadius: '12px', padding: '24px', marginBottom: '32px'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <div>
                <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23'}}>{formatTime(trainingStats.totalTime)}</div>
                <div style={{fontSize: '0.875rem', color: '#616479'}}>Training Time</div>
              </div>
              <div>
                <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23'}}>{trainingStats.averageScore}%</div>
                <div style={{fontSize: '0.875rem', color: '#616479'}}>Average Score</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '1.125rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(255, 74, 35, 0.3)'
            }}
          >
            Go to Coach Dashboard →
          </button>
        </div>
      </div>
    );
  }
  
  // Active training
  return (
    <div style={{minHeight: '100vh', background: '#F5F5F5'}}>
      {/* Header */}
      <div style={{background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <IvylevelFullLogo style={{height: '32px'}} />
            <div style={{fontSize: '0.875rem', color: '#616479'}}>Coach Training Platform</div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '0.875rem', color: '#616479'}}>Training Time</div>
              <div style={{fontFamily: 'monospace', fontWeight: 'bold'}}>{formatTime(trainingStats.totalTime)}</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '0.875rem', color: '#616479'}}>Deadline</div>
              <div style={{fontWeight: 'bold', color: '#dc2626'}}>
                {Math.floor((new Date(coach.expiresAt) - new Date()) / (1000 * 60 * 60))}h remaining
              </div>
            </div>
            <button
              onClick={() => logout()}
              style={{
                padding: '8px 16px',
                background: '#FF4A23',
                color: 'white',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div style={{background: 'white', borderBottom: '1px solid #e5e7eb', padding: '24px'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px'}}>
            {modules.map((module, idx) => (
              <div key={module.id} style={{flex: 1, textAlign: 'center'}}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  margin: '0 auto 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  background: completedModules.includes(module.id) ? '#10b981' :
                             idx === currentModule ? '#FF4A23' :
                             '#e5e7eb',
                  color: completedModules.includes(module.id) || idx === currentModule ? 'white' : '#9ca3af',
                  transition: 'all 0.3s ease',
                  boxShadow: idx === currentModule ? '0 10px 20px rgba(255, 74, 35, 0.2)' : 'none'
                }}>
                  {completedModules.includes(module.id) ? '✓' : module.icon}
                </div>
                <div style={{fontSize: '0.875rem', fontWeight: idx === currentModule ? '600' : '400', color: idx === currentModule ? '#111827' : '#6b7280'}}>
                  {module.name}
                </div>
              </div>
            ))}
          </div>
          <div style={{width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden'}}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
              borderRadius: '4px',
              width: `${((completedModules.length + (currentModule === modules.length - 1 ? 1 : 0)) / modules.length) * 100}%`,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </div>
      
      {/* Module Content */}
      <div style={{paddingTop: '32px'}}>
        {renderModule()}
      </div>
    </div>
  );
};

// Module Components (these would normally be in separate files)

const EnhancedWelcomeExperience = ({ coach, student, onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [commitment, setCommitment] = useState(false);
  
  // Icon components
  const DollarSign = () => (
    <svg style={{width: '24px', height: '24px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  
  
  
  
  
  
  
  
  
  const ChevronRight = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
  
  const Clock = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12,6 12,12 16,14"></polyline>
    </svg>
  );
  
  const Trophy = () => (
    <svg style={{width: '48px', height: '48px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
  
  const slides = [
    {
      type: 'impact',
      title: `${coach.name}, You're About to Change ${student.name}'s Life`,
      content: (
        <div style={{textAlign: 'center'}}>
          <div style={{marginBottom: '32px'}}>
            <img 
              src={`https://ui-avatars.com/api/?name=${student.name}&size=120&background=FF4A23&color=fff&rounded=true`}
              style={{margin: '0 auto 16px', display: 'block'}}
              alt="Student"
            />
            <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#020202', marginBottom: '8px'}}>{student.name}</h3>
            <p style={{fontSize: '1.125rem', color: '#616479'}}>{student.grade} • {student.focusArea} Track</p>
          </div>
          
          <div style={{background: '#FFE5DF', borderRadius: '12px', padding: '24px', marginBottom: '24px'}}>
            <p style={{fontSize: '1.125rem', color: '#D63A1A', lineHeight: '1.6'}}>
              "{student.name} dreams of becoming a {student.focusArea === 'pre-med' ? 'doctor' : 'tech innovator'}. 
              Their family is counting on you to guide them to their dream college. 
              <span style={{fontWeight: 'bold', color: '#FF4A23'}}> You are their key to success.</span>"
            </p>
          </div>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center'}}>
            <div style={{background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23'}}>3.7</div>
              <div style={{fontSize: '0.875rem', color: '#616479'}}>Current GPA</div>
            </div>
            <div style={{background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23'}}>1350</div>
              <div style={{fontSize: '0.875rem', color: '#616479'}}>SAT Score</div>
            </div>
            <div style={{background: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#FF4A23'}}>Top 15%</div>
              <div style={{fontSize: '0.875rem', color: '#616479'}}>Class Rank</div>
            </div>
          </div>
        </div>
      )
    },
    {
      type: 'earnings',
      title: 'Your Earning Potential Starts NOW',
      content: (
        <div>
          <div style={{background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', borderRadius: '12px', padding: '32px', color: 'white', marginBottom: '24px'}}>
            <div style={{textAlign: 'center', marginBottom: '24px'}}>
              <DollarSign style={{width: '64px', height: '64px', margin: '0 auto 16px'}} />
              <div style={{fontSize: '3rem', fontWeight: 'bold', marginBottom: '8px'}}>$25,000</div>
              <div style={{fontSize: '1.25rem', opacity: 0.9}}>Annual Earning Potential</div>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '32px'}}>
              <div style={{background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '16px'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>$2,100</div>
                <div style={{fontSize: '0.875rem', opacity: 0.9}}>Monthly Average</div>
              </div>
              <div style={{background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '16px'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>$125</div>
                <div style={{fontSize: '0.875rem', opacity: 0.9}}>Per Session</div>
              </div>
            </div>
          </div>
          
          <div style={{background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '16px', marginBottom: '16px'}}>
            <p style={{fontSize: '0.875rem', fontWeight: '500', color: '#92400e'}}>
              <Trophy style={{display: 'inline', marginRight: '4px', verticalAlign: 'middle'}} /> Top Coach Spotlight: Sarah M. earned $2,850 last month with 95% student satisfaction
            </p>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f3f4f6', borderRadius: '8px'}}>
              <span style={{fontSize: '0.875rem', fontWeight: '500'}}>Complete Training</span>
              <span style={{fontSize: '0.875rem', color: '#FF4A23', fontWeight: 'bold'}}>+$500 bonus</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f3f4f6', borderRadius: '8px'}}>
              <span style={{fontSize: '0.875rem', fontWeight: '500'}}>First Successful Session</span>
              <span style={{fontSize: '0.875rem', color: '#FF4A23', fontWeight: 'bold'}}>+$250 bonus</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f3f4f6', borderRadius: '8px'}}>
              <span style={{fontSize: '0.875rem', fontWeight: '500'}}>90-Day Retention</span>
              <span style={{fontSize: '0.875rem', color: '#FF4A23', fontWeight: 'bold'}}>+$750 bonus</span>
            </div>
          </div>
        </div>
      )
    },
    {
      type: 'commitment',
      title: 'Your Ivylevel Coach Commitment',
      content: (
        <div>
          <div style={{background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', borderRadius: '12px', padding: '24px', color: 'white', marginBottom: '24px'}}>
            <Trophy style={{margin: '0 auto 16px', display: 'block'}} />
            <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px'}}>The Ivylevel Excellence Standard</h3>
            <p style={{opacity: 0.9}}>
              You're joining the top 10% of selected coaches. Our students' success is your success.
            </p>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f3f4f6', borderRadius: '8px', cursor: 'pointer'}}>
              <input
                type="checkbox"
                checked={commitment}
                onChange={(e) => setCommitment(e.target.checked)}
                style={{width: '20px', height: '20px', flexShrink: 0}}
              />
              <div>
                <p style={{fontWeight: '500', color: '#020202'}}>I commit to excellence</p>
                <p style={{fontSize: '0.875rem', color: '#616479', marginTop: '4px'}}>
                  I will complete all training modules thoroughly and be fully prepared for {student.name}'s success
                </p>
              </div>
            </label>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <HeartIcon style={{color: '#dc2626'}} />
              <p style={{color: '#616479'}}>
                I commit to putting {student.name}'s growth and wellbeing first in every session
              </p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <StarIcon style={{color: '#FF4A23'}} />
              <p style={{color: '#616479'}}>
                I will maintain the highest standards of professionalism and confidentiality
              </p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <TargetIcon style={{color: '#FF4A23'}} />
              <p style={{color: '#616479'}}>
                I will work tirelessly to help {student.name} achieve their college dreams
              </p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <ServiceIcon style={{color: '#FF4A23'}} />
              <p style={{color: '#616479'}}>
                I will collaborate respectfully with parents while protecting student autonomy
              </p>
            </div>
          </div>
          
          <div style={{background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
              <Clock style={{color: '#dc2626'}} />
              <span style={{fontWeight: 'bold', color: '#dc2626'}}>48-HOUR DEADLINE</span>
            </div>
            <p style={{fontSize: '0.875rem', color: '#dc2626'}}>
              Complete all training by {new Date(coach.expiresAt).toLocaleString()} or lose your position
            </p>
          </div>
          
          <button
            onClick={onComplete}
            disabled={!commitment}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '1.125rem',
              transition: 'all 0.2s ease',
              background: commitment 
                ? 'linear-gradient(135deg, #FF4A23, #FF6B47)' 
                : '#d1d5db',
              color: commitment ? 'white' : '#9ca3af',
              cursor: commitment ? 'pointer' : 'not-allowed',
              border: 'none',
              boxShadow: commitment ? '0 10px 20px rgba(255, 74, 35, 0.2)' : 'none',
              transform: commitment ? 'translateY(-1px)' : 'none'
            }}
          >
            {commitment ? "I'm Ready - Start My Journey! 🚀" : "Check the box to continue"}
          </button>
        </div>
      )
    }
  ];
  
  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #FFE5DF, #FFF5F2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'}}>
        
  <style jsx>{`
    input[type="radio"]:checked {
      accent-color: #FF4A23;
    }
    input[type="radio"]:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
      border-color: #FF4A23 !important;
    }
    input[type="checkbox"]:checked {
      accent-color: #FF4A23;
    }
    input[type="checkbox"]:focus {
      outline: 2px solid #FF4A23;
      outline-offset: 2px;
    }
    /* Remove blue focus outlines globally */
    *:focus {
      outline-color: #FF4A23;
    }
    /* Custom checkbox styling for better browser support */
    input[type="checkbox"] {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }
    input[type="checkbox"]:checked {
      background-color: #FF4A23;
      border-color: #FF4A23;
    }
    input[type="checkbox"]:checked::after {
      content: '✓';
      position: absolute;
      color: white;
      font-size: 14px;
      font-weight: bold;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    input[type="checkbox"]:hover {
      border-color: #FF4A23;
    }
  `}</style>
      <div style={{background: 'white', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxWidth: '600px', width: '100%', overflow: 'hidden'}}>
        {/* Progress Bar */}
        <div style={{height: '8px', background: '#e5e7eb'}}>
          <div 
            style={{
              height: '100%',
              background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
              transition: 'width 0.5s ease',
              width: `${((currentSlide + 1) / slides.length) * 100}%`
            }}
          />
        </div>
        
        <div style={{padding: '32px'}}>
          <div style={{marginBottom: '32px'}}>
            <h2 style={{fontSize: '2rem', fontWeight: 'bold', color: '#020202', marginBottom: '16px'}}>
              {slides[currentSlide].title}
            </h2>
            {slides[currentSlide].content}
          </div>
          
          {/* Navigation */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px'}}>
            <button
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: currentSlide === 0 ? '#f3f4f6' : '#e5e7eb',
                color: currentSlide === 0 ? '#9ca3af' : '#374151',
                border: 'none',
                cursor: currentSlide === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            
            <div style={{display: 'flex', gap: '8px'}}>
              {slides.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: idx === currentSlide ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                    background: idx === currentSlide ? '#FF4A23' : '#d1d5db'
                  }}
                />
              ))}
            </div>
            
            {currentSlide < slides.length - 1 && (
              <button
                onClick={() => setCurrentSlide(currentSlide + 1)}
                style={{
                  padding: '8px 16px',
                  background: '#FF4A23',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Next <ChevronRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentMasteryModule = ({ student, onComplete }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [scenarioResponses, setScenarioResponses] = useState({});
  const [masteryScore, setMasteryScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [resourceHubProgress, setResourceHubProgress] = useState(0);
  const [resourceHubProgress, setResourceHubProgress] = useState(0);
  
  // Icon components
  const User = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
  
  const Brain = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
  
  
  
  const Award = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15l-2 5-8-5 8-15 8 15-8 5-2-5z" />
    </svg>
  );
  
  const ChevronRight = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
  
  const Check = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
  
  const X = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
  
  const AlertCircle = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
    </svg>
  );
  
  const BookOpen = () => (
    <svg style={{width: '32px', height: '32px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
  
  const Lightbulb = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
  
  const sections = [
    {
      id: 'profile-deep-dive',
      title: 'Profile Deep Dive',
      type: 'interactive-review',
      content: {
        overview: {
          name: student.name,
          grade: student.grade,
          focus: student.focusArea,
          gpa: '3.7',
          satScore: '1350',
          weaknesses: ['Time management', 'Essay writing'],
          strengths: ['STEM subjects', 'Leadership'],
          parentExpectations: 'Ivy League acceptance',
          culturalContext: student.culturalBackground
        }
      }
    },
    {
      id: 'resource-hub',
      title: 'Personalized Resources',
      type: 'resource-hub',
      content: {}
    },
    {
      id: 'resource-hub',
      title: 'Personalized Resources',
      type: 'resource-hub',
      content: {}
    },
    {
      id: 'comprehension-check',
      title: 'Comprehension Check',
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          question: `What is ${student.name}'s primary academic weakness that needs immediate attention?`,
          options: [
            'Mathematics performance',
            'Time management',
            'Science grades',
            'Extracurricular activities'
          ],
          correct: 1,
          explanation: 'Time management is critical for balancing their rigorous course load.'
        },
        {
          id: 'q2',
          question: `Given ${student.name}'s ${student.focusArea} focus, which standardized test should be prioritized?`,
          options: [
            'AP Biology and Chemistry',
            'SAT Subject Tests only',
            'ACT over SAT',
            'TOEFL examination'
          ],
          correct: 0,
          explanation: `For ${student.focusArea} track students, AP sciences are crucial for college applications.`
        },
        {
          id: 'q3',
          question: 'What cultural consideration is most important for parent communications?',
          options: [
            'Email-only communication',
            'Emphasizing prestige and rankings',
            'Avoiding direct feedback',
            'Informal communication style'
          ],
          correct: 1,
          explanation: `${student.culturalBackground} families often prioritize institutional prestige.`
        }
      ]
    },
    {
      id: 'scenario-practice',
      title: 'Real Scenario Practice',
      type: 'scenarios',
      scenarios: [
        {
          id: 's1',
          situation: `${student.name} says: "My parents want me to apply to only Ivy League schools, but my SAT score isn't high enough. I'm stressed and don't know what to do."`,
          responseOptions: [
            {
              text: "Don't worry about it, there are many great schools beyond the Ivies.",
              score: 0,
              feedback: "Too dismissive of family expectations. Try acknowledging their goals first."
            },
            {
              text: "Let's create a strategic plan to improve your SAT score while also identifying target and safety schools that align with your goals.",
              score: 100,
              feedback: "Perfect! You acknowledged the goal while providing practical solutions."
            },
            {
              text: "Your parents need to be more realistic about college admissions.",
              score: 0,
              feedback: "Never criticize parents directly. Focus on student empowerment."
            }
          ]
        },
        {
          id: 's2',
          situation: `During a session, ${student.name} breaks down crying: "I got a B+ in AP Chemistry. My parents are going to be so disappointed. I'm a failure."`,
          responseOptions: [
            {
              text: "A B+ is still a good grade! Don't be so hard on yourself.",
              score: 30,
              feedback: "While positive, this minimizes their feelings. Acknowledge the emotion first."
            },
            {
              text: "I understand this feels overwhelming. Let's talk about what happened and create a plan to improve while maintaining perspective on your overall strong performance.",
              score: 100,
              feedback: "Excellent! You validated feelings while staying solution-focused."
            },
            {
              text: "One B+ won't ruin your college chances. You're overreacting.",
              score: 0,
              feedback: "Dismissive and unhelpful. Always validate student emotions."
            }
          ]
        }
      ]
    }
  ];
  
  const currentSectionData = sections[currentSection];
  
  const handleQuizAnswer = (questionId, answerIndex) => {
    setQuizAnswers({ ...quizAnswers, [questionId]: answerIndex });
  };
  
  const handleScenarioResponse = (scenarioId, responseIndex, score) => {
    setScenarioResponses({ 
      ...scenarioResponses, 
      [scenarioId]: { index: responseIndex, score } 
    });
  };
  
  const calculateMastery = () => {
    let totalScore = 0;
    let maxScore = 0;
    
    // Quiz scores
    sections[1].questions.forEach(q => {
      maxScore += 100;
      if (quizAnswers[q.id] === q.correct) {
        totalScore += 100;
      }
    });
    
    // Scenario scores
    Object.values(scenarioResponses).forEach(response => {
      totalScore += response.score;
    });
    maxScore += sections[2].scenarios.length * 100;
    
    const finalScore = Math.round((totalScore / maxScore) * 100);
    setMasteryScore(finalScore);
    setShowFeedback(true);
  };
  
  const renderSection = () => {
    switch (currentSectionData.type) {
      case 'interactive-review':
        return (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
        
  <style jsx>{`
    input[type="radio"]:checked {
      accent-color: #FF4A23;
    }
    input[type="radio"]:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
      border-color: #FF4A23 !important;
    }
    input[type="checkbox"]:checked {
      accent-color: #FF4A23;
    }
    input[type="checkbox"]:focus {
      outline: 2px solid #FF4A23;
      outline-offset: 2px;
    }
    /* Remove blue focus outlines globally */
    *:focus {
      outline-color: #FF4A23;
    }
    /* Custom checkbox styling for better browser support */
    input[type="checkbox"] {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }
    input[type="checkbox"]:checked {
      background-color: #FF4A23;
      border-color: #FF4A23;
    }
    input[type="checkbox"]:checked::after {
      content: '✓';
      position: absolute;
      color: white;
      font-size: 14px;
      font-weight: bold;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    input[type="checkbox"]:hover {
      border-color: #FF4A23;
    }
  `}</style>
            <div style={{background: 'linear-gradient(135deg, #FFE5DF, #FFF5F2)', borderRadius: '12px', padding: '24px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px'}}>
                <img 
                  src={`https://ui-avatars.com/api/?name=${student.name}&size=80&background=FF4A23&color=fff&rounded=true`}
                  alt="Student"
                  style={{}}
                />
                <div>
                  <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#020202'}}>{student.name}</h3>
                  <p style={{color: '#616479'}}>{student.grade} • {student.focusArea} Track</p>
                </div>
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <div style={{background: 'white', borderRadius: '8px', padding: '16px'}}>
                  <h4 style={{fontWeight: '600', color: '#616479', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <TargetIcon />
                    Academic Profile
                  </h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: '#616479'}}>GPA:</span>
                      <span style={{fontWeight: '500'}}>{currentSectionData.content.overview.gpa}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span style={{color: '#616479'}}>SAT:</span>
                      <span style={{fontWeight: '500'}}>{currentSectionData.content.overview.satScore}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{background: 'white', borderRadius: '8px', padding: '16px'}}>
                  <h4 style={{fontWeight: '600', color: '#616479', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Brain />
                    Key Focus Areas
                  </h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    {currentSectionData.content.overview.weaknesses.map((weakness, idx) => (
                      <div key={idx} style={{fontSize: '0.875rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <X />
                        {weakness}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{marginTop: '16px', padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24'}}>
                <h4 style={{fontWeight: '600', color: '#92400e', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <AlertCircle />
                  Critical Context
                </h4>
                <p style={{fontSize: '0.875rem', color: '#92400e'}}>
                  {student.culturalBackground} family with high expectations for {student.focusArea} career path. 
                  Parent involvement is high - balance encouragement with realistic goal-setting.
                </p>
              </div>
            </div>
            
            <div style={{background: '#FFE5DF', borderRadius: '8px', padding: '16px'}}>
              <p style={{fontSize: '0.875rem', color: '#D63A1A'}}>
                <strong>Your Mission:</strong> Guide {student.name} to improve their weaknesses while 
                maintaining their strengths and managing family expectations constructively.
              </p>
            </div>
          </div>
        );
        
      case 'resource-hub':
        return (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <div style={{background: '#FFE5DF', borderRadius: '8px', padding: '16px'}}>
              <p style={{fontSize: '0.875rem', color: '#D63A1A'}}>
                <strong>Important:</strong> Review these personalized resources before working with {student.name}. 
                This includes their game plan, relevant training videos, and similar student success stories.
              </p>
            </div>
            <SmartResourceHub 
              student={student} 
              coach={{name: 'Coach'}} 
              onProgress={(type, progress) => setResourceHubProgress(progress)} 
            />
          </div>
        );
        
      case 'resource-hub':
        return (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <div style={{background: '#FFE5DF', borderRadius: '8px', padding: '16px'}}>
              <p style={{fontSize: '0.875rem', color: '#D63A1A'}}>
                <strong>Important:</strong> Review these personalized resources before working with {student.name}. 
                This includes their game plan, relevant training videos, and similar student success stories.
              </p>
            </div>
            <SmartResourceHub 
              student={student} 
              coach={{name: 'Coach'}} 
              onProgress={(type, progress) => setResourceHubProgress(progress)} 
            />
          </div>
        );
        
      case 'quiz':
        return (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            {currentSectionData.questions.map((question, qIdx) => (
              <div key={question.id} style={{background: '#f3f4f6', borderRadius: '8px', padding: '24px'}}>
                <h4 style={{fontWeight: '600', color: '#020202', marginBottom: '16px'}}>
                  Question {qIdx + 1}: {question.question}
                </h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {question.options.map((option, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: quizAnswers[question.id] === idx ? '#FF4A23' : '#d1d5db',
                        background: quizAnswers[question.id] === idx ? '#FFE5DF' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input type="radio"  onFocus={(e) => { e.target.style.outline = 'none'; e.target.style.boxShadow = '0 0 0 3px rgba(255, 74, 35, 0.1)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
                        name={question.id}
                        value={idx}
                        checked={quizAnswers[question.id] === idx}
                        onChange={() => handleQuizAnswer(question.id, idx)}
                        style={{marginRight: '12px', outline: 'none', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none'}}
                      />
                      <span style={{color: '#616479'}}>{option}</span>
                    </label>
                  ))}
                </div>
                {showFeedback && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: quizAnswers[question.id] === question.correct ? '#dcfce7' : '#fecaca',
                    color: quizAnswers[question.id] === question.correct ? '#FF4A23' : '#dc2626'
                  }}>
                    {quizAnswers[question.id] === question.correct ? (
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <Check style={{color: '#319795'}} />
                          <span>Correct! {question.explanation}</span>
                      </div>
                    ) : (
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <X style={{color: '#dc2626'}} />
                          <span>Incorrect. {question.explanation}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
        
      case 'scenarios':
        return (
          <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>
            {currentSectionData.scenarios.map((scenario, sIdx) => (
              <div key={scenario.id} style={{background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', padding: '24px'}}>
                <div style={{marginBottom: '16px'}}>
                  <h4 style={{fontWeight: '600', color: '#020202', marginBottom: '8px'}}>
                    Scenario {sIdx + 1}
                  </h4>
                  <div style={{background: '#f3f4f6', borderRadius: '8px', padding: '16px', fontStyle: 'italic', color: '#616479'}}>
                    "{scenario.situation}"
                  </div>
                </div>
                
                <h5 style={{fontWeight: '500', color: '#616479', marginBottom: '12px'}}>How would you respond?</h5>
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {scenario.responseOptions.map((response, idx) => (
                    <div key={idx}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: scenarioResponses[scenario.id]?.index === idx ? '#FF4A23' : '#d1d5db',
                          background: scenarioResponses[scenario.id]?.index === idx ? '#FFE5DF' : '#f3f4f6',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input type="radio"  onFocus={(e) => { e.target.style.outline = 'none'; e.target.style.boxShadow = '0 0 0 3px rgba(255, 74, 35, 0.1)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
                          name={scenario.id}
                          value={idx}
                          checked={scenarioResponses[scenario.id]?.index === idx}
                          onChange={() => handleScenarioResponse(scenario.id, idx, response.score)}
                          style={{marginRight: '12px', marginTop: '2px'}}
                        />
                        <span style={{color: '#616479'}}>{response.text}</span>
                      </label>
                      {showFeedback && scenarioResponses[scenario.id]?.index === idx && (
                        <div style={{
                          marginTop: '8px',
                          marginLeft: '28px',
                          padding: '12px',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          background: response.score === 100 ? '#d1fae5' : 
                                     response.score > 0 ? '#fef3c7' : '#fecaca',
                          color: response.score === 100 ? '#FF4A23' : 
                                response.score > 0 ? '#92400e' : '#dc2626'
                        }}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <Lightbulb style={{}} />
                            <span>{response.feedback}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div style={{maxWidth: '1024px', margin: '0 auto', padding: '24px'}}>
      <div style={{background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)', overflow: 'hidden'}}>
        
  <style jsx>{`
    input[type="radio"]:checked {
      accent-color: #FF4A23;
    }
    input[type="radio"]:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
      border-color: #FF4A23 !important;
    }
    input[type="checkbox"]:checked {
      accent-color: #FF4A23;
    }
    input[type="checkbox"]:focus {
      outline: 2px solid #FF4A23;
      outline-offset: 2px;
    }
    /* Remove blue focus outlines globally */
    *:focus {
      outline-color: #FF4A23;
    }
  `}</style>
        {/* Progress Header */}
        <div style={{background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', color: 'white', padding: '24px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <BookOpen />
              Student Mastery Module
            </h2>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '0.875rem', opacity: 0.9}}>Section {currentSection + 1} of {sections.length}</div>
              <div style={{fontSize: '1.125rem', fontWeight: '600'}}>{currentSectionData.title}</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div style={{width: '100%', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', height: '12px'}}>
            <div 
              style={{
                background: 'white',
                borderRadius: '4px',
                height: '12px',
                transition: 'width 0.5s ease',
                width: `${((currentSection + 1) / sections.length) * 100}%`
              }}
            />
          </div>
        </div>
        
        {/* Content */}
        <div style={{padding: '32px'}}>
          {!showFeedback ? (
            <>
              {renderSection()}
              
              {/* Navigation */}
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb'}}>
                <button
                  onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                  disabled={currentSection === 0}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    background: currentSection === 0 ? '#f3f4f6' : '#e5e7eb',
                    color: currentSection === 0 ? '#9ca3af' : '#374151',
                    border: 'none',
                    cursor: currentSection === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                
                {currentSection < sections.length - 1 ? (
                  <button
                    onClick={() => setCurrentSection(currentSection + 1)}
                    style={{
                      padding: '12px 24px',
                      background: '#FF4A23',
                      color: 'white',
                      borderRadius: '8px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    Next Section <ChevronRight />
                  </button>
                ) : (
                  <button
                    onClick={calculateMastery}
                    disabled={Object.keys(quizAnswers).length < 3 || Object.keys(scenarioResponses).length < 2 || (sections.some(s => s.id === 'resource-hub') && resourceHubProgress < 100)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: (Object.keys(quizAnswers).length < 3 || Object.keys(scenarioResponses).length < 2 || (sections.some(s => s.id === 'resource-hub') && resourceHubProgress < 100))
                        ? '#d1d5db'
                        : '#FF4A23',
                      color: (Object.keys(quizAnswers).length < 3 || Object.keys(scenarioResponses).length < 2 || (sections.some(s => s.id === 'resource-hub') && resourceHubProgress < 100))
                        ? '#9ca3af'
                        : 'white',
                      border: 'none',
                      cursor: (Object.keys(quizAnswers).length < 3 || Object.keys(scenarioResponses).length < 2 || (sections.some(s => s.id === 'resource-hub') && resourceHubProgress < 100))
                        ? 'not-allowed'
                        : 'pointer'
                    }}
                  >
                    Complete Assessment <Award />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Final Results */
            <div style={{textAlign: 'center', padding: '32px 0'}}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '128px',
                height: '128px',
                borderRadius: '50%',
                marginBottom: '24px',
                background: masteryScore >= 80 ? '#d1fae5' : masteryScore >= 60 ? '#fef3c7' : '#fecaca'
              }}>
                <div style={{textAlign: 'center'}}>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: masteryScore >= 80 ? '#FF4A23' : masteryScore >= 60 ? '#d97706' : '#dc2626'
                  }}>
                    {masteryScore}%
                  </div>
                  <div style={{fontSize: '0.875rem', color: '#616479'}}>Mastery Score</div>
                </div>
              </div>
              
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px'}}>
                {masteryScore >= 80 ? 'Excellent Understanding!' : masteryScore >= 60 ? 'Good Progress!' : 'Review Needed'}
              </h3>
              
              <p style={{color: '#616479', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px'}}>
                {masteryScore >= 80 
                  ? `You've demonstrated strong understanding of ${student.name}'s needs and how to support them effectively.`
                  : `Review the feedback above to better understand ${student.name}'s specific needs and coaching approach.`
                }
              </p>
              
              {masteryScore >= 80 ? (
                <button
                  onClick={() => onComplete(masteryScore)}
                  style={{
                    padding: '16px 32px',
                    background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 10px 20px rgba(255, 74, 35, 0.3)'
                  }}
                >
                  Continue to Technical Setup →
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCurrentSection(0);
                    setShowFeedback(false);
                    setQuizAnswers({});
                    setScenarioResponses({});
                  }}
                  style={{
                    padding: '16px 32px',
                    background: '#FF4A23',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Review Material Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TechnicalValidationModule = ({ coach, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [validations, setValidations] = useState({
    email: { status: 'pending', evidence: null, score: 0 },
    zoom: { status: 'pending', evidence: null, score: 0 },
    payment: { status: 'pending', evidence: null, score: 0 },
    techCheck: { status: 'pending', evidence: null, score: 0 }
  });
  const [isValidating, setIsValidating] = useState(false);
  
  // Icon components
  const Mail = () => (
    <svg style={{width: '24px', height: '24px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
  
  const Video = () => (
    <svg style={{width: '24px', height: '24px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
  
  const DollarSign = () => (
    <svg style={{width: '24px', height: '24px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  
  const Monitor = () => (
    <svg style={{width: '24px', height: '24px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  );
  
  const Check = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
  
  const Camera = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  
  const Upload = () => (
    <svg style={{width: '48px', height: '48px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
  
  const Loader = () => (
    <svg style={{width: '16px', height: '16px', animation: 'spin 1s linear infinite'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
  
  
  
  const ArrowRight = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
  
  const Clock = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12,6 12,12 16,14"></polyline>
    </svg>
  );
  
  const steps = [
    {
      id: 'email',
      title: 'Professional Email Setup',
      icon: Mail,
      description: 'Configure your Ivylevel email for student communication',
      requirements: [
        'Professional signature with title and contact',
        'Calendar integration enabled',
        'Auto-responder for off-hours',
        'Forwarding to personal email (optional)'
      ],
      validation: {
        type: 'screenshot',
        instruction: 'Take a screenshot showing your email signature and calendar integration'
      }
    },
    {
      id: 'zoom',
      title: 'Zoom Professional Setup',
      icon: Video,
      description: 'Optimize your Zoom for professional coaching sessions',
      requirements: [
        'Professional background (virtual or real)',
        'Proper lighting setup',
        'Clear audio without echo',
        'Stable internet connection (25+ Mbps)',
        'Waiting room enabled',
        'Recording settings configured'
      ],
      validation: {
        type: 'live-test',
        instruction: 'Complete a live Zoom test to verify setup quality'
      }
    },
    {
      id: 'payment',
      title: 'Mercury Payment Account',
      icon: DollarSign,
      description: 'Set up your payment account for seamless compensation',
      requirements: [
        'Mercury account created',
        'Bank account linked',
        'Tax information submitted',
        'Direct deposit enabled'
      ],
      validation: {
        type: 'screenshot',
        instruction: 'Screenshot your Mercury dashboard (hide sensitive info)'
      }
    },
    {
      id: 'techCheck',
      title: 'Full Tech Readiness',
      icon: Monitor,
      description: 'Ensure all technical requirements are met',
      requirements: [
        'Computer with webcam',
        'Backup device ready',
        'Stable internet (25+ Mbps)',
        'Quiet coaching space',
        'Professional headset',
        'Document sharing setup'
      ],
      validation: {
        type: 'checklist',
        instruction: 'Complete the technical readiness checklist'
      }
    }
  ];
  
  const currentStepData = steps[currentStep];
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsValidating(true);
      
      // Simulate validation
      setTimeout(() => {
        const stepId = currentStepData.id;
        setValidations(prev => ({
          ...prev,
          [stepId]: {
            status: 'success',
            evidence: URL.createObjectURL(file),
            score: 100,
            timestamp: new Date().toISOString()
          }
        }));
        setIsValidating(false);
      }, 2000);
    }
  };
  
  const handleLiveTest = () => {
    setIsValidating(true);
    
    // Simulate Zoom test
    setTimeout(() => {
      // Mock test results
      const testResults = {
        video: { quality: 'HD', score: 95 },
        audio: { quality: 'Clear', score: 90 },
        internet: { speed: '45 Mbps', score: 100 },
        background: { professional: true, score: 100 }
      };
      
      const avgScore = Math.round(
        Object.values(testResults).reduce((acc, test) => acc + test.score, 0) / 
        Object.values(testResults).length
      );
      
      setValidations(prev => ({
        ...prev,
        zoom: {
          status: avgScore >= 80 ? 'success' : 'error',
          evidence: testResults,
          score: avgScore,
          timestamp: new Date().toISOString()
        }
      }));
      setIsValidating(false);
    }, 3000);
  };
  
  const [checklistState, setChecklistState] = useState({
    computer: false,
    backup: false,
    internet: false,
    space: false,
    headset: false,
    documents: false
  });
  
  const handleChecklistComplete = (checks) => {
    const completedCount = Object.values(checks).filter(Boolean).length;
    const totalCount = Object.keys(checks).length;
    const score = Math.round((completedCount / totalCount) * 100);
    
    setValidations(prev => ({
      ...prev,
      techCheck: {
        status: score === 100 ? 'success' : score >= 80 ? 'warning' : 'error',
        evidence: checks,
        score: score,
        timestamp: new Date().toISOString()
      }
    }));
  };
  
  const renderValidationContent = () => {
    const validation = validations[currentStepData.id];
    
    switch (currentStepData.validation.type) {
      case 'screenshot':
        return (
          <div style={{background: '#f3f4f6', borderRadius: '8px', padding: '24px'}}>
        
  <style jsx>{`
    input[type="radio"]:checked {
      accent-color: #FF4A23;
    }
    input[type="radio"]:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
      border-color: #FF4A23 !important;
    }
    input[type="checkbox"]:checked {
      accent-color: #FF4A23;
    }
    input[type="checkbox"]:focus {
      outline: 2px solid #FF4A23;
      outline-offset: 2px;
    }
    /* Remove blue focus outlines globally */
    *:focus {
      outline-color: #FF4A23;
    }
    /* Custom checkbox styling for better browser support */
    input[type="checkbox"] {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }
    input[type="checkbox"]:checked {
      background-color: #FF4A23;
      border-color: #FF4A23;
    }
    input[type="checkbox"]:checked::after {
      content: '✓';
      position: absolute;
      color: white;
      font-size: 14px;
      font-weight: bold;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    input[type="checkbox"]:hover {
      border-color: #FF4A23;
    }
  `}</style>
            <h4 style={{fontWeight: '600', color: '#020202', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Camera style={{verticalAlign: 'middle', marginRight: '4px'}} />Screenshot Validation
            </h4>
            
            {validation.status === 'pending' ? (
              <div>
                <p style={{color: '#616479', marginBottom: '16px'}}>{currentStepData.validation.instruction}</p>
                
                <div style={{border: '2px dashed #d1d5db', borderRadius: '8px', padding: '32px', textAlign: 'center'}}>
                  <Upload style={{margin: '0 auto 16px', color: '#9ca3af'}} />
                  <p style={{color: '#616479', marginBottom: '16px'}}>Upload your screenshot</p>
                  
                  <label htmlFor="file-upload" style={{display: 'inline-block'}}>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{display: 'none'}}
                    />
                    
                    <span
                      style={{
                        padding: '8px 24px',
                        background: isValidating ? '#9ca3af' : '#FF4A23',
                        color: 'white',
                        borderRadius: '8px',
                        cursor: isValidating ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {isValidating ? (
                        <>
                          <Loader />
                          Validating...
                        </>
                      ) : (
                        'Choose File'
                      )}
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  background: validation.status === 'success' ? '#d1fae5' : '#fecaca'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Check style={{color: '#FF4A23'}} />
                    <span style={{
                      fontWeight: '500',
                      color: '#FF4A23'
                    }}>
                      Validated Successfully!
                    </span>
                  </div>
                </div>
                
                {validation.evidence && (
                  <img 
                    src={validation.evidence} 
                    alt="Screenshot evidence" 
                    style={{width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'}}
                  />
                )}
              </div>
            )}
          </div>
        );
        
      case 'live-test':
        return (
          <div style={{background: '#f3f4f6', borderRadius: '8px', padding: '24px'}}>
            <h4 style={{fontWeight: '600', color: '#020202', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Video />
              Live Zoom Test
            </h4>
            
            {validation.status === 'pending' ? (
              <div>
                <p style={{color: '#616479', marginBottom: '24px'}}>{currentStepData.validation.instruction}</p>
                
                <div style={{background: '#FFE5DF', border: '1px solid #FFBB6D', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
                  <h5 style={{fontWeight: '500', color: '#D63A1A', marginBottom: '8px'}}>Test Requirements:</h5>
                  <ul style={{margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: '#D63A1A'}}>
                    <li>Ensure good lighting (face clearly visible)</li>
                    <li>Test audio (no echo or background noise)</li>
                    <li>Check internet stability</li>
                    <li>Verify professional background</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleLiveTest}
                  disabled={isValidating}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: isValidating ? '#9ca3af' : 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                    color: 'white',
                    borderRadius: '8px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: isValidating ? 'not-allowed' : 'pointer',
                    boxShadow: isValidating ? 'none' : '0 10px 20px rgba(37, 99, 235, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isValidating ? (
                    <>
                      <Loader />
                      Running Live Test...
                    </>
                  ) : (
                    'Start Live Zoom Test'
                  )}
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  background: validation.status === 'success' ? '#d1fae5' : '#fecaca'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <Check style={{color: '#FF4A23'}} />
                      <span style={{
                        fontWeight: '500',
                        color: '#FF4A23'
                      }}>
                        Overall Score: {validation.score}%
                      </span>
                    </span>
                  </div>
                </div>
                
                {validation.evidence && (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                    <h5 style={{fontWeight: '500', color: '#616479'}}>Test Results:</h5>
                    {Object.entries(validation.evidence).map(([key, result]) => (
                      <div key={key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px'
                      }}>
                        <span style={{textTransform: 'capitalize', color: '#616479'}}>{key}</span>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span style={{fontSize: '0.875rem', color: '#616479'}}>{result.quality || result.speed}</span>
                          <div style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: result.score >= 90 ? '#dcfce7' : result.score >= 70 ? '#fef3c7' : '#fecaca',
                            color: result.score >= 90 ? '#FF4A23' : result.score >= 70 ? '#d97706' : '#dc2626'
                          }}>
                            {result.score}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
      case 'checklist':
        const allChecked = Object.values(checklistState).every(Boolean);
        
        return (
          <div style={{background: '#f3f4f6', borderRadius: '8px', padding: '24px'}}>
            <h4 style={{fontWeight: '600', color: '#020202', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <StarIcon />
              Technical Readiness Checklist
            </h4>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px'}}>
              {Object.entries({
                computer: 'Computer with HD webcam',
                backup: 'Backup device configured',
                internet: 'Internet speed 25+ Mbps verified',
                space: 'Quiet, professional coaching space',
                headset: 'Professional headset tested',
                documents: 'Document sharing system ready'
              }).map(([key, label]) => (
                <label key={key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={checklistState[key]}
                    onChange={(e) => {
                      const newChecks = { ...checklistState, [key]: e.target.checked };
                      setChecklistState(newChecks);
                      if (Object.values(newChecks).every(Boolean)) {
                        handleChecklistComplete(newChecks);
                      }
                    }}
                    style={{width: '20px', height: '20px', marginRight: '12px'}}
                  />
                  <span style={{color: '#616479'}}>{label}</span>
                </label>
              ))}
            </div>
            
            {validations.techCheck.status !== 'pending' && (
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                background: validations.techCheck.status === 'success' ? '#dcfce7' :
                           validations.techCheck.status === 'warning' ? '#fef3c7' : '#fecaca'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Check style={{color: '#FF4A23'}} />
                  <span style={{
                    fontWeight: '500',
                    color: '#FF4A23'
                  }}>
                    All requirements met!
                  </span>
                </div>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  const overallProgress = Object.values(validations).filter(v => v.status === 'success').length;
  const isCurrentStepComplete = validations[currentStepData.id].status === 'success';
  
  return (
    <div style={{maxWidth: '1024px', margin: '0 auto', padding: '24px'}}>
      <div style={{background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)', overflow: 'hidden'}}>
        
  <style jsx>{`
    input[type="radio"]:checked {
      accent-color: #FF4A23;
    }
    input[type="radio"]:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
      border-color: #FF4A23 !important;
    }
    input[type="checkbox"]:checked {
      accent-color: #FF4A23;
    }
    input[type="checkbox"]:focus {
      outline: 2px solid #FF4A23;
      outline-offset: 2px;
    }
    /* Remove blue focus outlines globally */
    *:focus {
      outline-color: #FF4A23;
    }
  `}</style>
        {/* Header */}
        <div style={{background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', color: 'white', padding: '24px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
            <h2 style={{fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <StarIcon />
              Technical Setup Validation
            </h2>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '2rem', fontWeight: 'bold'}}>{overallProgress}/4</div>
              <div style={{fontSize: '0.875rem', opacity: 0.9}}>Completed</div>
            </div>
          </div>
          
          {/* Progress Indicators */}
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    background: validations[step.id].status === 'success' ? '#319795' :
                               idx === currentStep ? 'white' :
                               idx < currentStep ? 'rgba(255,255,255,0.5)' :
                               'rgba(255,255,255,0.2)',
                    color: validations[step.id].status === 'success' ? 'white' :
                          idx === currentStep ? '#FF4A23' :
                          idx < currentStep ? 'white' :
                          'rgba(255,255,255,0.5)'
                  }}>
                    {validations[step.id].status === 'success' ? (
                      <Check style={{color: 'currentColor'}} />
                    ) : (
                      idx + 1
                    )}
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '4px',
                    margin: '0 8px',
                    background: idx < currentStep ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Current Step Content */}
        <div style={{padding: '32px'}}>
          <div style={{marginBottom: '32px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px'}}>
              <div style={{padding: '12px', background: '#FFE5DF', borderRadius: '8px', color: '#FF4A23'}}>
                <currentStepData.icon />
              </div>
              <div>
                <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#020202'}}>{currentStepData.title}</h3>
                <p style={{color: '#616479'}}>{currentStepData.description}</p>
              </div>
            </div>
            
            {/* Requirements List */}
            <div style={{background: '#FFE5DF', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
              <h4 style={{fontWeight: '500', color: '#D63A1A', marginBottom: '8px'}}>Requirements:</h4>
              <ul style={{margin: 0, paddingLeft: '20px'}}>
                {currentStepData.requirements.map((req, idx) => (
                  <li key={idx} style={{display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.875rem', color: '#D63A1A'}}>
                    <Check style={{flexShrink: 0, width: '16px', height: '16px'}} />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Validation Section */}
            {renderValidationContent()}
          </div>
          
          {/* Navigation */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid #e5e7eb'}}>
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '500',
                background: currentStep === 0 ? '#f3f4f6' : '#e5e7eb',
                color: currentStep === 0 ? '#9ca3af' : '#374151',
                border: 'none',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!isCurrentStepComplete}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: !isCurrentStepComplete ? '#d1d5db' : '#FF4A23',
                  color: !isCurrentStepComplete ? '#9ca3af' : 'white',
                  border: 'none',
                  cursor: !isCurrentStepComplete ? 'not-allowed' : 'pointer'
                }}
              >
                Next Step <ArrowRight />
              </button>
            ) : (
              <button
                onClick={() => onComplete(validations)}
                disabled={overallProgress < 4}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  background: overallProgress < 4 ? '#d1d5db' : 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                  color: overallProgress < 4 ? '#9ca3af' : 'white',
                  border: 'none',
                  cursor: overallProgress < 4 ? 'not-allowed' : 'pointer',
                  boxShadow: overallProgress < 4 ? 'none' : '0 10px 20px rgba(255, 74, 35, 0.2)'
                }}
              >
                Complete Technical Setup ✓
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Urgency Reminder */}
      <div style={{marginTop: '24px', background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '8px', padding: '16px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <Clock style={{color: '#dc2626'}} />
          <div>
            <span style={{fontWeight: 'bold', color: '#dc2626'}}>Time Remaining: </span>
            <span style={{color: '#dc2626'}}>
              {Math.floor((new Date(coach.expiresAt) - new Date()) / (1000 * 60 * 60))}h 
              {Math.floor(((new Date(coach.expiresAt) - new Date()) % (1000 * 60 * 60)) / (1000 * 60))}m
            </span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

const SessionSimulationModule = ({ student, onComplete }) => {
  const [simulationState, setSimulationState] = useState('intro'); // intro, active, paused, review
  const [currentScenario, setCurrentScenario] = useState(0);
  const [responses, setResponses] = useState({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [scenarioScore, setScenarioScore] = useState({});
  
  // Icon components
  const Video = () => (
    <svg style={{width: '32px', height: '32px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
  
  const Mic = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
  
  const MicOff = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
  
  const MessageCircle = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
  
  const Clock = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12,6 12,12 16,14"></polyline>
    </svg>
  );
  
  const AlertCircle = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
    </svg>
  );
  
  const User = () => (
    <svg style={{width: '40px', height: '40px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
  
  const PlayCircle = () => (
    <svg style={{width: '48px', height: '48px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  
  const Check = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
  
  const X = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
  
  const RotateCcw = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10a7 7 0 019.307-6.611 1 1 0 00.658-1.943 9 9 0 105.98 7.693 1 1 0 00-1.988.282A7 7 0 113 10z" />
    </svg>
  );
  
  // Timer for simulation
  useEffect(() => {
    let timer;
    if (simulationState === 'active') {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [simulationState]);
  
  const scenarios = [
    {
      id: 'opening',
      title: 'Session Opening',
      timeLimit: 120, // 2 minutes
      setup: `You're starting your first session with ${student.name}. They seem nervous and keep checking their phone.`,
      studentMessage: "Hi... sorry, my mom just texted me about my chemistry test grade. I got a B+ and she's really upset.",
      objectives: [
        'Build rapport and trust',
        'Address immediate emotional needs',
        'Set positive tone for session'
      ],
      responseOptions: [
        {
          text: "Let's put the phone away and focus on our session. We have a lot to cover today.",
          score: 20,
          feedback: "Too dismissive. Always acknowledge emotions before redirecting."
        },
        {
          text: "I can see this is weighing on you. Let's take a moment to talk about it before we dive into today's agenda. How are you feeling about the grade?",
          score: 100,
          feedback: "Excellent! You acknowledged their emotions and showed flexibility."
        },
        {
          text: "A B+ is still a good grade! Your mom will get over it. Now, let's talk about your college essays.",
          score: 40,
          feedback: "Minimizes feelings and dismisses parental concerns. Show more empathy."
        }
      ]
    },
    {
      id: 'academic-crisis',
      title: 'Academic Pressure',
      timeLimit: 180,
      setup: `Mid-session, ${student.name} becomes visibly distressed while discussing course selection.`,
      studentMessage: "Everyone says I need to take 5 AP classes next year for pre-med, but I'm already struggling with 3. I don't know if I can handle it. What if I'm not smart enough for medical school?",
      objectives: [
        'Address self-doubt constructively',
        'Provide realistic guidance',
        'Balance ambition with wellbeing'
      ],
      responseOptions: [
        {
          text: "Quality over quantity is key. Let's look at which APs align best with your pre-med goals and create a balanced schedule that challenges you without overwhelming you. Your mental health is just as important as your transcript.",
          score: 100,
          feedback: "Perfect balance of validation, practical advice, and holistic thinking."
        },
        {
          text: "If you want to get into a good pre-med program, you'll need to push yourself. Everyone takes 5 APs these days.",
          score: 20,
          feedback: "Adds pressure without support. This approach can harm student wellbeing."
        },
        {
          text: "You're definitely smart enough! Don't worry so much. Just do your best.",
          score: 50,
          feedback: "While encouraging, this lacks concrete guidance and action steps."
        }
      ]
    },
    {
      id: 'parent-intervention',
      title: 'Parent Dynamics',
      timeLimit: 150,
      setup: `${student.name}'s parent unexpectedly joins the video call during the session.`,
      parentMessage: "I need to know why you're not pushing my child harder. We're paying for results, and I want to see them applying to Harvard and Stanford only!",
      objectives: [
        'Maintain professional boundaries',
        'Redirect appropriately',
        'Protect student autonomy'
      ],
      responseOptions: [
        {
          text: "I understand your investment in Emma's future. Let's schedule a separate parent meeting to discuss strategy. Right now, it's important that Emma has this space to explore her own goals.",
          score: 100,
          feedback: "Professional, respectful, and maintains appropriate boundaries."
        },
        {
          text: "You're right, we should be aiming higher. Emma, let's add more Ivy League schools to your list.",
          score: 20,
          feedback: "Undermines student autonomy and enables unrealistic pressure."
        },
        {
          text: "Please don't interrupt our sessions. This is Emma's time.",
          score: 40,
          feedback: "While boundaries are important, this response is too confrontational."
        }
      ]
    },
    {
      id: 'closing-motivation',
      title: 'Session Closing',
      timeLimit: 90,
      setup: `Time to wrap up the session. ${student.name} seems overwhelmed by the homework you've discussed.`,
      studentMessage: "This feels like so much work. I have SAT prep, my regular homework, volunteer hours... I don't know how I'll get it all done.",
      objectives: [
        'End on positive note',
        'Provide clear action items',
        'Build confidence'
      ],
      responseOptions: [
        {
          text: "I hear you - it does feel like a lot. Let's prioritize together. What's the ONE most important thing to tackle this week? We'll start there and build momentum. Remember, you've handled challenges before, and I'm here to support you.",
          score: 100,
          feedback: "Acknowledges feelings, provides structure, and offers ongoing support."
        },
        {
          text: "Time management is crucial for pre-med students. You need to learn to handle this workload.",
          score: 30,
          feedback: "Dismissive and adds pressure instead of providing support."
        },
        {
          text: "Just do what you can. Don't stress too much about it.",
          score: 50,
          feedback: "Too vague and doesn't provide actionable guidance."
        }
      ]
    }
  ];
  
  const currentScenarioData = scenarios[currentScenario];
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const calculateOverallScore = () => {
    const scores = Object.values(scenarioScore);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };
  
  const handleResponse = (scenarioId, optionIndex, score) => {
    setResponses({ ...responses, [scenarioId]: optionIndex });
    setScenarioScore({ ...scenarioScore, [scenarioId]: score });
    
    // Show feedback briefly then move to next scenario
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      if (currentScenario < scenarios.length - 1) {
        setCurrentScenario(currentScenario + 1);
        setTimeElapsed(0);
      } else {
        setSimulationState('review');
      }
    }, 3000);
  };
  
  const startSimulation = () => {
    setSimulationState('active');
    setTimeElapsed(0);
    setCurrentScenario(0);
    setResponses({});
    setScenarioScore({});
  };
  
  const resetSimulation = () => {
    setSimulationState('intro');
    setCurrentScenario(0);
    setResponses({});
    setScenarioScore({});
    setTimeElapsed(0);
    setShowFeedback(false);
  };
  
  return (
    <div style={{maxWidth: '1200px', margin: '0 auto', padding: '24px'}}>
      <div style={{background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)', overflow: 'hidden'}}>
        {/* Header */}
        <div style={{background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', color: 'white', padding: '24px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <Video />
              <div>
                <h2 style={{fontSize: '1.5rem', fontWeight: 'bold'}}>Live Session Practice</h2>
                <p style={{opacity: 0.9}}>
                  60-minute coaching session simulation with {student.name}
                </p>
              </div>
            </div>
            {simulationState === 'active' && (
              <div style={{textAlign: 'right'}}>
                <div style={{fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 'bold'}}>{formatTime(timeElapsed)}</div>
                <div style={{fontSize: '0.875rem', opacity: 0.9}}>Session Time</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div style={{padding: '32px'}}>
          {simulationState === 'intro' && (
            <div style={{textAlign: 'center', padding: '48px 0'}}>
              <div style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '96px', height: '96px', background: '#FFF5F2', borderRadius: '50%', marginBottom: '24px'}}>
                <PlayCircle style={{color: '#FF4A23'}} />
              </div>
              
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px'}}>Ready for Your Practice Session?</h3>
              <p style={{color: '#616479', maxWidth: '600px', margin: '0 auto 32px'}}>
                You'll experience a realistic 60-minute coaching session with {student.name}. 
                Navigate through common scenarios and practice your response skills. 
                Your performance will be evaluated on empathy, professionalism, and effectiveness.
              </p>
              
              <div style={{background: '#FFE5DF', borderRadius: '8px', padding: '24px', maxWidth: '600px', margin: '0 auto 32px'}}>
                <h4 style={{fontWeight: '600', color: '#D63A1A', marginBottom: '12px'}}>Session Overview:</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Check style={{color: '#FF4A23', marginTop: '2px'}} />
                    <div>
                      <div style={{fontWeight: '500', color: '#D63A1A'}}>Opening & Rapport</div>
                      <div style={{fontSize: '0.875rem', color: '#D63A1A'}}>Build trust from the start</div>
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Check style={{color: '#FF4A23', marginTop: '2px'}} />
                    <div>
                      <div style={{fontWeight: '500', color: '#D63A1A'}}>Crisis Management</div>
                      <div style={{fontSize: '0.875rem', color: '#D63A1A'}}>Handle emotional moments</div>
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Check style={{color: '#FF4A23', marginTop: '2px'}} />
                    <div>
                      <div style={{fontWeight: '500', color: '#D63A1A'}}>Parent Dynamics</div>
                      <div style={{fontSize: '0.875rem', color: '#D63A1A'}}>Navigate family pressure</div>
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <Check style={{color: '#FF4A23', marginTop: '2px'}} />
                    <div>
                      <div style={{fontWeight: '500', color: '#D63A1A'}}>Action Planning</div>
                      <div style={{fontSize: '0.875rem', color: '#D63A1A'}}>Close with clear next steps</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={startSimulation}
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '1.125rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(255, 74, 35, 0.3)'
                }}
              >
                Start Practice Session
              </button>
            </div>
          )}
          
          {simulationState === 'active' && (
            <div>
              {/* Simulation Interface */}
              <div style={{background: '#111827', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <div style={{width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite'}}></div>
                      <span style={{color: 'white', fontSize: '0.875rem'}}>Live Session</span>
                    </div>
                    <button
                      onClick={() => setMicEnabled(!micEnabled)}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        background: micEnabled ? '#374151' : '#dc2626',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {micEnabled ? 
                        <Mic style={{color: 'white'}} /> : 
                        <MicOff style={{color: 'white'}} />
                      }
                    </button>
                  </div>
                  <div style={{color: 'white', fontSize: '0.875rem'}}>
                    Scenario {currentScenario + 1} of {scenarios.length}
                  </div>
                </div>
                
                {/* Video Grid */}
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div style={{background: '#1f2937', borderRadius: '8px', padding: '16px', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div style={{textAlign: 'center'}}>
                      <div style={{width: '80px', height: '80px', background: '#374151', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <User style={{color: '#9ca3af'}} />
                      </div>
                      <p style={{color: 'white', fontWeight: '500'}}>{student.name}</p>
                      <p style={{color: '#9ca3af', fontSize: '0.875rem'}}>{student.grade} • {student.focusArea}</p>
                    </div>
                  </div>
                  <div style={{background: '#1f2937', borderRadius: '8px', padding: '16px', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div style={{textAlign: 'center'}}>
                      <div style={{width: '80px', height: '80px', background: '#FF4A23', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <User style={{color: 'white'}} />
                      </div>
                      <p style={{color: 'white', fontWeight: '500'}}>You</p>
                      <p style={{color: '#9ca3af', fontSize: '0.875rem'}}>Coach</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Scenario Content */}
              <div style={{marginBottom: '24px'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
                  <h3 style={{fontSize: '1.25rem', fontWeight: 'bold'}}>{currentScenarioData.title}</h3>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#616479'}}>
                    <Clock />
                    <span style={{fontSize: '0.875rem'}}>
                      Time Limit: {currentScenarioData.timeLimit}s
                    </span>
                  </div>
                </div>
                
                <div style={{background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '16px', marginBottom: '16px'}}>
                  <p style={{color: '#92400e', fontStyle: 'italic'}}>{currentScenarioData.setup}</p>
                </div>
                
                <div style={{background: '#f3f4f6', borderRadius: '8px', padding: '24px', marginBottom: '24px'}}>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px'}}>
                    <MessageCircle style={{color: '#616479', marginTop: '4px'}} />
                    <div>
                      <p style={{fontWeight: '500', color: '#020202', marginBottom: '4px'}}>
                        {currentScenarioData.id === 'parent-intervention' ? 'Parent' : student.name}:
                      </p>
                      <p style={{color: '#616479', fontStyle: 'italic'}}>
                        "{currentScenarioData.id === 'parent-intervention' ? 
                          currentScenarioData.parentMessage : 
                          currentScenarioData.studentMessage}"
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Response Options */}
                {!showFeedback ? (
                  <div>
                    <h4 style={{fontWeight: '500', color: '#616479', marginBottom: '12px'}}>How do you respond?</h4>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                      {currentScenarioData.responseOptions.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleResponse(currentScenarioData.id, idx, option.score)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '16px',
                            background: 'white',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#FF4A23';
                            e.currentTarget.style.background = '#FFF5F2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.background = 'white';
                          }}
                        >
                          <p style={{color: '#616479'}}>{option.text}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '24px',
                    borderRadius: '8px',
                    background: scenarioScore[currentScenarioData.id] >= 80 ? '#dcfce7' :
                               scenarioScore[currentScenarioData.id] >= 50 ? '#fef3c7' : '#fecaca'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                      {scenarioScore[currentScenarioData.id] >= 80 ? (
                        <Check style={{color: '#FF4A23'}} />
                      ) : (
                        <AlertCircle style={{color: '#d97706'}} />
                      )}
                      <span style={{
                        fontWeight: 'bold',
                        fontSize: '1.125rem',
                        color: scenarioScore[currentScenarioData.id] >= 80 ? '#FF4A23' :
                               scenarioScore[currentScenarioData.id] >= 50 ? '#d97706' : '#dc2626'
                      }}>
                        Score: {scenarioScore[currentScenarioData.id]}%
                      </span>
                    </div>
                    <p style={{
                      color: scenarioScore[currentScenarioData.id] >= 80 ? '#10b981' :
                             scenarioScore[currentScenarioData.id] >= 50 ? '#92400e' : '#dc2626'
                    }}>
                      {currentScenarioData.responseOptions[responses[currentScenarioData.id]].feedback}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {simulationState === 'review' && (
            <div style={{textAlign: 'center', padding: '32px 0'}}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '128px',
                height: '128px',
                borderRadius: '50%',
                marginBottom: '24px',
                background: calculateOverallScore() >= 85 ? '#d1fae5' :
                           calculateOverallScore() >= 70 ? '#fef3c7' : '#fecaca'
              }}>
                <div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: calculateOverallScore() >= 85 ? '#FF4A23' :
                           calculateOverallScore() >= 70 ? '#d97706' : '#dc2626'
                  }}>
                    {calculateOverallScore()}%
                  </div>
                  <div style={{fontSize: '0.875rem', color: '#616479'}}>Overall Score</div>
                </div>
              </div>
              
              <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px'}}>
                {calculateOverallScore() >= 85 ? 'Excellent Session!' :
                 calculateOverallScore() >= 70 ? 'Good Progress!' : 'More Practice Needed'}
              </h3>
              
              <p style={{color: '#616479', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px'}}>
                {calculateOverallScore() >= 85 ? 
                  `You demonstrated strong coaching skills with ${student.name}. Your responses showed empathy, professionalism, and effective guidance.` :
                  `Review the feedback for each scenario to improve your coaching approach. Practice makes perfect!`
                }
              </p>
              
              {/* Detailed Feedback */}
              <div style={{maxWidth: '800px', margin: '0 auto 32px'}}>
                <h4 style={{fontWeight: '600', textAlign: 'left', marginBottom: '16px'}}>Scenario Breakdown:</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {scenarios.map((scenario, idx) => (
                    <div key={scenario.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: '#f3f4f6',
                      borderRadius: '8px'
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: scenarioScore[scenario.id] >= 80 ? '#d1fae5' :
                                     scenarioScore[scenario.id] >= 50 ? '#fef3c7' : '#fecaca'
                        }}>
                          {scenarioScore[scenario.id] >= 80 ? (
                            <Check style={{color: '#FF4A23'}} />
                          ) : (
                            <X style={{color: '#dc2626'}} />
                          )}
                        </div>
                        <span style={{fontWeight: '500'}}>{scenario.title}</span>
                      </div>
                      <span style={{
                        fontWeight: 'bold',
                        color: scenarioScore[scenario.id] >= 80 ? '#FF4A23' :
                               scenarioScore[scenario.id] >= 50 ? '#d97706' : '#dc2626'
                      }}>
                        {scenarioScore[scenario.id] || 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{display: 'flex', gap: '16px', justifyContent: 'center'}}>
                {calculateOverallScore() >= 85 ? (
                  <button
                    onClick={() => onComplete(calculateOverallScore())}
                    style={{
                      padding: '16px 32px',
                      background: 'linear-gradient(135deg, #FF4A23, #FF6B47)',
                      color: 'white',
                      borderRadius: '8px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 10px 20px rgba(255, 74, 35, 0.3)'
                    }}
                  >
                    Continue to Final Certification
                  </button>
                ) : (
                  <>
                    <button
                      onClick={resetSimulation}
                      style={{
                        padding: '16px 32px',
                        background: '#e5e7eb',
                        color: '#616479',
                        borderRadius: '8px',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <RotateCcw />
                      Try Again
                    </button>
                    <button
                      onClick={() => onComplete(calculateOverallScore())}
                      style={{
                        padding: '16px 32px',
                        background: '#FF4A23',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Continue Anyway
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

const FinalCertificationModule = ({ coach, student, trainingStats, onComplete }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [pledgeRecorded, setPledgeRecorded] = useState(false);
  const [emergencyQuizAnswers, setEmergencyQuizAnswers] = useState({});
  const [sessionScheduled, setSessionScheduled] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  
  // Icon components
  const Award = () => (
    <svg style={{width: '32px', height: '32px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15l-2 5-8-5 8-15 8 15-8 5-2-5z" />
    </svg>
  );
  
  
  
  const Calendar = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  
  const Download = () => (
    <svg style={{width: '16px', height: '16px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
  
  const Video = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
  
  const CheckCircle = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
  
  const AlertTriangle = () => (
    <svg style={{width: '24px', height: '24px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
  
  const Phone = () => (
    <svg style={{width: '32px', height: '32px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
  
  
  
  const FileText = () => (
    <svg style={{width: '32px', height: '32px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
  
  const BookOpen = () => (
    <svg style={{width: '32px', height: '32px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
  
  const Star = () => (
    <svg style={{width: '32px', height: '32px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
  
  
  
  
  
  const ArrowRight = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
  
  const Check = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
  
  const Clock = () => (
    <svg style={{width: '20px', height: '20px', verticalAlign: 'middle'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12,6 12,12 16,14"></polyline>
    </svg>
  );
  
  const sections = [
    { id: 'pledge', title: 'Coach Commitment Pledge' },
    { id: 'emergency', title: 'Emergency Protocols' },
    { id: 'scheduling', title: 'First Session Scheduling' },
    { id: 'resources', title: 'Success Kit & Certification' }
  ];
  
  const emergencyScenarios = [
    {
      id: 'crisis',
      scenario: 'During a session, your student mentions they\'ve been having thoughts of self-harm.',
      question: 'What is your IMMEDIATE first action?',
      options: [
        'Tell them everything will be okay and change the subject',
        'Express concern, ensure immediate safety, and contact the emergency protocol number while staying with them',
        'End the session and email their parents',
        'Give them advice on coping strategies'
      ],
      correct: 1,
      protocol: 'IMMEDIATE: Call Ivylevel Crisis Line: 1-800-XXX-XXXX'
    },
    {
      id: 'parent-conflict',
      scenario: 'A parent becomes verbally aggressive during a session, yelling at both you and the student.',
      question: 'What is the appropriate response?',
      options: [
        'Yell back to establish authority',
        'Immediately end the call without explanation',
        'Remain calm, document the incident, and follow up with Ivylevel support within 24 hours',
        'Argue with the parent about their behavior'
      ],
      correct: 2,
      protocol: 'Document and report to: support@ivylevel.com within 24 hours'
    },
    {
      id: 'technical-fail',
      scenario: 'Your internet fails 10 minutes into a paid session.',
      question: 'What is the correct protocol?',
      options: [
        'Wait for it to fix itself',
        'Email the student later to reschedule',
        'Immediately switch to phone, notify student via text, and offer makeup time',
        'Consider the session complete'
      ],
      correct: 2,
      protocol: 'Backup: Phone/Text immediately, offer 15 min makeup time'
    }
  ];
  
  const availableSlots = [
    { date: 'Tomorrow', time: '4:00 PM EST', full: false },
    { date: 'Tomorrow', time: '5:00 PM EST', full: true },
    { date: 'Tomorrow', time: '6:00 PM EST', full: false },
    { date: 'Day After', time: '3:30 PM EST', full: false },
    { date: 'Day After', time: '4:30 PM EST', full: false },
    { date: 'Day After', time: '5:30 PM EST', full: true }
  ];
  
  const handleEmergencyAnswer = (scenarioId, answerIndex) => {
    setEmergencyQuizAnswers({
      ...emergencyQuizAnswers,
      [scenarioId]: answerIndex
    });
  };
  
  const calculateEmergencyScore = () => {
    let correct = 0;
    emergencyScenarios.forEach(scenario => {
      if (emergencyQuizAnswers[scenario.id] === scenario.correct) {
        correct++;
      }
    });
    return (correct / emergencyScenarios.length) * 100;
  };
  
  const formatTrainingTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
  const generateCertificate = () => {
    const certId = `IVY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    return {
      id: certId,
      date: new Date().toLocaleDateString(),
      coachName: coach.name,
      studentName: student.name,
      trainingTime: formatTrainingTime(trainingStats.totalTime),
      score: trainingStats.averageScore
    };
  };
  
  const renderSection = () => {
    switch (sections[currentSection].id) {
      case 'pledge':
        return (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
        
  <style jsx>{`
    input[type="radio"]:checked {
      accent-color: #FF4A23;
    }
    input[type="radio"]:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
      border-color: #FF4A23 !important;
    }
    input[type="checkbox"]:checked {
      accent-color: #FF4A23;
    }
    input[type="checkbox"]:focus {
      outline: 2px solid #FF4A23;
      outline-offset: 2px;
    }
    /* Remove blue focus outlines globally */
    *:focus {
      outline-color: #FF4A23;
    }
    /* Custom checkbox styling for better browser support */
    input[type="checkbox"] {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }
    input[type="checkbox"]:checked {
      background-color: #FF4A23;
      border-color: #FF4A23;
    }
    input[type="checkbox"]:checked::after {
      content: '✓';
      position: absolute;
      color: white;
      font-size: 14px;
      font-weight: bold;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    input[type="checkbox"]:hover {
      border-color: #FF4A23;
    }
  `}</style>
        
  <style jsx>{`
    input[type="radio"]:checked {
      accent-color: #FF4A23;
    }
    input[type="radio"]:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
      border-color: #FF4A23 !important;
    }
    input[type="checkbox"]:checked {
      accent-color: #FF4A23;
    }
    input[type="checkbox"]:focus {
      outline: 2px solid #FF4A23;
      outline-offset: 2px;
    }
    /* Remove blue focus outlines globally */
    *:focus {
      outline-color: #FF4A23;
    }
    /* Custom checkbox styling for better browser support */
    input[type="checkbox"] {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }
    input[type="checkbox"]:checked {
      background-color: #FF4A23;
      border-color: #FF4A23;
    }
    input[type="checkbox"]:checked::after {
      content: '✓';
      position: absolute;
      color: white;
      font-size: 14px;
      font-weight: bold;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    input[type="checkbox"]:hover {
      border-color: #FF4A23;
    }
  `}</style>
            <div style={{background: 'linear-gradient(135deg, #FFE5DF, #FFF5F2)', borderRadius: '12px', padding: '24px'}}>
              <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px'}}>Your Ivylevel Coach Commitment</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <HeartIcon style={{color: '#dc2626', marginTop: '2px'}} />
                  <p style={{color: '#616479'}}>
                    I commit to putting {student.name}'s growth and wellbeing first in every session
                  </p>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <StarIcon style={{color: '#FF4A23', marginTop: '2px'}} />
                  <p style={{color: '#616479'}}>
                    I will maintain the highest standards of professionalism and confidentiality
                  </p>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <TargetIcon style={{color: '#FF4A23', marginTop: '2px'}} />
                  <p style={{color: '#616479'}}>
                    I will work tirelessly to help {student.name} achieve their college dreams
                  </p>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <ServiceIcon style={{color: '#FF4A23', marginTop: '2px'}} />
                  <p style={{color: '#616479'}}>
                    I will collaborate respectfully with parents while protecting student autonomy
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{background: '#f3f4f6', borderRadius: '8px', padding: '24px'}}>
              <h4 style={{fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Video style={{color: '#dc2626'}} />
                Record Your 30-Second Pledge
              </h4>
              <p style={{color: '#616479', marginBottom: '16px'}}>
                Look into the camera and state: "I, {coach.name}, commit to being an exceptional coach 
                for {student.name} and upholding Ivylevel's standards of excellence."
              </p>
              
              {!pledgeRecorded ? (
                <div style={{border: '2px dashed #d1d5db', borderRadius: '8px', padding: '32px', textAlign: 'center'}}>
                  <Video style={{width: '48px', height: '48px', margin: '0 auto 16px', color: '#9ca3af'}} />
                  <button
                    onClick={() => {
                      // Simulate recording
                      setTimeout(() => setPledgeRecorded(true), 2000);
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#dc2626',
                      color: 'white',
                      borderRadius: '8px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Start Recording
                  </button>
                </div>
              ) : (
                <div style={{background: '#d1fae5', border: '1px solid #4FD1C5', borderRadius: '8px', padding: '16px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <CheckCircle style={{color: '#FF4A23'}} />
                    <span style={{fontWeight: '500', color: '#FF4A23'}}>Pledge recorded successfully!</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'emergency':
        return (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <div style={{background: '#fecaca', border: '1px solid #fca5a5', borderRadius: '8px', padding: '24px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                <AlertTriangle style={{color: '#dc2626'}} style={{color: '#dc2626'}} />
                <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#dc2626'}}>Critical Safety Protocols</h3>
              </div>
              <p style={{color: '#dc2626'}}>
                You MUST know these protocols. Student safety is our absolute priority.
              </p>
            </div>
            
            {emergencyScenarios.map((scenario, idx) => (
              <div key={scenario.id} style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px'}}>
                <div style={{marginBottom: '16px'}}>
                  <h4 style={{fontWeight: '600', marginBottom: '8px'}}>Scenario {idx + 1}:</h4>
                  <p style={{color: '#616479', fontStyle: 'italic', marginBottom: '16px'}}>"{scenario.scenario}"</p>
                  <p style={{fontWeight: '500', color: '#020202', marginBottom: '12px'}}>{scenario.question}</p>
                </div>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
                  {scenario.options.map((option, optIdx) => (
                    <label
                      key={optIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: emergencyQuizAnswers[scenario.id] === optIdx ? '#FF4A23' : '#e5e7eb',
                        background: emergencyQuizAnswers[scenario.id] === optIdx ? '#FFE5DF' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input type="radio"  onFocus={(e) => { e.target.style.outline = 'none'; e.target.style.boxShadow = '0 0 0 3px rgba(255, 74, 35, 0.1)'; }} onBlur={(e) => { e.target.style.boxShadow = 'none'; }}
                        name={scenario.id}
                        checked={emergencyQuizAnswers[scenario.id] === optIdx}
                        onChange={() => handleEmergencyAnswer(scenario.id, optIdx)}
                        style={{marginRight: '12px'}}
                      />
                      <span style={{color: '#616479'}}>{option}</span>
                    </label>
                  ))}
                </div>
                
                {emergencyQuizAnswers[scenario.id] !== undefined && (
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: emergencyQuizAnswers[scenario.id] === scenario.correct ? '#d1fae5' : '#fecaca',
                    border: `1px solid ${emergencyQuizAnswers[scenario.id] === scenario.correct ? '#86efac' : '#fca5a5'}`
                  }}>
                    {emergencyQuizAnswers[scenario.id] === scenario.correct ? (
                      <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                          <CheckCircle style={{color: '#FF4A23'}} />
                          <span style={{fontWeight: '500', color: '#FF4A23'}}>Correct!</span>
                        </div>
                        <p style={{fontSize: '0.875rem', color: '#FF4A23'}}>{scenario.protocol}</p>
                      </div>
                    ) : (
                      <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                          <AlertTriangle style={{color: 'inherit'}} />
                          <span style={{fontWeight: '500', color: '#dc2626'}}>
                            Incorrect. The correct protocol is:
                          </span>
                        </div>
                        <p style={{fontSize: '0.875rem', color: '#dc2626'}}>{scenario.protocol}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {Object.keys(emergencyQuizAnswers).length === emergencyScenarios.length && (
              <div style={{background: '#FFE5DF', borderRadius: '8px', padding: '16px'}}>
                <p style={{textAlign: 'center', fontWeight: '500', color: '#D63A1A'}}>
                  Emergency Protocol Score: {calculateEmergencyScore()}%
                  {calculateEmergencyScore() < 100 && ' - Review incorrect answers above'}
                </p>
              </div>
            )}
          </div>
        );
        
      case 'scheduling':
        return (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <div style={{background: 'linear-gradient(135deg, #FFE5DF, #FFBB6D)', borderRadius: '12px', padding: '24px'}}>
              <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px'}}>Schedule Your First Session!</h3>
              <p style={{color: '#616479'}}>
                {student.name} is excited to meet you. Choose your first session time below.
              </p>
            </div>
            
            <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px'}}>
              <h4 style={{fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Calendar style={{color: '#FF4A23'}} />
                Available Time Slots
              </h4>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px'}}>
                {availableSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => !slot.full && setSelectedDateTime(`${slot.date} at ${slot.time}`)}
                    disabled={slot.full}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: slot.full ? '#e5e7eb' : 
                                   selectedDateTime === `${slot.date} at ${slot.time}` ? '#FF4A23' : '#d1d5db',
                      background: slot.full ? '#f3f4f6' :
                                 selectedDateTime === `${slot.date} at ${slot.time}` ? '#FFE5DF' : 'white',
                      color: slot.full ? '#9ca3af' :
                            selectedDateTime === `${slot.date} at ${slot.time}` ? '#FF4A23' : '#374151',
                      cursor: slot.full ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{fontWeight: '500'}}>{slot.date}</div>
                    <div style={{fontSize: '0.875rem'}}>{slot.time}</div>
                    {slot.full && <div style={{fontSize: '0.75rem', marginTop: '4px'}}>FULL</div>}
                  </button>
                ))}
              </div>
              
              {selectedDateTime && (
                <div style={{background: '#FFE5DF', borderRadius: '8px', padding: '16px', marginBottom: '16px'}}>
                  <p style={{color: '#D63A1A'}}>
                    <strong>Selected:</strong> First session with {student.name} on {selectedDateTime}
                  </p>
                </div>
              )}
              
              <div style={{background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '16px'}}>
                <h5 style={{fontWeight: '500', color: '#92400e', marginBottom: '8px'}}>First Session Checklist:</h5>
                <ul style={{margin: 0, paddingLeft: '20px', fontSize: '0.875rem', color: '#92400e'}}>
                  <li>Review {student.name}'s complete profile</li>
                  <li>Test your Zoom setup 30 minutes early</li>
                  <li>Have your session plan ready</li>
                  <li>Send reminder email to student</li>
                </ul>
              </div>
              
              <button
                onClick={() => setSessionScheduled(true)}
                disabled={!selectedDateTime}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  background: selectedDateTime ? '#FF4A23' : '#d1d5db',
                  color: selectedDateTime ? 'white' : '#9ca3af',
                  border: 'none',
                  cursor: selectedDateTime ? 'pointer' : 'not-allowed'
                }}
              >
                Confirm First Session
              </button>
              
              {sessionScheduled && (
                <div style={{marginTop: '16px', padding: '16px', background: '#d1fae5', border: '1px solid #4FD1C5', borderRadius: '8px'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <CheckCircle style={{color: '#FF4A23'}} />
                    <span style={{fontWeight: '500', color: '#FF4A23'}}>
                      Session confirmed! Calendar invite sent to {coach.email}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'resources':
        return (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            <div style={{background: 'linear-gradient(135deg, #FFF5F2, #FFE5DF)', borderRadius: '12px', padding: '24px'}}>
              <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px'}}>Your Success Kit is Ready!</h3>
              <p style={{color: '#616479'}}>
                Download your coaching resources and receive your official certification.
              </p>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px'}}>
                <FileText style={{color: '#FF4A23', marginBottom: '12px'}} />
                <h4 style={{fontWeight: '600', marginBottom: '8px'}}>Session Templates</h4>
                <p style={{fontSize: '0.875rem', color: '#616479', marginBottom: '16px'}}>
                  Proven frameworks for every session type
                </p>
                <button style={{
                  color: '#FF4A23',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Download <Download />
                </button>
              </div>
              
              <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px'}}>
                <BookOpen style={{color: '#FF4A23', marginBottom: '12px'}} />
                <h4 style={{fontWeight: '600', marginBottom: '8px'}}>College Planning Guide</h4>
                <p style={{fontSize: '0.875rem', color: '#616479', marginBottom: '16px'}}>
                  Comprehensive roadmap for {student.grade} students
                </p>
                <button style={{
                  color: '#FF4A23',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Download <Download />
                </button>
              </div>
              
              <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px'}}>
                <Phone style={{color: '#FF4A23', marginBottom: '12px'}} />
                <h4 style={{fontWeight: '600', marginBottom: '8px'}}>Emergency Contacts</h4>
                <p style={{fontSize: '0.875rem', color: '#616479', marginBottom: '16px'}}>
                  24/7 support line and crisis protocols
                </p>
                <button style={{
                  color: '#FF4A23',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Download <Download />
                </button>
              </div>
              
              <div style={{background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px'}}>
                <Star style={{color: '#f59e0b', marginBottom: '12px'}} />
                <h4 style={{fontWeight: '600', marginBottom: '8px'}}>Best Practices</h4>
                <p style={{fontSize: '0.875rem', color: '#616479', marginBottom: '16px'}}>
                  Tips from top-earning coaches
                </p>
                <button style={{
                  color: '#f59e0b',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Download <Download />
                </button>
              </div>
            </div>
            
            <div style={{background: '#f3f4f6', borderRadius: '8px', padding: '24px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={{width: '20px', height: '20px', flexShrink: 0}}
                />
                <div>
                  <p style={{fontWeight: '500', color: '#020202'}}>Terms & Conditions</p>
                  <p style={{fontSize: '0.875rem', color: '#616479', marginTop: '4px'}}>
                    I have read and agree to Ivylevel's coaching terms, privacy policy, 
                    and code of conduct. I understand that maintaining high standards is 
                    required for continued partnership.
                  </p>
                </div>
              </label>
            </div>
            
            {!showCertificate ? (
              <button
                onClick={() => setShowCertificate(true)}
                disabled={!agreedToTerms}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '1.125rem',
                  background: agreedToTerms ? 'linear-gradient(135deg, #FF4A23, #FF6B47)' : '#d1d5db',
                  color: agreedToTerms ? 'white' : '#9ca3af',
                  border: 'none',
                  cursor: agreedToTerms ? 'pointer' : 'not-allowed',
                  boxShadow: agreedToTerms ? '0 10px 20px rgba(255, 74, 35, 0.2)' : 'none'
                }}
              >
                Get My Official Certification
              </button>
            ) : (
              <div style={{background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', borderRadius: '12px', padding: '32px', color: 'white', textAlign: 'center'}}>
                <Award style={{width: '64px', height: '64px', margin: '0 auto 16px'}} />
                <h3 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px'}}>Congratulations, {coach.name}!</h3>
                <p style={{opacity: 0.9, marginBottom: '24px'}}>
                  You are now a Certified Ivylevel Ivylevel Coach
                </p>
                <div style={{background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
                  <p style={{fontSize: '0.875rem', marginBottom: '4px'}}>Certificate ID: {generateCertificate().id}</p>
                  <p style={{fontSize: '0.875rem', marginBottom: '4px'}}>Issued: {generateCertificate().date}</p>
                  <p style={{fontSize: '0.875rem', marginBottom: '4px'}}>Training Time: {generateCertificate().trainingTime}</p>
                  <p style={{fontSize: '0.875rem'}}>Overall Score: {generateCertificate().score}%</p>
                </div>
                <button
                  onClick={() => onComplete()}
                  style={{
                    padding: '16px 32px',
                    background: 'white',
                    color: '#FF4A23',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 10px 20px rgba(100, 20, 50, 0.15)'
                  }}
                >
                  Start My Coaching Journey
                </button>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  const canProceed = () => {
    switch (sections[currentSection].id) {
      case 'pledge':
        return pledgeRecorded;
      case 'emergency':
        return Object.keys(emergencyQuizAnswers).length === emergencyScenarios.length && 
               calculateEmergencyScore() === 100;
      case 'scheduling':
        return sessionScheduled;
      case 'resources':
        return true;
      default:
        return false;
    }
  };
  
  return (
    <div style={{maxWidth: '1024px', margin: '0 auto', padding: '24px'}}>
      <div style={{background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)', overflow: 'hidden'}}>
        
  <style jsx>{`
    input[type="radio"]:checked {
      accent-color: #FF4A23;
    }
    input[type="radio"]:focus {
      outline: none !important;
      box-shadow: 0 0 0 3px rgba(255, 74, 35, 0.2) !important;
      border-color: #FF4A23 !important;
    }
    input[type="checkbox"]:checked {
      accent-color: #FF4A23;
    }
    input[type="checkbox"]:focus {
      outline: 2px solid #FF4A23;
      outline-offset: 2px;
    }
    /* Remove blue focus outlines globally */
    *:focus {
      outline-color: #FF4A23;
    }
  `}</style>
        {/* Header */}
        <div style={{background: 'linear-gradient(135deg, #FF4A23, #FF6B47)', color: 'white', padding: '24px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <Award />
              <div>
                <h2 style={{fontSize: '1.5rem', fontWeight: 'bold'}}>Final Certification</h2>
                <p style={{opacity: 0.9}}>Complete these steps to begin coaching</p>
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '0.875rem', opacity: 0.9}}>Progress</div>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{currentSection + 1}/{sections.length}</div>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px'}}>
            {sections.map((section, idx) => (
              <React.Fragment key={section.id}>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    background: idx < currentSection ? '#319795' :
                               idx === currentSection ? 'white' :
                               'rgba(255,255,255,0.2)',
                    color: idx < currentSection ? 'white' :
                          idx === currentSection ? '#FF4A23' :
                          'rgba(255,255,255,0.6)'
                  }}>
                    {idx < currentSection ? <CheckCircle /> : idx + 1}
                  </div>
                </div>
                {idx < sections.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '4px',
                    margin: '0 8px',
                    background: idx < currentSection ? '#319795' : 'rgba(255,255,255,0.2)'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div style={{padding: '32px'}}>
          <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '24px'}}>{sections[currentSection].title}</h3>
          {renderSection()}
          
          {/* Navigation */}
          {currentSection < sections.length - 1 && (
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb'}}>
              <button
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  background: currentSection === 0 ? '#f3f4f6' : '#e5e7eb',
                  color: currentSection === 0 ? '#9ca3af' : '#374151',
                  border: 'none',
                  cursor: currentSection === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              
              <button
                onClick={() => setCurrentSection(currentSection + 1)}
                disabled={!canProceed()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: !canProceed() ? '#d1d5db' : '#FF4A23',
                  color: !canProceed() ? '#9ca3af' : 'white',
                  border: 'none',
                  cursor: !canProceed() ? 'not-allowed' : 'pointer'
                }}
              >
                Next Step <ArrowRight />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrap the App in AuthProvider
const AppWithAuth = () => {
  return (
    <AuthProvider>

      <style>{`
        /* Global Radio Button Fix - Applied by fix script */
        input[type="radio"] {
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          width: 20px !important;
          height: 20px !important;
          min-width: 20px !important;
          min-height: 20px !important;
          border: 2px solid #d1d5db !important;
          border-radius: 50% !important;
          background-color: white !important;
          cursor: pointer !important;
          position: relative !important;
          transition: all 0.2s ease !important;
          outline: none !important;
          opacity: 1 !important;
          visibility: visible !important;
          display: inline-block !important;
          margin: 0 !important;
          flex-shrink: 0 !important;
        }
        
        input[type="radio"]:hover {
          border-color: #FF4A23 !important;
          box-shadow: 0 0 0 4px rgba(255, 74, 35, 0.1) !important;
        }
        
        input[type="radio"]:focus {
          outline: none !important;
          box-shadow: 0 0 0 4px rgba(255, 74, 35, 0.2) !important;
          border-color: #FF4A23 !important;
        }
        
        input[type="radio"]:checked {
          border-color: #FF4A23 !important;
          background-color: white !important;
        }
        
        input[type="radio"]:checked::before {
          content: '' !important;
          position: absolute !important;
          width: 10px !important;
          height: 10px !important;
          border-radius: 50% !important;
          background-color: #FF4A23 !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          opacity: 1 !important;
        }
        
        input[type="radio"]:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          border-color: #e5e7eb !important;
        }
        
        input[type="radio"]:disabled:hover {
          box-shadow: none !important;
          border-color: #e5e7eb !important;
        }
        
        /* Fix label interactions */
        label:has(input[type="radio"]) {
          cursor: pointer;
        }
        
        /* Ensure radio buttons in flex containers don't shrink */
        label {
          display: flex;
          align-items: center;
        }
        
        label input[type="radio"] {
          margin-right: 12px !important;
        }
      `}</style>
      <App />
    </AuthProvider>
  );
};

// Export the wrapped component
export default AppWithAuth;