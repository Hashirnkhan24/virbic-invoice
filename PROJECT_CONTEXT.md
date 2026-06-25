# BillCraft Invoicing & Payment Operations: Project Context & Architecture

This document serves as the absolute source of truth and technical blueprint for **BillCraft** (under the Virbic product suite), a professional, self-hosted invoicing and zero-fee payment collection platform designed for Indian freelancers, consultants, and SMBs.

---

## 1. Executive Summary & Core Value Proposition

BillCraft provides a self-managed alternative to high-fee payment processors (like Razorpay payment links, PayPal, or Stripe) for collecting professional payments. It combines:
1. **GST-compliant Invoicing** with professional styling, brand color themes, and pdf exporting.
2. **Zero-Fee UPI Collections** via dynamic peer-to-peer (P2P) bank-to-bank QR codes and mobile app launchers.
3. **Automated Verification Lifecycle** where client-submitted proof (UTR + screenshot) is reconciled in a freelancer payments inbox or auto-approved after a custom delay.
4. **Engagement & View Tracking** to alert freelancers whether their clients have viewed the invoice, enabling smarter reminder triggers.

---

## 2. Technical Stack & Dependencies

* **Framework**: Next.js 16 (App Router) with Turbopack for compilation and proxy middleware.
* **Database & ORM**: Prisma ORM, PostgreSQL (hosted on Supabase using pgpooler connection pooling).
* **Authentication**: Clerk Auth (synced to the local PostgreSQL database via backend Clerk Webhooks).
* **Styling**: Tailwind CSS & Vanilla CSS custom design tokens (supporting modern aesthetics, glassmorphism, and dark modes).
* **Charting & Visuals**: Recharts (interactive dashboards and engagement trends), Framer Motion (animated sidebars/drawers).
* **PDF Engine**: `@react-pdf/renderer` (server/client PDF generation) and browser-based `jspdf`/`html2canvas`.
* **Icons**: `lucide-react`.

---

## 3. Directory Structure

```
virbic-invoice/
├── prisma/
│   └── schema.prisma         # Postgres database schema definition
├── public/
│   ├── uploads/
│   │   └── proofs/           # Local file storage for client payment screenshot proofs
│   └── virbic-logo.svg       # Corporate assets
├── src/
│   ├── app/                  # Next.js App Router folders
│   │   ├── (dashboard)/      # Authenticated dashboard views (Dashboard, Invoices, Clients, Payments, Reports, Settings)
│   │   ├── api/              # Backend serverless API routes
│   │   │   ├── cron/         # Scheduled automation cron jobs (auto-approvals, reminders, recurring invoices)
│   │   │   ├── dashboard/    # Analytics data endpoints
│   │   │   ├── invoices/     # CRUD, payments, PDF, dynamic QR endpoints
│   │   │   ├── payments/     # Verification inbox endpoints
│   │   │   └── webhooks/     # Webhooks (Clerk identity, Razorpay fallback gateway)
│   │   └── i/                # Publicly shared invoice client portal routes
│   │       └── [shareId]/    # Interactive public invoice and dynamic checkout portal
│   ├── components/           # Reusable client/server UI components
│   │   ├── dashboard/        # Dashboard layout, engagement, and metrics cards
│   │   ├── invoices/         # Invoices detail panel, actions, reminders dialogs
│   │   ├── layout/           # Shared Sidebar and Header components
│   │   └── payments/         # Payments verification dashboard widgets
│   ├── lib/                  # Backend modules and utility scripts
│   │   ├── auth.ts           # Clerk-to-local db user authorization mapping
│   │   ├── helpers.ts        # Currency formats, dates, calculations
│   │   ├── payment-engine.ts # Invoice payment reconciliation engine
│   │   ├── reminder-engine.ts# Smart reminder escalation logic
│   │   └── view-intelligence.ts # Client view tracking, IP hashing, device/browser analytics
```

---

## 4. Database Schema & Data Models

The database models defined in `prisma/schema.prisma` represent the system:

```prisma
// Core Client Identity
model User {
  id                      String           @id @default(cuid())
  clerkId                 String           @unique
  email                   String           @unique
  name                    String?
  avatar                  String?
  // User settings, notification preferences, custom reminders template fields...
}

// Business Entity (Freelancer / Company profiles)
model Business {
  id                      String           @id @default(cuid())
  userId                  String
  name                    String
  gstin                   String?          // 15-character Indian tax ID
  pan                     String?          // 10-character PAN card
  address, city, state, pincode, phone, email
  bankName, accountNumber, ifscCode, upiId // Core UPI configuration for payment generation
  brandColor              String           @default("#10b981")
  invoicePrefix           String           @default("INV")
  invoiceNumber           Int              @default(1)
  financialYear           String           // E.g., "2026-27"
  isDefault               Boolean          @default(false)
}

// Client Registry (B2B / B2C Customers)
model Client {
  id                      String           @id @default(cuid())
  userId                  String
  name, email, phone, billingAddress, shippingAddress
  totalBilled             Decimal          @default(0.00) // Cumulative PAID total
  totalOutstanding        Decimal          @default(0.00) // Sum of SENT+PARTIAL+OVERDUE
}

// Invoices
model Invoice {
  id                      String           @id @default(cuid())
  invoiceNumber           String           // e.g. INV/2026-27/005
  userId, businessId, clientId
  issueDate, dueDate
  status                  InvoiceStatus    @default(DRAFT) // DRAFT, SENT, PAID, OVERDUE, CANCELLED, PARTIAL
  subTotal, discountTotal, taxableAmount, cgstTotal, sgstTotal, igstTotal, grandTotal
  publicShareId           String?          @unique // Shared public view hash
  sharePassword           String?          // Optional password protection
  viewCount               Int              @default(0)
  amountPaid              Decimal          @default(0.00)
  paidAt                  DateTime?
}

// Dynamic View Tracking
model InvoiceShareLog {
  id                      String           @id @default(cuid())
  shareId                 String           @unique
  invoiceId               String           @unique
  viewCount               Int              @default(0)
  firstViewedAt           DateTime?
  lastViewedAt            DateTime?
  uniqueViewerCount       Int              @default(0)
  viewedBeforePayment     Boolean          @default(false)
  viewsBeforePayment      Int              @default(0)
  lastDeviceType, lastBrowser, lastCountry
  viewEvents              InvoiceViewEvent[]
}

model InvoiceViewEvent {
  id                      String           @id @default(cuid())
  shareLogId              String
  viewedAt                DateTime         @default(now())
  ipHash                  String?          // Privacy-compliant MD5-alternative integer string
  deviceType, browser, country, referrer
}

// Payment Collections & Verification
model PaymentProof {
  id                      String           @id @default(cuid())
  invoiceId               String
  userId                  String
  utr                     String?          // 12-digit UPI UTR Number
  screenshotUrl           String?          // Path inside public/uploads/proofs/
  amountPaid              Decimal
  status                  ProofStatus      @default(PENDING) // PENDING, APPROVED, REJECTED, AUTO_APPROVED
  submittedAt, verifiedAt, autoApproveAt, autoApproved
}

model Payment {
  id                      String           @id @default(cuid())
  invoiceId               String
  amount                  Decimal
  method                  PaymentMethod    @default(UPI)
  reference               String?          // Reconciled UTR
  status                  PaymentStatus    @default(CONFIRMED)
  paidAt                  DateTime
}
```

---

## 5. Core Workflows & Business Logic (Under the Hood)

### A. The GST Tax Resolution Matrix
Indian tax calculation requires resolving whether a transaction is **Intrastate** (within the same state) or **Interstate** (between different states).
* **The Check**: When an invoice is created, the system compares the freelancer's `Business.state` (Place of Supply) with the `Client.billingState`.
* **Intrastate (Same State)**: 
  * Apply **CGST** = $\text{gstRate} / 2$
  * Apply **SGST** = $\text{gstRate} / 2$
* **Interstate (Different State)**:
  * Apply **IGST** = $\text{gstRate}$
* **Calculation**:
  $$\text{Taxable Value} = \text{Base Price} - \text{Discount}$$
  $$\text{GST Amount} = \text{Taxable Value} \times \text{Resolved GST Rate}$$
  $$\text{Grand Total} = \text{Taxable Value} + \text{CGST} + \text{SGST} + \text{IGST} + \text{Round Off}$$

### B. Zero-Fee Dynamic UPI Payment Lifecycle
Rather than routing payments through a third-party gateway escrow that extracts a 2% fee, BillCraft uses a secure bank-to-bank dynamic UPI deep-linking structure:

```mermaid
sequenceDiagram
    participant Client as Client Browser
    participant App as Next.js API
    participant Bank as UPI Network (GPay/PhonePe)
    participant Freelancer as Payments Inbox

    Client->>App: Opens invoice public link (/i/[shareId])
    App-->>Client: Renders scannable QR / Mobile "Pay Now" intent link
    Client->>Bank: Scans QR / Taps pay link (Funds move directly to Freelancer bank)
    Client->>Client: Enters 12-digit UTR & Uploads Screenshot
    Client->>App: Submits PaymentProof (/api/invoices/[id]/payment-proof)
    App-->>Client: Returns Watermarked Provisional Receipt (Awaiting clearance)
    App->>Freelancer: Places proof in Verification Inbox & sends Email Alert
    Freelancer->>App: Reviews proof and clicks [Approve]
    App->>App: Updates Invoice to PAID, records Payment ledger
    App-->>Client: Emails clean, un-watermarked Final Receipt
```

* **Dynamic UPI URI Format**:
  `upi://pay?pa={upiId}&pn={payeeName}&am={balance}&tn={invoiceRef}&cu=INR`
  * `pa`: Freelancer's configured UPI address (e.g. `merchant@okaxis`).
  * `am`: Calculated remaining balance on the invoice.
  * `tn`: Invoice identifier note (e.g. `INV-2026-27-005`) used for audit reconciliation.
* **Provisional Receipt**: Prevents friction between client accounts departments and freelancers. Once a client submits their UTR, they can download a printable PDF containing a prominent **"PROVISIONAL - AWAITING MERCHANT CLEARANCE"** watermark.
* **Auto-Approval System**: A cron job `/api/cron/auto-approve` checks user preference durations (e.g., auto-approve after 72 hours). If the freelancer does not manually reject a proof in their inbox within this window, the system automatically marks the invoice as Paid to prevent client receipts from getting stuck.

### C. Public View Tracking & Engagement Analytics
To solve the common problem of clients saying "I didn't receive your invoice," BillCraft tracks engagement silently.

* **Tracking Middleware**: Inside `src/app/i/[shareId]/page.tsx`, loading the page triggers an asynchronous, non-blocking `trackInvoiceView` promise. Because this is dynamic and fire-and-forget, a database delay will never block the client from loading their invoice.
* **Client IP Anonymization**: IP addresses are not stored in raw text. They are converted to a hash string via:
  ```javascript
  function hashIp(ip) {
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = ((hash << 5) - hash) + ip.charCodeAt(i);
      hash = hash & hash;
    }
    return String(Math.abs(hash));
  }
  ```
  If a new view event arrives with the same `ipHash` within 1 hour, it increments `viewCount` but does *not* increment `uniqueViewerCount` (preventing refresh-spamming from polluting metrics).
* **Early Escalation Rules**: The automated reminder cron `/api/api/cron/reminders` fetches view counts. If an invoice has been viewed but remains unpaid, the system automatically reduces the escalation schedule by **1 day**, sending payment reminder emails earlier under the assumption that the client is actively sitting on the invoice.

---

## 6. Main Feature Inventory & User Interfaces

### 1. Main Dashboard (`/dashboard`)
* **KPI Metrics**: Monthly billing total, monthly collected revenue, total outstanding, and average payment collection delays (days).
* **Visual Trends**: Line + Bar composed monthly charts tracking billed vs. collected figures.
* **Outstanding Ledger**: Fast glance list of top outstanding invoices with quick trigger `[Remind]` buttons.
* **Engagement Insights Widget**: Tracks total invoice views, viewed & unpaid count (amber), never viewed count (red), and links to the most viewed invoice.

### 2. Invoices Registry & Detail Screen (`/invoices` & `/invoices/[id]`)
* **Invoice Editor**: Dynamic invoice generator supporting itemized catalog search, instant tax breakdown preview, custom fields, and signature attachment.
* **Templates**: Toggle styles dynamically:
  * *Modern*: Sleek design with highlighted emerald/custom brand headers.
  * *Minimal*: High contrast, clean, borderless typography.
  * *Professional*: Double-border classic corporate layout.
  * *Creative*: Vibrant accent blocks.
  * *Dark*: Sleek high-tech dark theme.
* **View Intelligence Card (Sidebar)**: Displays view stats, last viewed timestamp, client device type, and warning advice (e.g., *"Client viewed 4 times without paying — call recommended"*).
* **Detailed Analytics Modal**: Area charts of views over 30 days and tabular logs of browser, location, referrer, and timestamps for every single hit.

### 3. Payments Verification Inbox (`/payments`)
* **Action Center**: Central dashboard displaying pending verification cards.
* **Audit tools**: Expandable invoice details, raw UTR numbers, and a click-to-expand image modal for uploaded payment screenshots.
* **Reconciliation actions**: Approve (triggers payment record & final receipt) or Reject (prompts warning email to client).

### 4. Client Registry & Client Portals (`/clients` & `/portal/[slug]`)
* **Profile Management**: Stores shipping/billing data and displays cumulative lifetime-billed statistics.
* **Portals**: Each client gets a secure, private dashboard slug (e.g. `/portal/acme-corp`) showing their billing history, unpaid balances, paid invoices ledger, and PDF download buttons.

---

## 7. Developer Operations & Environment Setup

### Necessary Environment Variables (`.env`)
```bash
# Database Connections
DATABASE_URL="postgresql://postgres:password@host:5432/postgres?pgbouncer=true"

# Clerk Identity Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
CLERK_WEBHOOK_SECRET="whsec_..."

# Email Configurations (mocked fallback if empty)
RESEND_API_KEY="re_..."
EMAIL_FROM="invoices@yourdomain.com"

# Cron Authentication
CRON_SECRET="virbic-cron-secret-123"

# Application Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Commands Reference
* **Synchronize database schema changes**:
  `npx prisma db push`
* **Generate updated Prisma client types**:
  `npx prisma generate`
* **Open Prisma graphical db manager**:
  `npx prisma studio`
* **Run local developer server**:
  `npm run dev`
* **Compile production build**:
  `npm run build`
