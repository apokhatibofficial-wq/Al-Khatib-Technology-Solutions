import type React from "react";

export function AuthShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="bg-brand-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px] rounded-3xl bg-white p-10 sm:p-11">
        <div className="mb-2 text-center text-[28px] font-black text-brand-deep">
          إدلب<span className="text-brand">.com</span>
        </div>
        <div className="mb-7 text-center text-sm text-sub">{subtitle}</div>
        {children}
      </div>
    </div>
  );
}
