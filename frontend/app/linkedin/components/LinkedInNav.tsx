"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Palette,
  PenTool,
  Calendar,
  Anchor,
  BookOpen,
  BarChart3,
  Hash,
  Users,
  Layers,
  Menu,
  X,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/linkedin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/linkedin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/linkedin/posts", label: "Posts", icon: FileText },
      { href: "/linkedin/drafts", label: "Drafts", icon: PenTool },
      { href: "/linkedin/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/linkedin/mood-board", label: "Mood Board", icon: Palette },
      { href: "/linkedin/hooks-library", label: "Hooks", icon: Anchor },
      { href: "/linkedin/hashtags", label: "Hashtags", icon: Hash },
      { href: "/linkedin/series", label: "Series", icon: Layers },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/linkedin/competitors", label: "Competitors", icon: Users },
    ],
  },
];

const NavContent = memo(function NavContent({
  pathname,
  onLinkClick,
}: {
  pathname: string;
  onLinkClick?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-3 py-4 mb-4">
        <div className="p-1.5 bg-indigo-600 rounded-lg">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg text-gray-900 tracking-tight">LI Planner</span>
      </div>
      <div className="space-y-5 flex-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-3 mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/linkedin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className={`flex items-center gap-3 py-2 text-sm font-medium transition-all border-l-2 ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 border-indigo-600 rounded-r-lg pl-[10px] pr-3"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent rounded-lg px-3"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 px-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-gray-400">Local · Personal</span>
        </div>
      </div>
    </>
  );
});

NavContent.displayName = "NavContent";

const LinkedInNav = memo(function LinkedInNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button — visible only below lg */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-in nav */}
      <nav
        className={`lg:hidden fixed top-0 left-0 z-50 w-64 bg-white border-r border-gray-200 min-h-dvh p-4 flex flex-col shrink-0 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile navigation"
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
        <NavContent pathname={pathname} onLinkClick={() => setMobileOpen(false)} />
      </nav>

      {/* Desktop fixed sidebar — visible only at lg and above */}
      <nav
        className="hidden lg:flex w-56 bg-white border-r border-gray-200 min-h-screen p-4 flex-col shrink-0"
        aria-label="Desktop navigation"
      >
        <NavContent pathname={pathname} />
      </nav>
    </>
  );
});

LinkedInNav.displayName = "LinkedInNav";
export default LinkedInNav;
