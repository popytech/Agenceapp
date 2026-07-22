import { NextRequest, NextResponse } from 'next/server'

// Le middleware laisse tout passer — la protection auth est gérée côté client
// dans DashboardLayout (src/app/dashboard/layout.tsx) via useAuth()
// Cela évite les problèmes de session localStorage non accessible en SSR/Edge

export function middleware(request: NextRequest) {
  // Passer toutes les requêtes sans interférence
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
