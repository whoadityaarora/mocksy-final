'use client';

import React, { useState, useEffect, useRef } from 'react';

// Define the Vanta types for TypeScript
declare global {
  interface Window {
    VANTA: {
      FOG: (options: {
        el: HTMLElement | string;
        THREE: any;
        mouseControls?: boolean;
        touchControls?: boolean;
        gyroControls?: boolean;
        minHeight?: number;
        minWidth?: number;
        highlightColor?: number;
        midtoneColor?: number;
        lowlightColor?: number;
        baseColor?: number;
        blurFactor?: number;
        speed?: number;
        zoom?: number;
      }) => {
        destroy: () => void;
      };
    };
    THREE: any;
  }
}

const VantaBackground: React.FC = () => {
  const vantaRef = useRef<HTMLDivElement>(null);
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    const loadScript = (src: string, onReady: () => void) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = onReady;
      document.body.appendChild(script);
      return script;
    };

    let threeScript: HTMLScriptElement;
    let vantaScript: HTMLScriptElement;

    // Load Three.js first, then Vanta.js
    threeScript = loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js', () => {
      vantaScript = loadScript('https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.fog.min.js', () => {
        setScriptsLoaded(true);
      });
    });

    return () => {
      // Cleanup scripts
      threeScript?.remove();
      vantaScript?.remove();
    };
  }, []);

  useEffect(() => {
    if (scriptsLoaded && vantaRef.current && !vantaEffect) {
      const effect = window.VANTA.FOG({
        el: vantaRef.current,
        THREE: window.THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        highlightColor: 0xff6e00,
        midtoneColor: 0x864400,
        lowlightColor: 0x954209,
        baseColor: 0x0,
        blurFactor: 0.75,
        speed: 2.40,
        zoom: 0.50
      });
      setVantaEffect(effect);
    }

    return () => {
      // Destroy the effect on cleanup
      if (vantaEffect) {
        vantaEffect.destroy();
      }
    };
  }, [scriptsLoaded, vantaEffect]);

  return <div ref={vantaRef} className="fixed inset-0 w-full h-full z-0" />;
};

export default VantaBackground;
