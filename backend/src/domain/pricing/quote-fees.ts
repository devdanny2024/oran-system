export interface QuoteFees {
  installationFee: number;
  integrationFee: number;
  logisticsCost: number;
  miscellaneousFee: number;
  taxAmount: number;
  total: number;
}

// Temporary fee configuration. These numbers are placeholders so we
// can wire the flows end-to-end; they can be tuned later.
const INSTALLATION_FEE_PER_DEVICE = 15000; // per device installed
const INTEGRATION_RATE = 0.1; // 10% of devices subtotal
const LOGISTICS_BASE_LAGOS = 50000; // Lagos base logistics
const LOGISTICS_BASE_WEST_NEAR = 60000; // e.g. Osun, Ogun, Ibadan etc.
const LOGISTICS_BASE_OTHER = 100000; // minimum for other states
const LOGISTICS_PER_DEVICE = 5000; // additional logistics per device
const MISC_RATE = 0.05; // 5% miscellaneous buffer
const TAX_RATE = 0.075; // 7.5% tax on subtotal + fees

export function computeQuoteFees(
  devicesSubtotal: number,
  totalDevices: number,
  locationHint?: string | null,
): QuoteFees {
  if (!Number.isFinite(devicesSubtotal) || devicesSubtotal < 0) {
    devicesSubtotal = 0;
  }
  if (!Number.isFinite(totalDevices) || totalDevices < 0) {
    totalDevices = 0;
  }

  let logisticsBase = LOGISTICS_BASE_LAGOS;
  const addr = (locationHint ?? '').toLowerCase();

  if (!addr) {
    logisticsBase = LOGISTICS_BASE_OTHER;
  } else if (addr.includes('lagos')) {
    logisticsBase = LOGISTICS_BASE_LAGOS;
  } else if (
    ['osun', 'ogun', 'ibadan', 'oyo', 'ondo', 'ekiti', 'kwara'].some((k) =>
      addr.includes(k),
    )
  ) {
    logisticsBase = LOGISTICS_BASE_WEST_NEAR;
  } else {
    logisticsBase = LOGISTICS_BASE_OTHER;
  }

  const installationFee = totalDevices * INSTALLATION_FEE_PER_DEVICE;
  const integrationFee = devicesSubtotal * INTEGRATION_RATE;
  const logisticsCost =
    logisticsBase + totalDevices * LOGISTICS_PER_DEVICE;
  const miscellaneousFee = devicesSubtotal * MISC_RATE;

  const taxableBase =
    devicesSubtotal +
    installationFee +
    integrationFee +
    logisticsCost +
    miscellaneousFee;

  const taxAmount = taxableBase * TAX_RATE;
  const total = taxableBase + taxAmount;

  return {
    installationFee,
    integrationFee,
    logisticsCost,
    miscellaneousFee,
    taxAmount,
    total,
  };
}
