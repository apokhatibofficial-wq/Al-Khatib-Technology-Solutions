"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardNavItem } from "@/app/dashboard/nav-config";
import { DASHBOARD_NAV_ICONS } from "@/components/dashboard/nav-icons";
import { logoutAction } from "@/lib/actions/session";
import { cn } from "@/lib/utils";

export function DashboardSidebar({
  items,
  title,
  hideLogout = false,
}: {
  items: DashboardNavItem[];
  title: string;
  hideLogout?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[250px] flex-none flex-col gap-1.5 bg-brand-deep px-5 py-7 text-white max-lg:hidden">
      <div className="mb-6 truncate text-xl font-black">{title}</div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = DASHBOARD_NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[15px] transition-colors",
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
    </aside>
  );
}
