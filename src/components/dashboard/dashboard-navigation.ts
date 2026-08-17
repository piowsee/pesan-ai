export const dashboardPaths = {
  chat: '/dashboard/chat',
  business: '/dashboard/business',
  businessOverview: '/dashboard/business/overview',
  businessConnectApp: '/dashboard/business/connect-app',
  customer: '/dashboard/customer',
  customers: '/dashboard/customer/customers',
} as const;

export const PESAN_AI_DOCS_URL =
  'https://piowsee.github.io/pesan-ai/introduction.html';

export type DashboardDomainId = 'chat' | 'business' | 'customer';

export function isNavigationPathActive({
  exact = false,
  matchPath,
  pathname,
}: {
  exact?: boolean;
  matchPath: string;
  pathname: string;
}) {
  return (
    pathname === matchPath || (!exact && pathname.startsWith(`${matchPath}/`))
  );
}

export function isDashboardDomainActive(
  pathname: string,
  domain: DashboardDomainId,
) {
  const matchPath =
    domain === 'customer' ? dashboardPaths.customer : dashboardPaths[domain];

  return isNavigationPathActive({ matchPath, pathname });
}
