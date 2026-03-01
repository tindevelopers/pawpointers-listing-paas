import React from "react";
import {
  BuildingIcon,
  CartIcon,
  ChevronDownIcon,
  GridIcon,
  ListIcon,
  MailIcon,
  StarIcon,
  UserCircleIcon,
  GroupIcon,
} from "@/icons";

export type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  new?: boolean;
  pro?: boolean;
  subItems?: NavItem[];
};

/**
 * Merchant dashboard navigation - mirrors admin AppSidebar structure.
 * Single "Menu" section with accordion expand/collapse.
 */
export const merchantNavItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: <GridIcon />,
    path: "/dashboard",
  },
  {
    name: "Merchant Profile",
    icon: <BuildingIcon />,
    path: "/merchant-profile",
  },
  {
    name: "Listings",
    icon: <ListIcon />,
    path: "/listings",
  },
  {
    name: "Reviews",
    icon: <StarIcon />,
    path: "/reviews",
  },
  {
    name: "Inbox",
    icon: <MailIcon />,
    subItems: [
      { name: "Inbox", path: "/inbox" },
      { name: "Details", path: "/inbox/details" },
    ],
  },
  {
    name: "Billing & Plans",
    icon: <CartIcon />,
    subItems: [
      { name: "Billing Dashboard", path: "/billing" },
      { name: "Cancel Subscription", path: "/billing/cancel-subscription" },
      { name: "Upgrade to Pro", path: "/billing/upgrade" },
      { name: "Update Billing Address", path: "/billing/address" },
      { name: "Add New Card", path: "/billing/card" },
    ],
  },
  {
    name: "User Profile",
    icon: <UserCircleIcon />,
    subItems: [
      { name: "Edit Profile", path: "/profile?tab=profile" },
      { name: "Account Settings", path: "/profile?tab=account" },
      { name: "Change Password", path: "/profile?tab=password" },
    ],
  },
  {
    name: "Team",
    icon: <GroupIcon />,
    path: "/team",
  },
];

export { ChevronDownIcon };
