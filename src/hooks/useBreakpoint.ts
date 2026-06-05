import { useEffect, useState } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function getBreakpoint(width: number): Breakpoint {
  if (width < 768) {
    return 'mobile';
  }

  if (width < 1024) {
    return 'tablet';
  }

  return 'desktop';
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => getBreakpoint(window.innerWidth));

  useEffect(() => {
    const onResize = () => setBreakpoint(getBreakpoint(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return breakpoint;
}
