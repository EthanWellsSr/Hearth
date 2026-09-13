export function MeadowSprig({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 180 100"
      fill="none"
      className={className}
    >
      <path
        d="M9 91C46 82 54 52 83 44c27-8 42 10 86-30"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M44 75c-15 1-24-6-29-19 16-2 26 4 29 19Z"
        fill="currentColor"
        opacity=".72"
      />
      <path
        d="M70 51c-4-14 1-25 14-33 5 15 0 26-14 33Z"
        fill="currentColor"
        opacity=".5"
      />
      <path
        d="M112 42c5-13 15-19 30-17-5 14-15 20-30 17Z"
        fill="currentColor"
        opacity=".64"
      />
      <circle cx="158" cy="21" r="5" fill="var(--sunshine)" />
    </svg>
  );
}

export function TinyLeaf({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M19.5 4.5C12 4.7 6.5 8.1 6 14.8c3.8.7 10.6-1.4 13.5-10.3Z"
        fill="currentColor"
        opacity=".9"
      />
      <path
        d="M4.5 20c2.7-5.7 6.5-8.9 11.5-11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
