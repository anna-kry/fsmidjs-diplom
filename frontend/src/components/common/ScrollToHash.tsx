
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToHash = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const id = decodeURIComponent(location.hash.slice(1));

    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash, location.key]);

  return null;
};

export default ScrollToHash;
