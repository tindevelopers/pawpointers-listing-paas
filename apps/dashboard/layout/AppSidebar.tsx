"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useTenant } from "@tinadmin/core/multi-tenancy";
import { useWhiteLabel } from "@/context/WhiteLabelContext";
import { merchantNavItems, ChevronDownIcon } from "@/config/navigation";

const MenuDotsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
    <path fillRule="evenodd" clipRule="evenodd" d="M5.99915 10.2451C6.96564 10.2451 7.74915 11.0286 7.74915 11.9951V12.0051C7.74915 12.9716 6.96564 13.7551 5.99915 13.7551C5.03265 13.7551 4.24915 12.9716 4.24915 12.0051V11.9951C4.24915 11.0286 5.03265 10.2451 5.99915 10.2451ZM17.9991 10.2451C18.9656 10.2451 19.7491 11.0286 19.7491 11.9951V12.0051C19.7491 12.9716 18.9656 13.7551 17.9991 13.7551C17.0326 13.7551 16.2491 12.9716 16.2491 12.0051V11.9951C16.2491 11.0286 17.0326 10.2451 17.9991 10.2451ZM13.7491 11.9951C13.7491 11.0286 12.9656 10.2451 11.9991 10.2451C11.0326 10.2451 10.2491 11.0286 10.2491 11.9951V12.0051C10.2491 12.9716 11.0326 13.7551 11.9991 13.7551C12.9656 13.7551 13.7491 12.9716 13.7491 12.0051V11.9951Z" fill="currentColor" />
  </svg>
);
import SidebarWidget from "./SidebarWidget";
import type { NavItem } from "@/config/navigation";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const { branding } = useWhiteLabel();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showExpanded = isMounted && (isExpanded || isHovered || isMobileOpen);

  const logoUrl = branding.logo || "/images/logo/logo.svg";
  const logoDarkUrl = branding.logo || "/images/logo/logo-dark.svg";
  const logoIconUrl = branding.favicon || "/images/logo/logo-icon.svg";

  const isActive = useCallback(
    (path: string) => {
      if (path.includes("?")) {
        const [base, query] = path.split("?");
        if (pathname !== base) return false;
        const tab = query?.replace("tab=", "");
        return tab ? searchParams.get("tab") === tab : true;
      }
      return pathname === path;
    },
    [pathname, searchParams]
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main";
    index: number;
    subIndex?: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let submenuMatched = false;
    outerLoop: for (let index = 0; index < merchantNavItems.length; index++) {
      const nav = merchantNavItems[index];
      if (nav.subItems) {
        for (let subIndex = 0; subIndex < nav.subItems.length; subIndex++) {
          const subItem = nav.subItems[subIndex];
          if ("subItems" in subItem && subItem.subItems) {
            for (const nestedItem of subItem.subItems) {
              if (nestedItem.path && isActive(nestedItem.path)) {
                setOpenSubmenu({ type: "main", index, subIndex });
                submenuMatched = true;
                break outerLoop;
              }
            }
          } else if (subItem.path && isActive(subItem.path)) {
            setOpenSubmenu({ type: "main", index });
            submenuMatched = true;
            break outerLoop;
          }
        }
      }
    }
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

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

  const handleSubmenuToggle = (
    index: number,
    menuType: "main",
    subIndex?: number
  ) => {
    setOpenSubmenu((prev) => {
      if (
        prev &&
        prev.type === menuType &&
        prev.index === index &&
        prev.subIndex === subIndex
      ) {
        return null;
      }
      return { type: menuType, index, subIndex };
    });
  };

  const renderMenuItems = (navItems: NavItem[], menuType: "main") => (
    <ul className="flex flex-col gap-1">
      {navItems.map((nav, index) => (
        <li key={`${menuType}-${nav.path || nav.name}-${index}`}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              aria-expanded={
                openSubmenu?.type === menuType && openSubmenu?.index === index
              }
              aria-controls={`submenu-${menuType}-${index}`}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !showExpanded ? "lg:justify-center" : "lg:justify-start"
              }`}
            >
              <span
                className={
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }
              >
                {nav.icon}
              </span>
              {showExpanded && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {nav.new && showExpanded && (
                <span
                  className={`ml-auto absolute right-10 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "menu-dropdown-badge-active"
                      : "menu-dropdown-badge-inactive"
                  } menu-dropdown-badge`}
                >
                  new
                </span>
              )}
              {showExpanded && nav.subItems && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
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
              id={`submenu-${menuType}-${index}`}
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              role="region"
              aria-labelledby={`menu-${menuType}-${index}`}
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9" role="menu">
                {nav.subItems.map((subItem, subIndex) => {
                  const isNestedMenu =
                    "subItems" in subItem &&
                    subItem.subItems &&
                    !("path" in subItem);
                  const isNestedOpen =
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index &&
                    openSubmenu?.subIndex === subIndex;

                  if (isNestedMenu) {
                    return (
                      <li
                        key={
                          subItem.path || `${subItem.name}-${subIndex}`
                        }
                        role="none"
                      >
                        <button
                          onClick={() =>
                            handleSubmenuToggle(index, menuType, subIndex)
                          }
                          className="menu-dropdown-item w-full text-left flex items-center justify-between"
                        >
                          <span>{subItem.name}</span>
                          <ChevronDownIcon
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isNestedOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {isNestedOpen && (
                          <ul className="mt-1 ml-4 space-y-1" role="menu">
                            {subItem.subItems?.map(
                              (nestedItem, nestedIndex) => {
                                if (
                                  "path" in nestedItem &&
                                  nestedItem.path
                                ) {
                                  return (
                                    <li
                                      key={
                                        nestedItem.path ||
                                        `${nestedItem.name}-${nestedIndex}`
                                      }
                                      role="none"
                                    >
                                      <Link
                                        href={nestedItem.path}
                                        role="menuitem"
                                        className={`menu-dropdown-item ${
                                          isActive(nestedItem.path)
                                            ? "menu-dropdown-item-active"
                                            : "menu-dropdown-item-inactive"
                                        }`}
                                      >
                                        {nestedItem.name}
                                      </Link>
                                    </li>
                                  );
                                }
                                return null;
                              }
                            )}
                          </ul>
                        )}
                      </li>
                    );
                  }

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
                          <span className="flex items-center gap-1 ml-auto">
                            {subItem.new && (
                              <span
                                className={`ml-auto ${
                                  isActive(subItem.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                } menu-dropdown-badge`}
                              >
                                new
                              </span>
                            )}
                            {subItem.pro && (
                              <span
                                className={`ml-auto ${
                                  isActive(subItem.path)
                                    ? "menu-dropdown-badge-pro-active"
                                    : "menu-dropdown-badge-pro-inactive"
                                } menu-dropdown-badge-pro`}
                              >
                                pro
                              </span>
                            )}
                          </span>
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
      className={`fixed flex flex-col xl:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-full transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
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
        <Link href="/dashboard">
          {showExpanded ? (
            <>
              <Image
                className="dark:hidden"
                src={logoUrl}
                alt={branding.companyName || "Logo"}
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src={logoDarkUrl}
                alt={branding.companyName || "Logo"}
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src={logoIconUrl}
              alt={branding.companyName || "Logo"}
              width={32}
              height={32}
            />
          )}
        </Link>
        {showExpanded && (
          <div className="w-full">
            {!isTenantLoading && tenant ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Workspace
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {tenant.name}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !showExpanded ? "xl:justify-center" : "justify-start"
                }`}
              >
                {showExpanded ? "Menu" : <MenuDotsIcon />}
              </h2>
              {renderMenuItems(merchantNavItems, "main")}
            </div>
          </div>
        </nav>
        {showExpanded ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
