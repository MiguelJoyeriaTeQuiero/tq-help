"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" };

export function StarRating({ value, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const sz = sizes[size];

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Valoración">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered || value) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
            className={`transition-transform ${readonly ? "cursor-default" : "hover:scale-110 cursor-pointer"}`}
          >
            <svg
              className={`${sz} transition-colors`}
              fill={filled ? "#f59e0b" : "none"}
              stroke={filled ? "#f59e0b" : "#d1d5db"}
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
