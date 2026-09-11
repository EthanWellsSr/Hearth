// "Hearth" mark: a house with a small sprig growing from the roof (home + growth).
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
      className="h-full w-full"
    >
      {/* house */}
      <path d="M5 20.5V11l7-5.5 7 5.5v9.5Z" />
      {/* door */}
      <path d="M10 20.5v-4.5h4v4.5" />
      {/* sprig growing from the roof peak */}
      <path d="M12 5.5V2.5" />
      <path
        d="M12 3.4C11.2 2 9.6 1.4 8 1.8c.2 1.7 1.6 2.8 3.2 2.5z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M12 4.6c.7-1.2 2.1-1.8 3.5-1.5-.1 1.5-1.4 2.5-2.9 2.2z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
