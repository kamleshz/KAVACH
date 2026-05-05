import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

const GsapRevealGroup = ({ children, className = "", animateKey = "default" }) => {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      const items = Array.from(containerRef.current?.children || []);
      const progressFills = Array.from(
        containerRef.current?.querySelectorAll("[data-gsap-progress-fill]") || [],
      );

      if (items.length > 0) {
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.08,
            ease: "power2.out",
            clearProps: "opacity,transform",
          },
        );
      }

      progressFills.forEach((fill, index) => {
        const targetWidth = fill.style.width || fill.dataset.targetWidth || "0%";
        gsap.fromTo(
          fill,
          { width: "0%" },
          {
            width: targetWidth,
            duration: 0.8,
            delay: 0.12 + index * 0.04,
            ease: "power2.out",
          },
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, [animateKey, children]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

export default GsapRevealGroup;
