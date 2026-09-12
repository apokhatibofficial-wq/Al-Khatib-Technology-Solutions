import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", className = "", disabled, ...rest }: Props) {
  const base = "w-full rounded-2xl py-3.5 font-bold text-base transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";
  const variants = {
    primary: "bg-ink text-yellow shadow-sm",
    ghost: "bg-transparent text-ink-soft underline underline-offset-4",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled} {...rest} />;
}
