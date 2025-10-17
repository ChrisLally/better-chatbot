import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  await supabase.auth.getUser();

  // Example middleware logic - customize for your app:

  // 1. Redirect unauthenticated users to login:
  // if (!user && request.nextUrl.pathname.startsWith('/protected')) {
  //   return NextResponse.redirect(new URL('/login', request.url))
  // }

  // 2. Redirect authenticated users away from auth pages:
  // if (user && ['/login', '/signup'].includes(request.nextUrl.pathname)) {
  //   return NextResponse.redirect(new URL('/dashboard', request.url))
  // }

  // 3. Role-based access control:
  // if (request.nextUrl.pathname.startsWith('/admin')) {
  //   const { data: profile } = await supabase
  //     .from('profiles')
  //     .select('role')
  //     .eq('id', user?.id)
  //     .single()
  //
  //   if (profile?.role !== 'admin') {
  //     return NextResponse.redirect(new URL('/unauthorized', request.url))
  //   }
  // }

  // 4. Set user info in response headers:
  // if (user) {
  //   response.headers.set('x-user-id', user.id)
  //   response.headers.set('x-user-email', user.email || '')
  // }

  // IMPORTANT: You *must* return the response object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(response.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return response;
}
