import React from "react";

export const BRAND_NAME = "Nutri Hijau";
export const BRAND_TAGLINE = "Personal & Family Nutrition Intelligence";
export const BRAND_PILLARS = "Nutrition • Wellness • Healthy Lifestyle";

interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = "md" }) => {
  const boxClass =
    size === "sm"
      ? "w-7 h-7 rounded-lg"
      : size === "lg"
        ? "w-11 h-11 rounded-2xl"
        : "w-9 h-9 rounded-xl";

  const svgClass =
    size === "sm"
      ? "w-4 h-4"
      : size === "lg"
        ? "w-6 h-6"
        : "w-5 h-5";

  return (
    <div
      className={`${boxClass} bg-gradient-to-br from-[#10B981] via-[#34D399] to-[#84CC16] text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={svgClass}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19.5 4.5C13.5 4.5 7.5 7.8 5.8 14.2C5.2 16.4 5.5 18.4 6 19.5C7.1 20 9.1 20.3 11.3 19.7C17.7 18 21 12 19.5 4.5Z"
          fill="currentColor"
          fillOpacity="0.22"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.2 19.8C8.5 16.5 12.2 12.6 17.5 7.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M10.5 14.5H14.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
