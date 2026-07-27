"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavItem } from "@/app/admin/nav-config";
import { NAV_ICONS } from "@/components/admin/nav-icons";
import { logoutAction } from "@/lib/actions/session";
import { cn } from "@/lib/utils";

export function AdminSidebar({
  items,
  title,
}: {
  items: AdminNavItem[];
  title: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[250px] flex-none flex-col gap-1.5 bg-brand-deep px-5 py-7 text-white max-lg:hidden">
      <div className="mb-6 text-[22px] font-black">
        إدلب<span className="text-[#8fd0ff]">.com</span>
      </div>
      <div className="mb-1 truncate text-xs font-medium text-[#8fa8bd]">{title}</div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = NAV_ICONS[item.icon];
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

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-3.5 py-3 text-[15px] text-[#ffb3a7] hover:bg-white/[.08]"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          تسجيل خروج
        </button>
      </form>
    </aside>
  );
}
