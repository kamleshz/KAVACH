import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

const GsapPageTransition = ({
  children,
  className = "",
  transitionKey = "default",
}) => {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.34,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, [transitionKey]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

export default GsapPageTransition;
