import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

const GsapFloatingPanel = ({
  children,
  className = "",
  animateKey = "default",
  origin = "top right",
}) => {
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (!panelRef.current || typeof window === "undefined") return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
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
  }, [animateKey, origin]);

  return (
    <div ref={panelRef} className={className}>
      {children}
    </div>
  );
};

export default GsapFloatingPanel;
