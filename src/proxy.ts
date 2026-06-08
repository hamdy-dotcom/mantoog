import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
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

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/admin'],
}
