'use client';
import { useEffect } from 'react';

const LeafletCSS = () => {
  useEffect(() => {
    // Dynamically load Leaflet CSS only on client side
    if (typeof window !== 'undefined') {
      import('leaflet/dist/leaflet.css');
    }
  }, []);

  return null;
};

export default LeafletCSS;
