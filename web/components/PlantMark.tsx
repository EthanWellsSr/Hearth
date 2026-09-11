// A house wrapped in a climbing vine — "Hearth" as home + plant life.
// Colored by the accent via currentColor.
export function PlantMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* house */}
      <path d="M6 21V11l6-5 6 5v10" />
      <path d="M6 21h12" />
      {/* door */}
      <path d="M10.5 21v-4.5h3V21" />
      {/* climbing vine up the right wall */}
      <path d="M18 21c3-1.4 3.4-4.6 1.2-6.8" />
      <path
        d="M19.4 15c1.1-.1 2-1 2.2-2.2-1.2-.2-2.2.6-2.2 2.2z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M18.4 18c1.1.2 2.2-.3 2.7-1.4-1.1-.5-2.3-.1-2.7 1.4z"
        fill="currentColor"
        stroke="none"
      />
      {/* climbing vine up the left wall */}
      <path d="M6 21c-3-1.4-3.4-4.6-1.2-6.8" />
      <path
        d="M4.6 15c-1.1-.1-2-1-2.2-2.2 1.2-.2 2.2.6 2.2 2.2z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M5.6 18c-1.1.2-2.2-.3-2.7-1.4 1.1-.5 2.3-.1 2.7 1.4z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
