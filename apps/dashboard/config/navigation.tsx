import React from "react";
import {
  BuildingIcon,
  CalenderIcon,
  CartIcon,
  ChevronDownIcon,
  GridIcon,
  ListIcon,
  MailIcon,
  StarIcon,
  UserCircleIcon,
  GroupIcon,
  VideoIcon,
} from "@/icons";
import type { DashboardFeatureKey } from "@/lib/subscription-entitlements";

export type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  new?: boolean;
  pro?: boolean;
  featureKey?: DashboardFeatureKey;
  lockedLabel?: string;
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
    featureKey: "dashboard",
  },
  {
    name: "Merchant Profile",
    icon: <BuildingIcon />,
    path: "/merchant-profile",
    featureKey: "merchantProfile",
  },
  {
    name: "Listings",
    icon: <ListIcon />,
    path: "/listings",
    featureKey: "listings",
  },
  {
    name: "Media",
    icon: <VideoIcon />,
    path: "/media",
    featureKey: "media",
  },
  {
    name: "Bookings",
    icon: <CalenderIcon />,
    path: "/bookings",
    featureKey: "bookings",
    pro: true,
    lockedLabel: "Start Pro Plan to unlock bookings",
  },
  {
    name: "Reviews",
    icon: <StarIcon />,
    path: "/reviews",
    featureKey: "reviews",
    pro: true,
    lockedLabel: "Start Pro Plan to unlock reviews",
  },
  {
    name: "Inbox",
    icon: <MailIcon />,
    featureKey: "inbox",
    lockedLabel: "Start Pro Plan to unlock inbox",
    subItems: [
      { name: "Inbox", path: "/inbox", featureKey: "inbox" },
      { name: "Details", path: "/inbox/details", featureKey: "inbox" },
    ],
  },
  {
    name: "Billing & Plans",
    icon: <CartIcon />,
    featureKey: "billing",
    subItems: [
      { name: "Billing Dashboard", path: "/billing", featureKey: "billing" },
      { name: "Cancel Subscription", path: "/billing/cancel-subscription", featureKey: "billing" },
      { name: "Start Pro Plan", path: "/billing/upgrade", featureKey: "billing" },
      { name: "Update Billing Address", path: "/billing/address", featureKey: "billing" },
      { name: "Add New Card", path: "/billing/card", featureKey: "billing" },
    ],
  },
  {
    name: "User Profile",
    icon: <UserCircleIcon />,
    featureKey: "profile",
    subItems: [
      { name: "Edit Profile", path: "/profile?tab=profile", featureKey: "profile" },
      { name: "Account Settings", path: "/profile?tab=account", featureKey: "profile" },
      { name: "Change Password", path: "/profile?tab=password", featureKey: "profile" },
    ],
  },
  {
    name: "Team",
    icon: <GroupIcon />,
    path: "/team",
    featureKey: "team",
    pro: true,
    lockedLabel: "Upgrade to Premium for team tools",
  },
];

export { ChevronDownIcon };
