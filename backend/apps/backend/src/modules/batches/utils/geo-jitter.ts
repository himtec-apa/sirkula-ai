/**
 * Shifts coordinates by a random distance between minDistanceM (200m) and maxDistanceM (300m)
 * to protect donor privacy before a claim is officially locked.
 */
export function createObfuscatedLocation(
  latitude: number,
  longitude: number,
  minDistanceM = 200,
  maxDistanceM = 300
): { latitude: number; longitude: number } {
  const earthRadiusM = 6371000;
  const distance = minDistanceM + Math.random() * (maxDistanceM - minDistanceM);
  const angleRad = Math.random() * 2 * Math.PI;

  const deltaLatRad = (distance * Math.cos(angleRad)) / earthRadiusM;
  const deltaLonRad =
    (distance * Math.sin(angleRad)) /
    (earthRadiusM * Math.cos((latitude * Math.PI) / 180));

  const obfuscatedLat = latitude + (deltaLatRad * 180) / Math.PI;
  const obfuscatedLon = longitude + (deltaLonRad * 180) / Math.PI;

  return {
    latitude: Number(obfuscatedLat.toFixed(6)),
    longitude: Number(obfuscatedLon.toFixed(6)),
  };
}
