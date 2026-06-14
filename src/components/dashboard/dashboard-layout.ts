/** Shared main-area classes for dashboard pages (offsets fixed mobile header + bottom nav). */
export const DASHBOARD_MAIN_CLASS =
  'flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-x-hidden overflow-y-auto ' +
  'pt-[calc(var(--dashboard-mobile-header-height)+env(safe-area-inset-top,0px))] md:pt-0 ' +
  'pb-[calc(var(--dashboard-mobile-bottom-nav-height)+env(safe-area-inset-bottom,0px))] md:pb-8'
