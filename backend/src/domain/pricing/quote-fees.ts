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
const LOGISTICS_BASE_FEE = 50000; // flat logistics component
const LOGISTICS_PER_DEVICE = 5000; // additional logistics per device
const MISC_RATE = 0.05; // 5% miscellaneous buffer
const TAX_RATE = 0.075; // 7.5% tax on subtotal + fees

export function computeQuoteFees(
  devicesSubtotal: number,
  totalDevices: number,
): QuoteFees {
  if (!Number.isFinite(devicesSubtotal) || devicesSubtotal < 0) {
    devicesSubtotal = 0;
  }
  if (!Number.isFinite(totalDevices) || totalDevices < 0) {
    totalDevices = 0;
  }

  const installationFee = totalDevices * INSTALLATION_FEE_PER_DEVICE;
  const integrationFee = devicesSubtotal * INTEGRATION_RATE;
  const logisticsCost =
    LOGISTICS_BASE_FEE + totalDevices * LOGISTICS_PER_DEVICE;
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

