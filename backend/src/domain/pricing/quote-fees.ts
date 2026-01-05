export interface QuoteFees {
  installationFee: number;
  integrationFee: number;
  logisticsCost: number;
  miscellaneousFee: number;
  taxAmount: number;
  total: number;
}

export interface QuoteFeeConfig {
  logisticsPerTripLagos: number;
  logisticsPerTripWestNear: number;
  logisticsPerTripOther: number;
  miscRate: number;
  taxRate: number;
}

// Temporary fee configuration. These numbers are placeholders so we
// can wire the flows end-to-end; they can be tuned later.
const INSTALLATION_FEE_PER_DEVICE = 15000; // per device installed
const INTEGRATION_RATE = 0.1; // 10% of devices subtotal
const LOGISTICS_PER_TRIP_LAGOS_DEFAULT = 50000; // Lagos round-trip
const LOGISTICS_PER_TRIP_WEST_NEAR_DEFAULT = 60000; // Osun, Ogun, Ibadan, etc.
const LOGISTICS_PER_TRIP_OTHER_DEFAULT = 100000; // other states round-trip
const RECOMMENDED_TRIPS = 4; // baseline number of trips
const MISC_RATE_DEFAULT = 0.05; // 5% miscellaneous buffer
const TAX_RATE_DEFAULT = 0.075; // 7.5% tax on subtotal + fees

export function computeQuoteFees(
  devicesSubtotal: number,
  totalDevices: number,
  locationHint?: string | null,
  roomsCount?: number | null,
  overrides?: QuoteFeeConfig | null,
): QuoteFees {
  if (!Number.isFinite(devicesSubtotal) || devicesSubtotal < 0) {
    devicesSubtotal = 0;
  }
  if (!Number.isFinite(totalDevices) || totalDevices < 0) {
    totalDevices = 0;
  }

  const logisticsPerTripLagos =
    overrides?.logisticsPerTripLagos ?? LOGISTICS_PER_TRIP_LAGOS_DEFAULT;
  const logisticsPerTripWestNear =
    overrides?.logisticsPerTripWestNear ?? LOGISTICS_PER_TRIP_WEST_NEAR_DEFAULT;
  const logisticsPerTripOther =
    overrides?.logisticsPerTripOther ?? LOGISTICS_PER_TRIP_OTHER_DEFAULT;

  let logisticsPerTrip = logisticsPerTripLagos;
  const addr = (locationHint ?? '').toLowerCase();

  if (!addr) {
    logisticsPerTrip = logisticsPerTripOther;
  } else if (addr.includes('lagos')) {
    logisticsPerTrip = logisticsPerTripLagos;
  } else if (
    ['osun', 'ogun', 'ibadan', 'oyo', 'ondo', 'ekiti', 'kwara'].some((k) =>
      addr.includes(k),
    )
  ) {
    logisticsPerTrip = logisticsPerTripWestNear;
  } else {
    logisticsPerTrip = logisticsPerTripOther;
  }

  // Trip count heuristic: default to recommended 4 trips, scale slightly
  // for very small or very large projects based on rooms.
  let trips = RECOMMENDED_TRIPS;
  if (typeof roomsCount === 'number' && Number.isFinite(roomsCount)) {
    if (roomsCount <= 3) {
      trips = 3;
    } else if (roomsCount >= 8 && roomsCount <= 12) {
      trips = 5;
    } else if (roomsCount > 12) {
      trips = 6;
    }
  }

  const installationFee = totalDevices * INSTALLATION_FEE_PER_DEVICE;
  const integrationFee = devicesSubtotal * INTEGRATION_RATE;
  const logisticsCost = logisticsPerTrip * trips;
  const miscRate = overrides?.miscRate ?? MISC_RATE_DEFAULT;
  const miscellaneousFee = devicesSubtotal * miscRate;

  const taxableBase =
    devicesSubtotal +
    installationFee +
    integrationFee +
    logisticsCost +
    miscellaneousFee;

  const taxRate = overrides?.taxRate ?? TAX_RATE_DEFAULT;
  const taxAmount = taxableBase * taxRate;
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
