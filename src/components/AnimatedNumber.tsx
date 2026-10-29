import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

export default function AnimatedNumber({
  value,
  format = (n) => String(n),
  duration = 0.9,
  className = '',
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState(format(0));

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setText(format(value));
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setText(format(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration, format, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
