import { Injectable } from '@nestjs/common';

type Tier = 'LAGOS' | 'WEST_NEAR' | 'OTHER';

const INSPECTION_BASE_FEE_NAIRA = 15000;
const LOGISTICS_PER_KM_NAIRA = 150;

@Injectable()
export class PricingService {
  private getBaseCoords() {
    const lat = Number(process.env.ORAN_BASE_LAT ?? '6.4698');
    const lng = Number(process.env.ORAN_BASE_LNG ?? '3.5852');
    return { lat, lng };
  }

  private toTier(distanceKm: number): { tier: Tier; logisticsEstimate: number } {
    if (distanceKm <= 40) return { tier: 'LAGOS', logisticsEstimate: 50000 };
    if (distanceKm <= 150) return { tier: 'WEST_NEAR', logisticsEstimate: 60000 };
    return { tier: 'OTHER', logisticsEstimate: 100000 };
  }

  private haversineKm(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(destination.lat - origin.lat);
    const dLng = toRad(destination.lng - origin.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(origin.lat)) *
        Math.cos(toRad(destination.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }

  async addressSuggestions(input: string) {
    const query = (input ?? '').trim();
    if (query.length < 3) {
      return { items: [] as string[] };
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return { items: [] as string[] };
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query,
    )}&components=country:ng&key=${encodeURIComponent(apiKey)}`;

    try {
      const res = await fetch(url);
      const data: any = await res.json();
      const items = Array.isArray(data?.predictions)
        ? data.predictions
            .map((p: any) => p?.description)
            .filter((v: any) => typeof v === 'string')
            .slice(0, 8)
        : [];
      return { items };
    } catch {
      return { items: [] as string[] };
    }
  }

  async estimateSite(address: string) {
    const cleanedAddress = (address ?? '').trim();
    if (!cleanedAddress) {
      return {
        resolvedAddress: null,
        distanceKm: null,
        tier: null,
        logisticsEstimate: null,
        inspectionEstimate: null,
        warning: 'Address is required.',
      };
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return {
        resolvedAddress: cleanedAddress,
        distanceKm: null,
        tier: null,
        logisticsEstimate: null,
        inspectionEstimate: null,
        warning: 'GOOGLE_MAPS_API_KEY is not set.',
      };
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      cleanedAddress,
    )}&key=${encodeURIComponent(apiKey)}`;

    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData: any = await geocodeRes.json();
    const first = geocodeData?.results?.[0];

    if (!first?.geometry?.location) {
      return {
        resolvedAddress: cleanedAddress,
        distanceKm: null,
        tier: null,
        logisticsEstimate: null,
        inspectionEstimate: null,
        warning: geocodeData?.error_message || 'Unable to geocode address.',
      };
    }

    const resolvedAddress = first.formatted_address as string;
    const destination = `${first.geometry.location.lat},${first.geometry.location.lng}`;
    const originCoords = this.getBaseCoords();
    const origin = `${originCoords.lat},${originCoords.lng}`;

    const matrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      origin,
    )}&destinations=${encodeURIComponent(destination)}&units=metric&key=${encodeURIComponent(
      apiKey,
    )}`;

    const matrixRes = await fetch(matrixUrl);
    const matrixData: any = await matrixRes.json();
    const element = matrixData?.rows?.[0]?.elements?.[0];
    const meters = Number(element?.distance?.value ?? 0);

    if (!meters || element?.status !== 'OK') {
      const distanceKm = this.haversineKm(originCoords, {
        lat: Number(first.geometry.location.lat),
        lng: Number(first.geometry.location.lng),
      });
      const { tier } = this.toTier(distanceKm);
      const logisticsEstimate = Math.round(distanceKm * LOGISTICS_PER_KM_NAIRA);
      const inspectionEstimate = INSPECTION_BASE_FEE_NAIRA + logisticsEstimate;

      return {
        resolvedAddress,
        distanceKm,
        tier,
        logisticsEstimate,
        inspectionEstimate,
        warning:
          matrixData?.error_message ||
          'Driving distance unavailable; estimate currently uses straight-line distance.',
      };
    }

    const distanceKm = Number((meters / 1000).toFixed(1));
    const { tier } = this.toTier(distanceKm);
    const logisticsEstimate = Math.round(distanceKm * LOGISTICS_PER_KM_NAIRA);
    const inspectionEstimate = INSPECTION_BASE_FEE_NAIRA + logisticsEstimate;

    return {
      resolvedAddress,
      distanceKm,
      tier,
      logisticsEstimate,
      inspectionEstimate,
    };
  }
}
