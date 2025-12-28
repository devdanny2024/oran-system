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
const LOGISTICS_PER_TRIP_LAGOS = 50000; // Lagos round-trip
const LOGISTICS_PER_TRIP_WEST_NEAR = 60000; // Osun, Ogun, Ibadan, etc.
const LOGISTICS_PER_TRIP_OTHER = 100000; // other states round-trip
const RECOMMENDED_TRIPS = 4; // baseline number of trips
const MISC_RATE = 0.05; // 5% miscellaneous buffer
const TAX_RATE = 0.075; // 7.5% tax on subtotal + fees

export function computeQuoteFees(
  devicesSubtotal: number,
  totalDevices: number,
  locationHint?: string | null,
  roomsCount?: number | null,
): QuoteFees {
  if (!Number.isFinite(devicesSubtotal) || devicesSubtotal < 0) {
    devicesSubtotal = 0;
  }
  if (!Number.isFinite(totalDevices) || totalDevices < 0) {
    totalDevices = 0;
  }

  let logisticsPerTrip = LOGISTICS_PER_TRIP_LAGOS;
  const addr = (locationHint ?? '').toLowerCase();

  if (!addr) {
    logisticsPerTrip = LOGISTICS_PER_TRIP_OTHER;
  } else if (addr.includes('lagos')) {
    logisticsPerTrip = LOGISTICS_PER_TRIP_LAGOS;
  } else if (
    ['osun', 'ogun', 'ibadan', 'oyo', 'ondo', 'ekiti', 'kwara'].some((k) =>
      addr.includes(k),
    )
  ) {
    logisticsPerTrip = LOGISTICS_PER_TRIP_WEST_NEAR;
  } else {
    logisticsPerTrip = LOGISTICS_PER_TRIP_OTHER;
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
