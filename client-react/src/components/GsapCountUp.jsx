import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";

const GsapCountUp = ({
  value = 0,
  duration = 0.9,
  className = "",
  animateKey = "default",
  style,
  formatter,
}) => {
  const numberRef = useRef(null);
  const previousValueRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const formatValue = (numericValue) => {
    if (typeof formatter === "function") {
      return formatter(numericValue);
    }
    return Math.round(numericValue).toString();
  };

  useLayoutEffect(() => {
    if (!numberRef.current || typeof window === "undefined") return undefined;
    const targetValue = Number(value) || 0;

    if (prefersReducedMotion) {
      numberRef.current.textContent = formatValue(targetValue);
      previousValueRef.current = targetValue;
      return undefined;
    }

    const startValue =
      previousValueRef.current === null ? 0 : previousValueRef.current;
    const state = { value: startValue };
    const ctx = gsap.context(() => {
      gsap.to(state, {
        value: targetValue,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          if (!numberRef.current) return;
          numberRef.current.textContent = formatValue(state.value);
        },
        onComplete: () => {
          previousValueRef.current = targetValue;
        },
      });
    }, numberRef);

    return () => ctx.revert();
  }, [animateKey, duration, prefersReducedMotion, value]);

  return (
    <span ref={numberRef} className={className} style={style}>
      {formatValue(Number(value) || 0)}
    </span>
  );
};

export default GsapCountUp;
