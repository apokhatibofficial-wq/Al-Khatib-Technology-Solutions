"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { DashboardNavItem } from "@/app/dashboard/nav-config";
import { DASHBOARD_NAV_ICONS } from "@/components/dashboard/nav-icons";
import { logoutAction } from "@/lib/actions/session";
import { cn } from "@/lib/utils";

export function DashboardMobileNav({
  items,
  title,
  hideLogout = false,
}: {
  items: DashboardNavItem[];
  title: string;
  hideLogout?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="hidden max-lg:block">
      <div className="flex items-center justify-between bg-brand-deep px-5 py-4 text-white">
        <div className="truncate text-lg font-black">{title}</div>
        <button
          type="button"
          aria-label="فتح القائمة"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-lg p-2 hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col bg-brand-deep px-5 py-7 text-white">
          <div className="mb-6 flex items-center justify-between">
            <div className="truncate text-xl font-black">{title}</div>
            <button
              type="button"
              aria-label="إغلاق القائمة"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-lg p-2 hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-auto">
            {items.map((item) => {
              const active = pathname === item.href;
              const Icon = DASHBOARD_NAV_ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[15px]",
                    active ? "bg-white/[.14] font-bold text-white" : "text-[#bcd3e4] hover:bg-white/[.08]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {!hideLogout && (
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[15px] text-[#ffb3a7] hover:bg-white/[.08]"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
                تسجيل خروج
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
