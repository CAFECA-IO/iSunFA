export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Info: (20260501 - Luphia) 半徑設為 6371 km (地球平均半徑)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

export function splitAtAntimeridian(
  geometry: GeoJSON.Geometry | null | undefined,
): GeoJSON.Geometry | null {
  if (!geometry) return null;
  if (geometry.type === "GeometryCollection") return geometry;
  if (!("coordinates" in geometry) || !geometry.coordinates) return geometry;

  if (geometry.type === "LineString") {
    const coords = geometry.coordinates as number[][];
    const multiLines: number[][][] = [];
    let currentLine: number[][] = [];

    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i];
      if (i === 0) {
        currentLine.push([lng, lat]);
        continue;
      }

      const [prevLng, prevLat] = currentLine[currentLine.length - 1];

      if (lng - prevLng > 180) {
        const lngCont = lng - 360;
        const fraction =
          lngCont !== prevLng ? (-180 - prevLng) / (lngCont - prevLng) : 0.5;
        const latMid = prevLat + fraction * (lat - prevLat);

        currentLine.push([-180, latMid]);
        multiLines.push(currentLine);
        currentLine = [
          [180, latMid],
          [lng, lat],
        ];
      } else if (prevLng - lng > 180) {
        const lngCont = lng + 360;
        const fraction =
          lngCont !== prevLng ? (180 - prevLng) / (lngCont - prevLng) : 0.5;
        const latMid = prevLat + fraction * (lat - prevLat);

        currentLine.push([180, latMid]);
        multiLines.push(currentLine);
        currentLine = [
          [-180, latMid],
          [lng, lat],
        ];
      } else {
        currentLine.push([lng, lat]);
      }
    }

    if (currentLine.length > 0) {
      multiLines.push(currentLine);
    }

    if (multiLines.length > 1) {
      return {
        type: "MultiLineString",
        coordinates: multiLines,
      };
    } else {
      return {
        type: "LineString",
        coordinates: multiLines[0],
      };
    }
  }

  return geometry;
}
