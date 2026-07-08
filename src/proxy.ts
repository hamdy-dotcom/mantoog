import { NextRequest, NextResponse } from 'next/server'

// Root domain the app is served from in production. Store subdomains are
// resolved as `<slug>.<ROOT_DOMAIN>`. Override per-environment via env
// (e.g. NEXT_PUBLIC_ROOT_DOMAIN=devmantoog.com on staging).
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'mantoog.com'

/** Extract the store slug from the request host, or '' for apex/www/unknown. */
function getSubdomain(host: string): string {
  const hostname = host.split(':')[0]
  // Local dev: any `<slug>.localhost` resolves to 127.0.0.1 in browsers.
  if (hostname.endsWith('.localhost')) {
    return hostname.slice(0, -'.localhost'.length)
  }
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return hostname.slice(0, -(ROOT_DOMAIN.length + 1))
  }
  return ''
}

/** Rewrite store-subdomain requests onto the app/[storeSlug] routes. */
function handleStoreSubdomain(request: NextRequest, sub: string) {
  const { pathname, search } = request.nextUrl

  // API routes, Next internals, and product feeds must hit their real handlers.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/feed')
  ) {
    return NextResponse.next()
  }

  // Storefront root → the store's page under app/[storeSlug].
  if (pathname === '/') {
    return NextResponse.rewrite(new URL(`/${sub}`, request.url))
  }

  // Product landing → app/[storeSlug]/[productSlug].
  if (pathname.startsWith('/product/')) {
    const id = pathname.slice('/product/'.length)
    return NextResponse.rewrite(new URL(`/${sub}/${id}${search}`, request.url))
  }

  // Any other store-scoped path.
  return NextResponse.rewrite(new URL(`/${sub}${pathname}${search}`, request.url))
}

export async function proxy(request: NextRequest) {
  // Behind EB's nginx/ALB the real host arrives as x-forwarded-host.
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const sub = getSubdomain(host)

  // Store subdomain → rewrite onto the public store routes (no auth needed).
  if (sub && sub !== 'www') {
    return handleStoreSubdomain(request, sub)
  }

  // Apex/www host → existing auth protection for dashboard/admin.
  const { pathname } = request.nextUrl

  // Admin login page — always accessible
  if (pathname === '/admin/login') return NextResponse.next()

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const cookies = request.cookies.getAll()
    const hasAuthCookie = cookies.some(c =>
      c.name.includes('auth-token') || c.name.includes('sb-')
    )
    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const cookies = request.cookies.getAll()
    const hasAuthCookie = cookies.some(c =>
      c.name.includes('auth-token') || c.name.includes('sb-')
    )
    if (!hasAuthCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

// Run on everything except static assets so subdomain rewrites apply to the
// storefront and product pages, while auth checks stay scoped by pathname above.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
