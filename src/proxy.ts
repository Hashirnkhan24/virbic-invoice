import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',                    // Landing page
  '/sign-in(.*)',         // Sign-in pages
  '/sign-up(.*)',         // Sign-up pages
  '/i/(.*)',              // Public invoice share links
  '/api/invoices/share/(.*)', // Public invoice share API
  '/api/webhooks/(.*)',   // Clerk webhooks (must be public)
  '/api/cron/(.*)',       // Cron jobs (use their own CRON_SECRET)
  '/api/whatsapp/webhook(.*)', // WhatsApp webhook (must be public)
]);

const proxyHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export { proxyHandler as proxy };
export default proxyHandler;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
