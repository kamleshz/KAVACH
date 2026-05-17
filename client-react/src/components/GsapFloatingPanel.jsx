import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

const GsapFloatingPanel = ({
  children,
  className = "",
  animateKey = "default",
  origin = "top right",
}) => {
  const panelRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (!panelRef.current || typeof window === "undefined") return undefined;
    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { autoAlpha: 0, y: -10, scale: 0.98, transformOrigin: origin },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.24,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
    }, panelRef);

    return () => ctx.revert();
  }, [animateKey, origin, prefersReducedMotion]);

  return (
    <div ref={panelRef} className={className}>
      {children}
    </div>
  );
};

export default GsapFloatingPanel;
