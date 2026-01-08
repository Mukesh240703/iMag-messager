import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/auth';

export async function middleware(request: NextRequest) {
    // Check for session cookie
    const session = request.cookies.get('session');

    // Protect /chat, /calls, /calendar
    if (
        request.nextUrl.pathname.startsWith('/chat') ||
        request.nextUrl.pathname.startsWith('/calls') ||
        request.nextUrl.pathname.startsWith('/calendar')
    ) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        return await updateSession(request);
    }

    // Redirect /login or /signup to /chat if already logged in
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') {
        if (session) {
            return NextResponse.redirect(new URL('/chat', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/chat/:path*', '/calls/:path*', '/calendar/:path*', '/login', '/signup'],
};
