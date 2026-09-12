import type { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-border bg-cream-soft px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60 outline-none focus:border-yellow ${props.className ?? ""}`}
    />
  );
}
