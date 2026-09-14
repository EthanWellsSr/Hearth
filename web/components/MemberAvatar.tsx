import Image from "next/image";
import { DEFAULT_AVATAR_URL } from "@/lib/profile";

export function MemberAvatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full border-2 border-white bg-stone-50 shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src || DEFAULT_AVATAR_URL}
        alt={`${name} Avatar`}
        fill
        sizes={`${size}px`}
        className="object-cover"
        unoptimized={Boolean(src?.startsWith("http"))}
      />
    </span>
  );
}
