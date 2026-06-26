import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    // Upsert preference record to ensure it exists
    const preferences = await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        confirmationChannel: 'both',
        autoConfirmation: true,
        includeReceiptPdf: true,
      },
      update: {},
    });

    return NextResponse.json(preferences);
  } catch (error: any) {
    console.error('[SETTINGS PREFERENCES GET]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, dbUser } = await getAuthUser();
    if (error) return error;
    const user = dbUser!;

    const body = await request.json();
    const { 
      confirmationChannel, 
      autoConfirmation, 
      includeReceiptPdf,
      portalEnabledDefault,
      portalAutoCreate,
      portalPasswordDefault,
      portalUseBusinessBranding,
      portalBrandColorDefault,
      portalTitleDefault,
      portalShowPaidDefault,
      portalAllowPdfDefault,
      portalAllowPaymentDefault,
      portalShowHistoryDefault,
      upiAutoApproveEnabled,
      upiAutoApproveHours,
      whatsAppEnabled,
      whatsAppProvider,
      twilioAccountSid,
      twilioAuthToken,
      twilioWhatsAppNumber,
      metaAccessToken,
      metaPhoneNumberId
    } = body;

    if (confirmationChannel && !['whatsapp', 'email', 'both'].includes(confirmationChannel)) {
      return NextResponse.json({ error: 'Invalid confirmation channel' }, { status: 400 });
    }

    const updated = await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        confirmationChannel: confirmationChannel || 'both',
        autoConfirmation: autoConfirmation !== undefined ? autoConfirmation : true,
        includeReceiptPdf: includeReceiptPdf !== undefined ? includeReceiptPdf : true,
        portalEnabledDefault: portalEnabledDefault !== undefined ? portalEnabledDefault : true,
        portalAutoCreate: portalAutoCreate !== undefined ? portalAutoCreate : true,
        portalPasswordDefault: portalPasswordDefault || null,
        portalUseBusinessBranding: portalUseBusinessBranding !== undefined ? portalUseBusinessBranding : true,
        portalBrandColorDefault: portalBrandColorDefault || '#10b981',
        portalTitleDefault: portalTitleDefault || null,
        portalShowPaidDefault: portalShowPaidDefault !== undefined ? portalShowPaidDefault : true,
        portalAllowPdfDefault: portalAllowPdfDefault !== undefined ? portalAllowPdfDefault : true,
        portalAllowPaymentDefault: portalAllowPaymentDefault !== undefined ? portalAllowPaymentDefault : true,
        portalShowHistoryDefault: portalShowHistoryDefault !== undefined ? portalShowHistoryDefault : true,
        upiAutoApproveEnabled: upiAutoApproveEnabled !== undefined ? upiAutoApproveEnabled : false,
        upiAutoApproveHours: upiAutoApproveHours !== undefined ? parseInt(upiAutoApproveHours) : 72,
        whatsAppEnabled: whatsAppEnabled !== undefined ? whatsAppEnabled : false,
        whatsAppProvider: whatsAppProvider || 'meta',
        twilioAccountSid: twilioAccountSid || null,
        twilioAuthToken: twilioAuthToken || null,
        twilioWhatsAppNumber: twilioWhatsAppNumber || null,
        metaAccessToken: metaAccessToken || null,
        metaPhoneNumberId: metaPhoneNumberId || null,
      },
      update: {
        confirmationChannel: confirmationChannel !== undefined ? confirmationChannel : undefined,
        autoConfirmation: autoConfirmation !== undefined ? autoConfirmation : undefined,
        includeReceiptPdf: includeReceiptPdf !== undefined ? includeReceiptPdf : undefined,
        portalEnabledDefault: portalEnabledDefault !== undefined ? portalEnabledDefault : undefined,
        portalAutoCreate: portalAutoCreate !== undefined ? portalAutoCreate : undefined,
        portalPasswordDefault: portalPasswordDefault !== undefined ? portalPasswordDefault : undefined,
        portalUseBusinessBranding: portalUseBusinessBranding !== undefined ? portalUseBusinessBranding : undefined,
        portalBrandColorDefault: portalBrandColorDefault !== undefined ? portalBrandColorDefault : undefined,
        portalTitleDefault: portalTitleDefault !== undefined ? portalTitleDefault : undefined,
        portalShowPaidDefault: portalShowPaidDefault !== undefined ? portalShowPaidDefault : undefined,
        portalAllowPdfDefault: portalAllowPdfDefault !== undefined ? portalAllowPdfDefault : undefined,
        portalAllowPaymentDefault: portalAllowPaymentDefault !== undefined ? portalAllowPaymentDefault : undefined,
        portalShowHistoryDefault: portalShowHistoryDefault !== undefined ? portalShowHistoryDefault : undefined,
        upiAutoApproveEnabled: upiAutoApproveEnabled !== undefined ? upiAutoApproveEnabled : undefined,
        upiAutoApproveHours: upiAutoApproveHours !== undefined ? parseInt(upiAutoApproveHours) : undefined,
        whatsAppEnabled: whatsAppEnabled !== undefined ? whatsAppEnabled : undefined,
        whatsAppProvider: whatsAppProvider !== undefined ? whatsAppProvider : undefined,
        twilioAccountSid: twilioAccountSid !== undefined ? twilioAccountSid : undefined,
        twilioAuthToken: twilioAuthToken !== undefined ? twilioAuthToken : undefined,
        twilioWhatsAppNumber: twilioWhatsAppNumber !== undefined ? twilioWhatsAppNumber : undefined,
        metaAccessToken: metaAccessToken !== undefined ? metaAccessToken : undefined,
        metaPhoneNumberId: metaPhoneNumberId !== undefined ? metaPhoneNumberId : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[SETTINGS PREFERENCES PUT]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
