import { useState, useEffect, useRef } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  skip?: boolean;
}

export const TypewriterText = ({ 
  text, 
  speed = 30, 
  onComplete, 
  className = "",
  skip = false 
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (skip) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    indexRef.current = 0;
    setDisplayedText("");
    setIsComplete(false);
    lastTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastTimeRef.current;
      
      if (elapsed >= speed) {
        lastTimeRef.current = currentTime;
        
        if (indexRef.current < text.length) {
          setDisplayedText(text.slice(0, indexRef.current + 1));
          indexRef.current++;
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsComplete(true);
          onComplete?.();
        }
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [text, speed, skip, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && <span className="animate-pulse">▌</span>}
    </span>
  );
};
