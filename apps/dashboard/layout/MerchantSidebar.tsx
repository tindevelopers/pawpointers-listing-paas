"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { merchantNavItems, ChevronDownIcon } from "@/config/navigation";
import type { NavItem } from "@/config/navigation";

const MerchantSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showExpanded = isMounted && (isExpanded || isHovered || isMobileOpen);

  const isActive = useCallback(
    (path: string) => {
      const basePath = path.split("?")[0];
      if (pathname !== basePath) return false;
      const query = path.includes("?") ? path.split("?")[1] : "";
      if (!query) return true;
      const params = new URLSearchParams(query);
      for (const [key, value] of params) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    },
    [pathname, searchParams]
  );

  const [openSubmenu, setOpenSubmenu] = useState<{ index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    for (let index = 0; index < merchantNavItems.length; index++) {
      const nav = merchantNavItems[index];
      if (nav.subItems) {
        for (const subItem of nav.subItems) {
          if ("path" in subItem && subItem.path && isActive(subItem.path)) {
            setOpenSubmenu({ index });
            return;
          }
        }
      }
    }
    setOpenSubmenu(null);
  }, [pathname, searchParams, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `main-${openSubmenu.index}`;
      requestAnimationFrame(() => {
        if (subMenuRefs.current[key]) {
          setSubMenuHeight((prev) => ({
            ...prev,
            [key]: subMenuRefs.current[key]?.scrollHeight || 0,
          }));
        }
      });
    } else {
      setSubMenuHeight({});
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prev) =>
      prev?.index === index ? null : { index }
    );
  };

  const renderMenuItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1">
      {items.map((nav, index) => (
        <li key={nav.path || nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index)}
              aria-expanded={openSubmenu?.index === index}
              aria-controls={`submenu-main-${index}`}
              className={`menu-item group cursor-pointer ${
                openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } ${!showExpanded ? "lg:justify-center" : "lg:justify-start"}`}
            >
              <span
                className={
                  openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }
              >
                {nav.icon}
              </span>
              {showExpanded && <span className="menu-item-text">{nav.name}</span>}
              {showExpanded && nav.subItems && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.index === index ? "menu-item-arrow-active" : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }
                >
                  {nav.icon}
                </span>
                {showExpanded && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && showExpanded && (
            <div
              id={`submenu-main-${index}`}
              ref={(el) => {
                subMenuRefs.current[`main-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              role="region"
              style={{
                height:
                  openSubmenu?.index === index
                    ? `${subMenuHeight[`main-${index}`] ?? 0}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9" role="menu">
                {nav.subItems.map((subItem, subIndex) => {
                  if ("path" in subItem && subItem.path) {
                    return (
                      <li
                        key={subItem.path || `${subItem.name}-${subIndex}`}
                        role="none"
                      >
                        <Link
                          href={subItem.path}
                          role="menuitem"
                          className={`menu-dropdown-item ${
                            isActive(subItem.path)
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
                          }`}
                        >
                          {subItem.name}
                        </Link>
                      </li>
                    );
                  }
                  return null;
                })}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed flex flex-col top-0 left-0 px-5 bg-white border-r border-gray-200 text-gray-900 h-full transition-all duration-300 ease-in-out z-50
        ${
          isMounted
            ? isExpanded || isMobileOpen
              ? "w-[290px]"
              : isHovered
                ? "w-[290px]"
                : "w-[90px]"
            : "w-[90px]"
        }
        ${isMounted && isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        xl:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex flex-col gap-3 ${
          !showExpanded ? "xl:items-center" : "items-start"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          {showExpanded ? (
            <span className="text-lg font-semibold text-gray-900">
              Pawpointers Dashboard
            </span>
          ) : (
            <span className="text-xl font-bold text-orange-500">P</span>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div>
            <h2
              className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                !showExpanded ? "xl:justify-center" : "justify-start"
              }`}
            >
              {showExpanded ? "Menu" : "•••"}
            </h2>
            {renderMenuItems(merchantNavItems)}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default MerchantSidebar;
