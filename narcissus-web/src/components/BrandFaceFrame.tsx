import Image from "next/image";

type BrandFaceFrameProps = {
  /** Visual scale for hub hero vs compact chrome */
  size?: "hero" | "md" | "sm";
  className?: string;
  /** Accessible label when the frame is the main brand mark */
  label?: string;
};

/**
 * Ornamental face-frame echoing the Narcissus logo:
 * rose-gold wing curves, cyan petal glow, portrait crop at center.
 */
export function BrandFaceFrame({
  size = "hero",
  className = "",
  label = "Narcissus",
}: BrandFaceFrameProps) {
  const decorative = !label;
  return (
    <div
      className={`brand-face-frame brand-face-frame--${size} ${className}`.trim()}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
    >
      <div className="brand-face-petal-glow" aria-hidden="true" />
      <svg
        className="brand-face-wings"
        viewBox="0 0 320 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="wingMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0dcc8" />
            <stop offset="35%" stopColor="#e5c3b2" />
            <stop offset="70%" stopColor="#c4a08c" />
            <stop offset="100%" stopColor="#8f6f5c" />
          </linearGradient>
          <linearGradient id="wingFill" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#1a2438" />
            <stop offset="55%" stopColor="#0a101c" />
            <stop offset="100%" stopColor="#05080f" />
          </linearGradient>
          <filter id="wingGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Left wing */}
        <path
          d="M158 118 C120 108 78 78 52 48 C70 72 78 108 70 138 C78 152 108 158 140 148 C128 138 148 128 158 118Z"
          fill="url(#wingFill)"
          stroke="url(#wingMetal)"
          strokeWidth="2.2"
          filter="url(#wingGlow)"
        />
        <path
          d="M148 122 C118 112 92 88 72 64"
          stroke="url(#wingMetal)"
          strokeWidth="0.9"
          opacity="0.55"
        />
        <circle cx="86" cy="96" r="2.2" fill="url(#wingMetal)" opacity="0.8" />
        <circle cx="104" cy="124" r="1.8" fill="url(#wingMetal)" opacity="0.65" />

        {/* Right wing */}
        <path
          d="M162 118 C200 108 242 78 268 48 C250 72 242 108 250 138 C242 152 212 158 180 148 C192 138 172 128 162 118Z"
          fill="url(#wingFill)"
          stroke="url(#wingMetal)"
          strokeWidth="2.2"
          filter="url(#wingGlow)"
        />
        <path
          d="M172 122 C202 112 228 88 248 64"
          stroke="url(#wingMetal)"
          strokeWidth="0.9"
          opacity="0.55"
        />
        <circle cx="234" cy="96" r="2.2" fill="url(#wingMetal)" opacity="0.8" />
        <circle cx="216" cy="124" r="1.8" fill="url(#wingMetal)" opacity="0.65" />

        {/* Infinity / lower ornament */}
        <path
          d="M128 156 C138 142 152 142 160 156 C168 142 182 142 192 156 C182 170 168 170 160 156 C152 170 138 170 128 156Z"
          stroke="url(#wingMetal)"
          strokeWidth="2"
          fill="url(#wingFill)"
          filter="url(#wingGlow)"
        />
      </svg>

      <div className="brand-face-portrait">
        <Image
          src="/brand/narcissus-logo.jpg"
          alt=""
          fill
          sizes="(max-width: 640px) 56vw, 280px"
          priority={size === "hero"}
          className="object-cover object-[center_30%]"
        />
      </div>

      <div className="brand-face-ring" aria-hidden="true" />
    </div>
  );
}
