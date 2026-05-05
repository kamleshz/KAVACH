import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

const GsapCountUp = ({
  value = 0,
  duration = 0.9,
  className = "",
  animateKey = "default",
  style,
  formatter,
}) => {
  const numberRef = useRef(null);

  const formatValue = (numericValue) => {
    if (typeof formatter === "function") {
      return formatter(numericValue);
    }
    return Math.round(numericValue).toString();
  };

  useLayoutEffect(() => {
    if (!numberRef.current || typeof window === "undefined") return undefined;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const targetValue = Number(value) || 0;

    if (prefersReducedMotion) {
      numberRef.current.textContent = formatValue(targetValue);
      return undefined;
    }

    const state = { value: 0 };
    const ctx = gsap.context(() => {
      gsap.to(state, {
        value: targetValue,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          if (!numberRef.current) return;
          numberRef.current.textContent = formatValue(state.value);
        },
      });
    }, numberRef);

    return () => ctx.revert();
  }, [animateKey, duration, value]);

  return (
    <span ref={numberRef} className={className} style={style}>
      {formatValue(Number(value) || 0)}
    </span>
  );
};

export default GsapCountUp;
