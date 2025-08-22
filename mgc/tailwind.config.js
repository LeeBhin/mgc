/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        /* 채팅용 스크롤바 */
        '.scrollbar-chat': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgb(71 85 105 / 0.6) transparent',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            'background-color': 'rgb(71 85 105 / 0.6)',
            'border-radius': '3px',
            transition: 'all 0.2s ease',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            'background-color': 'rgb(100 116 139 / 0.8)',
          },
        },
        /* 참가자 목록용 스크롤바 */
        '.scrollbar-participants': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgb(100 116 139) rgb(51 65 85 / 0.3)',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            'background-color': 'rgb(51 65 85 / 0.3)',
            'border-radius': '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            'background-color': 'rgb(100 116 139)',
            'border-radius': '3px',
            transition: 'background-color 0.2s ease',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            'background-color': 'rgb(148 163 184)',
          },
        },
        /* 장치 선택용 커스텀 스크롤바 - 파란색 테마 */
        '.scrollbar-custom': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgb(59 130 246) rgb(30 41 59 / 0.5)',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            'background-color': 'rgb(30 41 59 / 0.5)',
            'border-radius': '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            'background-color': 'rgb(59 130 246)',
            'border-radius': '3px',
            transition: 'background-color 0.2s ease',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            'background-color': 'rgb(37 99 235)',
          },
        },
        /* 스크롤바 숨기기 */
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        /* 볼륨 슬라이더 스타일 */
        '.volume-slider': {
          '&::-webkit-slider-thumb': {
            'appearance': 'none',
            'width': '16px',
            'height': '16px',
            'border-radius': '50%',
            'background': '#3b82f6',
            'cursor': 'pointer',
            'border': '2px solid white',
            'box-shadow': '0 2px 4px rgba(0,0,0,0.2)',
            'transition': 'all 0.2s ease',
          },
          '&::-webkit-slider-thumb:hover': {
            'background': '#2563eb',
            'transform': 'scale(1.1)',
          },
          '&::-webkit-slider-thumb:active': {
            'transform': 'scale(1.2)',
          },
          '&::-moz-range-thumb': {
            'width': '16px',
            'height': '16px',
            'border-radius': '50%',
            'background': '#3b82f6',
            'cursor': 'pointer',
            'border': '2px solid white',
            'box-shadow': '0 2px 4px rgba(0,0,0,0.2)',
            'transition': 'all 0.2s ease',
          },
          '&::-moz-range-thumb:hover': {
            'background': '#2563eb',
            'transform': 'scale(1.1)',
          },
          '&::-moz-range-track': {
            'background': 'transparent',
            'border': 'none',
          },
        },
      });
    },
  ],
}