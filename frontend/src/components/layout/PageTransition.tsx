import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [animating, setAnimating] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setAnimating(true);
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setAnimating(false);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div
      className={`transition-all duration-150 ease-out ${
        animating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
      }`}
    >
      {displayChildren}
    </div>
  );
}
