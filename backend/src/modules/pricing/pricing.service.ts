import { Injectable } from '@nestjs/common';

type Tier = 'LAGOS' | 'WEST_NEAR' | 'OTHER';

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
      return {
        resolvedAddress,
        distanceKm: null,
        tier: null,
        logisticsEstimate: null,
        inspectionEstimate: null,
        warning: matrixData?.error_message || 'Unable to compute driving distance.',
      };
    }

    const distanceKm = Number((meters / 1000).toFixed(1));
    const { tier, logisticsEstimate } = this.toTier(distanceKm);
    const inspectionEstimate = Math.round(logisticsEstimate * 0.35);

    return {
      resolvedAddress,
      distanceKm,
      tier,
      logisticsEstimate,
      inspectionEstimate,
    };
  }
}
