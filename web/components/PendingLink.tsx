"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function LinkStatus({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className="contents" data-link-pending={pending || undefined} aria-busy={pending || undefined}>
      {children}
    </span>
  );
}

// A Link that acknowledges the click immediately. Navigations that only change
// the query string (Calendar views, month/week paging) reuse the same page, so
// the route loading state never appears; this pending state fills that gap.
export function PendingLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      <LinkStatus>{children}</LinkStatus>
    </Link>
  );
}
