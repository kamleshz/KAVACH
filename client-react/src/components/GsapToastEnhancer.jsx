import { useEffect } from "react";
import { gsap } from "gsap";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

const GsapToastEnhancer = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (prefersReducedMotion) return undefined;

    const animateToast = (node) => {
      if (!node || node.dataset.gsapToastAnimated === "true") return;
      node.dataset.gsapToastAnimated = "true";

      gsap.fromTo(
        node,
        { autoAlpha: 0, x: 20, scale: 0.98 },
        {
          autoAlpha: 1,
          x: 0,
          scale: 1,
          duration: 0.28,
          ease: "power2.out",
          clearProps: "opacity,transform",
        },
      );
    };

    const scanExisting = () => {
      document.querySelectorAll(".Toastify__toast").forEach(animateToast);
    };

    scanExisting();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(".Toastify__toast")) {
            animateToast(node);
            return;
          }
          node.querySelectorAll?.(".Toastify__toast").forEach(animateToast);
        });
      });
    });

    const toastRoot = document.querySelector(".Toastify");

    observer.observe(toastRoot || document.body, {
      childList: true,
      subtree: Boolean(toastRoot),
    });

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return null;
};

export default GsapToastEnhancer;
