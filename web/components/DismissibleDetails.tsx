"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";

// A <details> dropdown that closes on an outside click or Escape, which the
// native element does not do on its own.
export function DismissibleDetails({
  className,
  children,
  ref,
}: {
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLDetailsElement>;
}) {
  const own = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function close(event: Event) {
      const details = own.current;
      if (!details?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        details.open = false;
        details.querySelector("summary")?.focus();
      } else if (!details.contains(event.target as Node)) {
        details.open = false;
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details
      className={className}
      ref={(node) => {
        own.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
    >
      {children}
    </details>
  );
}
