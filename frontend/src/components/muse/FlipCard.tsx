import { useState } from "react";

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  onFlipToBack?: () => void;
}

export function FlipCard({ front, back, className = "", onFlipToBack }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    if (!flipped) {
      onFlipToBack?.();
    }
    setFlipped(!flipped);
  };

  return (
    <div
      className={`perspective-1000 cursor-pointer ${className}`}
      onClick={handleFlip}
    >
      <div
        className="preserve-3d relative transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Front */}
        <div
          className="backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          {front}
        </div>
        {/* Back */}
        <div
          className="backface-hidden absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}
