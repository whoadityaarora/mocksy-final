
'use client';

import React, { useEffect } from 'react';

const UnicornStudioBackground: React.FC = () => {
  useEffect(() => {
    if (!window.UnicornStudio?.isInitialized) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.31/dist/unicornStudio.umd.js';
      script.onload = () => {
        if (!window.UnicornStudio.isInitialized) {
          window.UnicornStudio.init();
          window.UnicornStudio.isInitialized = true;
        }
      };
      (document.head || document.body).appendChild(script);
    }
  }, []);

  return (
    <div 
      className="fixed inset-0 w-full h-full z-0"
      style={{ pointerEvents: 'none' }}
    >
      <div 
        data-us-project="WPqsXkz97ZxEUGZocs39" 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: '1440px', height: '900px' }}
      ></div>
    </div>
  );
};

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean;
      init: () => void;
    };
  }
}

export default UnicornStudioBackground;
