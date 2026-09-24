"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
  pendingChildren?: ReactNode;
};

export function FormSubmitButton({
  children,
  pendingChildren,
  disabled,
  ...props
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? pendingChildren ?? children : children}
    </button>
  );
}
