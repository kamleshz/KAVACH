import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

const GsapPageTransition = ({
  children,
  className = "",
  transitionKey = "default",
}) => {
  const containerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return undefined;
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
  }, [prefersReducedMotion, transitionKey]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

export default GsapPageTransition;
