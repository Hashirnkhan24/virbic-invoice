import { prisma } from './prisma';

export function generatePortalSlug(clientName: string): string {
  // Convert to URL-friendly slug
  const base = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  
  return base;
}

export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (await prisma.clientPortal.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// Auto-create portal on client creation
export async function autoCreatePortal(clientId: string, userId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  });
  
  if (!client) return null;
  
  // Fetch default business for user branding
  const business = await prisma.business.findFirst({
    where: { userId, isDefault: true }
  }) || await prisma.business.findFirst({
    where: { userId }
  });
  
  // Check if portal already exists
  const existingPortal = await prisma.clientPortal.findUnique({
    where: { clientId },
  });
  if (existingPortal) return existingPortal;

  // Retrieve user portal preferences if they exist
  const preferences = await prisma.userPreference.findUnique({
    where: { userId },
  });

  const baseSlug = generatePortalSlug(client.name);
  const slug = await ensureUniqueSlug(baseSlug);
  
  return prisma.clientPortal.create({
    data: {
      clientId,
      userId,
      slug,
      enabled: preferences ? preferences.portalEnabledDefault : true,
      brandColor: preferences ? preferences.portalBrandColorDefault : (business?.brandColor || '#10b981'),
      logoUrl: preferences?.portalUseBusinessBranding ? (business?.logo || null) : null,
      title: preferences?.portalTitleDefault || `${business?.name || 'Client'} Portal`,
      showPaidInvoices: preferences ? preferences.portalShowPaidDefault : true,
      allowPdfDownload: preferences ? preferences.portalAllowPdfDefault : true,
      allowPayment: preferences ? preferences.portalAllowPaymentDefault : true,
      showPaymentHistory: preferences ? preferences.portalShowHistoryDefault : true,
    },
  });
}
