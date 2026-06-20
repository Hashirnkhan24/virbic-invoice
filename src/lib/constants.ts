export interface IndianState {
  code: string;
  name: string;
  gstCode: string;
}

export interface HsnCode {
  code: string;
  description: string;
  type: 'GOODS' | 'SERVICES';
  defaultGstRate: number;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: 'AN', name: 'Andaman and Nicobar Islands', gstCode: '35' },
  { code: 'AP', name: 'Andhra Pradesh', gstCode: '37' },
  { code: 'AR', name: 'Arunachal Pradesh', gstCode: '12' },
  { code: 'AS', name: 'Assam', gstCode: '18' },
  { code: 'BR', name: 'Bihar', gstCode: '10' },
  { code: 'CH', name: 'Chandigarh', gstCode: '04' },
  { code: 'CG', name: 'Chhattisgarh', gstCode: '22' },
  { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu', gstCode: '26' },
  { code: 'DL', name: 'Delhi', gstCode: '07' },
  { code: 'GA', name: 'Goa', gstCode: '30' },
  { code: 'GJ', name: 'Gujarat', gstCode: '24' },
  { code: 'HR', name: 'Haryana', gstCode: '06' },
  { code: 'HP', name: 'Himachal Pradesh', gstCode: '02' },
  { code: 'JK', name: 'Jammu and Kashmir', gstCode: '01' },
  { code: 'JH', name: 'Jharkhand', gstCode: '20' },
  { code: 'KA', name: 'Karnataka', gstCode: '29' },
  { code: 'KL', name: 'Kerala', gstCode: '32' },
  { code: 'LA', name: 'Ladakh', gstCode: '38' },
  { code: 'LD', name: 'Lakshadweep', gstCode: '31' },
  { code: 'MP', name: 'Madhya Pradesh', gstCode: '23' },
  { code: 'MH', name: 'Maharashtra', gstCode: '27' },
  { code: 'MN', name: 'Manipur', gstCode: '14' },
  { code: 'ML', name: 'Meghalaya', gstCode: '17' },
  { code: 'MZ', name: 'Mizoram', gstCode: '15' },
  { code: 'NL', name: 'Nagaland', gstCode: '13' },
  { code: 'OR', name: 'Odisha', gstCode: '21' },
  { code: 'PY', name: 'Puducherry', gstCode: '34' },
  { code: 'PB', name: 'Punjab', gstCode: '03' },
  { code: 'RJ', name: 'Rajasthan', gstCode: '08' },
  { code: 'SK', name: 'Sikkim', gstCode: '11' },
  { code: 'TN', name: 'Tamil Nadu', gstCode: '33' },
  { code: 'TS', name: 'Telangana', gstCode: '36' },
  { code: 'TR', name: 'Tripura', gstCode: '16' },
  { code: 'UP', name: 'Uttar Pradesh', gstCode: '09' },
  { code: 'UT', name: 'Uttarakhand', gstCode: '05' },
  { code: 'WB', name: 'West Bengal', gstCode: '19' },
];

export const HSN_SAC_CODES: HsnCode[] = [
  // Services (SAC Codes starting with 99)
  { code: '998311', description: 'Management and business consulting services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998313', description: 'Information technology (IT) design and development services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998314', description: 'IT infrastructure and network management services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998315', description: 'Hosting and IT infrastructure provisioning services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998316', description: 'Software consulting and support services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998413', description: 'Graphic design services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998211', description: 'Legal advisory and representation services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998221', description: 'Accounting, auditing, and bookkeeping services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998381', description: 'Advertising services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998382', description: 'Public relations services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998371', description: 'Scientific and technical consulting services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998431', description: 'Online content provisioning services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998511', description: 'Executive search and recruitment services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '997331', description: 'Licensing services for the right to use computer software', type: 'SERVICES', defaultGstRate: 18 },
  { code: '997111', description: 'Financial consultancy services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '997135', description: 'Portfolio management services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '995411', description: 'General construction services of residential buildings', type: 'SERVICES', defaultGstRate: 12 },
  { code: '995412', description: 'General construction services of non-residential buildings', type: 'SERVICES', defaultGstRate: 18 },
  { code: '999293', description: 'Commercial training and coaching services', type: 'SERVICES', defaultGstRate: 18 },
  { code: '998399', description: 'Other professional, technical, and business services', type: 'SERVICES', defaultGstRate: 18 },

  // Goods (HSN Codes)
  { code: '847130', description: 'Laptops, Notebooks, and Portable Computers', type: 'GOODS', defaultGstRate: 18 },
  { code: '851713', description: 'Smartphones and Mobile Phones', type: 'GOODS', defaultGstRate: 18 },
  { code: '852859', description: 'Computer Monitors and Display Screens', type: 'GOODS', defaultGstRate: 18 },
  { code: '847160', description: 'Keyboards, Mice, and Input Devices', type: 'GOODS', defaultGstRate: 18 },
  { code: '847170', description: 'Solid State Drives (SSDs) and Hard Disks (HDDs)', type: 'GOODS', defaultGstRate: 18 },
  { code: '851762', description: 'Network Routers, Switches, and Hubs', type: 'GOODS', defaultGstRate: 18 },
  { code: '850440', description: 'UPS systems, Inverters, and Static Converters', type: 'GOODS', defaultGstRate: 18 },
  { code: '851821', description: 'Single Speakers and Audio Equipment', type: 'GOODS', defaultGstRate: 18 },
  { code: '482010', description: 'Registers, Notebooks, and Accounting Books', type: 'GOODS', defaultGstRate: 18 },
  { code: '392610', description: 'Plastic Office Supplies and Stationery', type: 'GOODS', defaultGstRate: 18 },
  { code: '940310', description: 'Metal Office Furniture', type: 'GOODS', defaultGstRate: 18 },
  { code: '940330', description: 'Wooden Office Furniture', type: 'GOODS', defaultGstRate: 18 },
  { code: '850431', description: 'Electrical Transformers (less than 1 kVA)', type: 'GOODS', defaultGstRate: 18 },
  { code: '852351', description: 'USB Flash Drives and Memory Cards', type: 'GOODS', defaultGstRate: 18 },
  { code: '844332', description: 'Printers, Photocopying Machines, and Faxes', type: 'GOODS', defaultGstRate: 18 },
  { code: '900659', description: 'Webcams and Digital Cameras', type: 'GOODS', defaultGstRate: 18 },
  { code: '854442', description: 'USB Cables, HDMI Cables, and Connector Wires', type: 'GOODS', defaultGstRate: 18 },
  { code: '382499', description: 'Electronic Cleaning Kits and Consumables', type: 'GOODS', defaultGstRate: 18 },
  { code: '851830', description: 'Headphones, Earphones, and Microphones', type: 'GOODS', defaultGstRate: 18 },
  { code: '847330', description: 'PC Cabinets, Motherboards, and Cabinet Fans', type: 'GOODS', defaultGstRate: 18 },
  { code: '850760', description: 'Lithium-ion Batteries and Powerbanks', type: 'GOODS', defaultGstRate: 18 },
  { code: '490110', description: 'Printed Books, Brochures, and Leaflets', type: 'GOODS', defaultGstRate: 0 },
  { code: '480255', description: 'A4 Printing Paper (80 GSM)', type: 'GOODS', defaultGstRate: 12 },
  { code: '820559', description: 'Hand Tools and Office Cutters', type: 'GOODS', defaultGstRate: 18 },
  { code: '901720', description: 'Drawing Instruments and Geometry Boxes', type: 'GOODS', defaultGstRate: 12 },
  { code: '852589', description: 'CCTV Security Cameras', type: 'GOODS', defaultGstRate: 18 },
  { code: '940542', description: 'LED Desk Lamps and Lighting Fittings', type: 'GOODS', defaultGstRate: 18 },
  { code: '851679', description: 'Electric Coffee Makers and Kettles', type: 'GOODS', defaultGstRate: 18 },
  { code: '842139', description: 'Air Purifiers and Filters', type: 'GOODS', defaultGstRate: 18 },
  { code: '850980', description: 'Paper Shredder Machines', type: 'GOODS', defaultGstRate: 18 },
];

export const CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export const INVOICE_TEMPLATES = [
  'modern',
  'minimal',
  'professional',
  'creative',
  'dark',
  'classic',
  'gradient',
  'bold',
  'elegant',
  'startup',
] as const;

export type InvoiceTemplate = typeof INVOICE_TEMPLATES[number];

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const UNIT_OPTIONS = [
  'PCS',
  'HRS',
  'DAYS',
  'KG',
  'MTR',
  'LTR',
  'SET',
  'BOX',
] as const;
