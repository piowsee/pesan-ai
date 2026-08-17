'use client';

import {
  type DashboardDomainId,
  dashboardPaths,
} from '@/components/dashboard/dashboard-navigation';
import { useChatNavHref } from '@/hooks/use-chat-nav-href';
import {
  BriefcaseBusiness,
  Home,
  type LucideIcon,
  MessageSquare,
  UsersRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type IconType } from 'react-icons';
import { FaWhatsapp } from 'react-icons/fa6';

export type DashboardNavigationIcon = LucideIcon | IconType;

export type DashboardNavigationItem = {
  id: string;
  title: string;
  url: string;
  icon: DashboardNavigationIcon;
  matchPath: string;
  exact?: boolean;
};

export type DashboardNavigationSection = {
  id: Exclude<DashboardDomainId, 'chat'>;
  title: string;
  defaultUrl: string;
  icon: LucideIcon;
  matchPath: string;
  items: DashboardNavigationItem[];
};

export type DashboardMobileDomain = {
  id: DashboardDomainId;
  title: string;
  url: string;
  icon: LucideIcon;
  matchPath: string;
};

export function useDashboardNavigation() {
  const chatHref = useChatNavHref();
  const t = useTranslations('Sidebar');

  const chatItem: DashboardNavigationItem = {
    id: 'chat',
    title: t('chat'),
    url: chatHref,
    icon: MessageSquare,
    matchPath: dashboardPaths.chat,
  };

  const sections: DashboardNavigationSection[] = [
    {
      id: 'business',
      title: t('business.title'),
      defaultUrl: dashboardPaths.businessOverview,
      icon: BriefcaseBusiness,
      matchPath: dashboardPaths.business,
      items: [
        {
          id: 'business-overview',
          title: t('business.overview'),
          url: dashboardPaths.businessOverview,
          icon: Home,
          matchPath: dashboardPaths.businessOverview,
          exact: true,
        },
        {
          id: 'business-connect-app',
          title: t('business.connectApp'),
          url: dashboardPaths.businessConnectApp,
          icon: FaWhatsapp,
          matchPath: dashboardPaths.businessConnectApp,
        },
      ],
    },
    {
      id: 'customer',
      title: t('customer.title'),
      defaultUrl: dashboardPaths.customers,
      icon: UsersRound,
      matchPath: dashboardPaths.customer,
      items: [
        {
          id: 'customers',
          title: t('customer.customers'),
          url: dashboardPaths.customers,
          icon: UsersRound,
          matchPath: dashboardPaths.customers,
        },
      ],
    },
  ];

  const mobileDomains: DashboardMobileDomain[] = [
    {
      id: 'chat',
      title: t('chat'),
      url: chatHref,
      icon: MessageSquare,
      matchPath: dashboardPaths.chat,
    },
    ...sections.map((section) => ({
      id: section.id,
      title: section.title,
      url: section.defaultUrl,
      icon: section.icon,
      matchPath: section.matchPath,
    })),
  ];

  return { chatItem, mobileDomains, sections };
}
