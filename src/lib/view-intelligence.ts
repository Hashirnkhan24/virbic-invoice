import { prisma } from './prisma';

// Helper: detect device type from user agent
export function detectDeviceType(ua?: string | null): string {
  if (!ua) return 'unknown';
  const lowercaseUa = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(lowercaseUa)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(lowercaseUa)) return 'mobile';
  return 'desktop';
}

// Helper: detect browser from user agent
export function detectBrowser(ua?: string | null): string {
  if (!ua) return 'unknown';
  const lowercaseUa = ua.toLowerCase();
  if (/edg/i.test(lowercaseUa)) return 'Edge';
  if (/chrome|crios/i.test(lowercaseUa)) return 'Chrome';
  if (/safari/i.test(lowercaseUa) && !/chrome/i.test(lowercaseUa)) return 'Safari';
  if (/firefox|fxios/i.test(lowercaseUa)) return 'Firefox';
  return 'Other';
}

// Helper: hash IP for privacy (simple hash, not cryptographically secure but sufficient)
export function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return String(Math.abs(hash));
}

// Track view on load (fire-and-forget, non-blocking)
export async function trackInvoiceView(shareId: string, requestHeaders?: Headers) {
  try {
    const now = new Date();
    
    // Find the invoice first
    const invoice = await prisma.invoice.findUnique({
      where: { publicShareId: shareId },
      select: { id: true, status: true, viewCount: true }
    });
    
    if (!invoice) return;

    const userAgent = requestHeaders?.get('user-agent') || null;
    const deviceType = detectDeviceType(userAgent);
    const browser = detectBrowser(userAgent);
    
    const clientIp = requestHeaders?.get('x-forwarded-for') || requestHeaders?.get('x-real-ip') || '';
    const ipHash = clientIp ? hashIp(clientIp) : null;
    
    const country = requestHeaders?.get('x-vercel-ip-country') || null;
    const referrer = requestHeaders?.get('referer') || null;

    // Check if the current view event is unique in the last 1 hour for this IP hash
    let isUnique = true;
    if (ipHash) {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recentEvent = await prisma.invoiceViewEvent.findFirst({
        where: {
          shareLog: { invoiceId: invoice.id },
          ipHash,
          viewedAt: { gte: oneHourAgo }
        }
      });
      if (recentEvent) {
        isUnique = false;
      }
    }

    // Upsert the share log
    const log = await prisma.invoiceShareLog.upsert({
      where: { invoiceId: invoice.id },
      create: {
        shareId,
        invoiceId: invoice.id,
        viewCount: 1,
        firstViewedAt: now,
        lastViewedAt: now,
        uniqueViewerCount: isUnique ? 1 : 0,
        lastDeviceType: deviceType,
        lastBrowser: browser,
        lastCountry: country,
        viewedBeforePayment: invoice.status === 'PAID',
        viewsBeforePayment: invoice.status === 'PAID' ? 1 : 0
      },
      update: {
        viewCount: { increment: 1 },
        lastViewedAt: now,
        uniqueViewerCount: isUnique ? { increment: 1 } : undefined,
        lastDeviceType: deviceType,
        lastBrowser: browser,
        lastCountry: country
      }
    });

    // Create view event
    await prisma.invoiceViewEvent.create({
      data: {
        shareLogId: log.id,
        ipHash,
        deviceType,
        browser,
        country,
        referrer
      }
    });

    // Keep invoice viewCount in sync
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        viewCount: { increment: 1 }
      }
    }).catch(err => console.error('Failed to sync Invoice viewCount:', err));

  } catch (err) {
    // Silently fail view tracking to prevent breaking client view page
    console.error('[VIEW TRACKING ERROR]', err);
  }
}

// Generate structured view insights advice for detailed view
export async function getInvoiceViewIntelligence(invoiceId: string, userId: string) {
  try {
    const log = await prisma.invoiceShareLog.findUnique({
      where: { invoiceId },
      include: {
        viewEvents: {
          orderBy: { viewedAt: 'desc' },
          take: 50 // Limit to last 50 events for performance
        }
      }
    });

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true, amountPaid: true, grandTotal: true, dueDate: true }
    });

    if (!log) {
      return {
        viewCount: 0,
        firstViewedAt: null,
        lastViewedAt: null,
        lastDeviceType: null,
        lastBrowser: null,
        viewedBeforePayment: false,
        viewsBeforePayment: 0,
        insight: invoice && ['SENT', 'OVERDUE', 'PARTIAL'].includes(invoice.status) 
          ? 'Not viewed yet — consider sending a follow-up' 
          : 'Waiting for client to view',
        insightType: 'action' as const,
        viewEvents: []
      };
    }

    let insight = 'Invoice shared. Waiting for client activity.';
    let insightType: 'info' | 'warning' | 'action' = 'info';

    if (invoice) {
      const isPaid = invoice.status === 'PAID';
      const isOverdue = invoice.status === 'OVERDUE' || (['SENT', 'PARTIAL'].includes(invoice.status) && new Date(invoice.dueDate) < new Date());
      const hasViews = log.viewCount > 0;

      if (isPaid) {
        insight = log.viewedBeforePayment 
          ? `Viewed ${log.viewsBeforePayment} time(s) before payment` 
          : 'Payment recorded';
        insightType = 'info';
      } else if (isOverdue && log.viewCount >= 3) {
        insight = `Viewed ${log.viewCount} times but not paid — client may need a call`;
        insightType = 'action';
      } else if (!isPaid && hasViews && log.viewCount >= 2) {
        insight = `Viewed ${log.viewCount} time(s) — payment expected soon`;
        insightType = 'warning';
      } else if (!isPaid && !hasViews) {
        insight = 'Not viewed yet — consider sending a follow-up';
        insightType = 'action';
      } else if (!isPaid && log.viewCount === 1) {
        insight = 'Viewed once — waiting for payment';
        insightType = 'info';
      }
    }

    return {
      viewCount: log.viewCount,
      firstViewedAt: log.firstViewedAt ? log.firstViewedAt.toISOString() : null,
      lastViewedAt: log.lastViewedAt ? log.lastViewedAt.toISOString() : null,
      lastDeviceType: log.lastDeviceType,
      lastBrowser: log.lastBrowser,
      viewedBeforePayment: log.viewedBeforePayment,
      viewsBeforePayment: log.viewsBeforePayment,
      insight,
      insightType,
      viewEvents: log.viewEvents.map(e => ({
        id: e.id,
        viewedAt: e.viewedAt.toISOString(),
        deviceType: e.deviceType || 'unknown',
        browser: e.browser || 'unknown',
        country: e.country || 'unknown',
        referrer: e.referrer || 'direct'
      }))
    };
  } catch (err) {
    console.error('[GET VIEW INTELLIGENCE ERROR]', err);
    return null;
  }
}

// Get dashboard-level aggregate view analytics
export async function getViewAnalytics(userId: string, businessId?: string) {
  try {
    const isScoped = businessId && businessId !== 'all';
    
    const scopeFilter = isScoped 
      ? { invoice: { userId, businessId } } 
      : { invoice: { userId } };

    const scopeInvoiceFilter = isScoped 
      ? { userId, businessId } 
      : { userId };

    const [totalViewsAgg, viewedNotPaidCount, neverViewedCount, mostViewed] = await Promise.all([
      // Total views
      prisma.invoiceShareLog.aggregate({
        where: scopeFilter,
        _sum: { viewCount: true }
      }),
      // Viewed but unpaid (SENT/OVERDUE/PARTIAL)
      prisma.invoiceShareLog.count({
        where: {
          ...scopeFilter,
          invoice: {
            ...scopeInvoiceFilter,
            status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] }
          },
          viewCount: { gt: 0 }
        }
      }),
      // Never viewed (SENT/OVERDUE/PARTIAL)
      prisma.invoice.count({
        where: {
          ...scopeInvoiceFilter,
          status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] },
          publicShareId: { not: null },
          shareLog: null
        }
      }),
      // Most viewed invoice
      prisma.invoiceShareLog.findFirst({
        where: scopeFilter,
        orderBy: { viewCount: 'desc' },
        include: {
          invoice: {
            select: { id: true, invoiceNumber: true }
          }
        }
      })
    ]);

    return {
      totalViews: totalViewsAgg._sum.viewCount || 0,
      viewedNotPaidCount,
      neverViewedCount,
      mostViewedInvoice: mostViewed?.invoice ? {
        id: mostViewed.invoice.id,
        invoiceNumber: mostViewed.invoice.invoiceNumber,
        viewCount: mostViewed.viewCount
      } : null
    };
  } catch (err) {
    console.error('[GET VIEW ANALYTICS ERROR]', err);
    return {
      totalViews: 0,
      viewedNotPaidCount: 0,
      neverViewedCount: 0,
      mostViewedInvoice: null
    };
  }
}
