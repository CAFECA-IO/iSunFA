"use client";

import React, { useRef, useEffect, useId } from "react";
import Map, { Source, Layer, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature, Geometry } from "geojson";

export interface IMapViewerProps {
  // Info: (20260430 - Tzuhan) 支援多式聯運的 FeatureCollection 或是單一軌跡
  routeGeojson?: FeatureCollection<Geometry> | Feature<Geometry> | null;
  // Info: (20260430 - Tzuhan) 使用者點擊要聚焦的特定區段 Geometry
  focusGeojson?:
    | GeoJSON.FeatureCollection
    | GeoJSON.Feature
    | GeoJSON.Geometry
    | null;
  className?: string; // Info: (20260430 - Tzuhan) 自定義外觀 (例如高度)
  interactive?: boolean; // Info: (20260430 - Tzuhan) 是否允許互動 (平移、縮放)
  hideLabel?: boolean; // Info: (20260430 - Tzuhan) 隱藏左下角的標籤
  fitBoundsPadding?: number; // Info: (20260430 - Tzuhan) 控制飛梭邊距，小地圖需設小一點
}

// Info: (20260430 - Tzuhan) 輔助函數：計算 Geometry 的 Bounding Box [[minLng, minLat], [maxLng, maxLat]]
function getBoundingBox(
  geojson:
    | GeoJSON.FeatureCollection
    | GeoJSON.Feature
    | GeoJSON.Geometry
    | null,
): [[number, number], [number, number]] | null {
  if (!geojson) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  const updateBounds = (coord: number[]) => {
    if (coord[0] < minX) minX = coord[0];
    if (coord[0] > maxX) maxX = coord[0];
    if (coord[1] < minY) minY = coord[1];
    if (coord[1] > maxY) maxY = coord[1];
  };

  const processGeometry = (geom: GeoJSON.GeoJSON | null) => {
    if (!geom) return;
    if (geom.type === "LineString") {
      geom.coordinates.forEach(updateBounds);
    } else if (geom.type === "MultiLineString") {
      geom.coordinates.forEach((line: number[][]) =>
        line.forEach(updateBounds),
      );
    } else if (geom.type === "Point") {
      updateBounds(geom.coordinates);
    } else if (geom.type === "GeometryCollection") {
      geom.geometries.forEach(processGeometry);
    } else if (geom.type === "FeatureCollection") {
      geom.features.forEach((f: GeoJSON.Feature) =>
        processGeometry(f.geometry),
      );
    } else if (geom.type === "Feature") {
      processGeometry(geom.geometry);
    }
  };

  processGeometry(geojson);

  if (minX === Infinity) return null;

  // Info: (20260430 - Tzuhan) 防呆：如果起終點太近，給予微小的 bbox 避免報錯或無法縮放
  if (maxX - minX < 0.001) {
    minX -= 0.01;
    maxX += 0.01;
  }
  if (maxY - minY < 0.001) {
    minY -= 0.01;
    maxY += 0.01;
  }

  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

export default function MapViewer({
  routeGeojson = null,
  focusGeojson = null,
  className = "w-full h-full min-h-[600px]",
  interactive = true,
  hideLabel = false,
  fitBoundsPadding = 80,
}: IMapViewerProps) {
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const mapInstanceId = useId();

  const mapRef = useRef<MapRef>(null);
  const targetGeojson = focusGeojson || routeGeojson;
  const initialBbox = targetGeojson ? getBoundingBox(targetGeojson) : null;

  useEffect(() => {
    if (targetGeojson && mapRef.current) {
      const bbox = getBoundingBox(targetGeojson);
      if (bbox) {
        mapRef.current.fitBounds(bbox, {
          padding: fitBoundsPadding,
          duration: 2500,
          maxZoom: 12,
          essential: true,
        });
      }
    }
  }, [targetGeojson, fitBoundsPadding]);

  if (!mapTilerKey) {
    return (
      <div className="rounded bg-red-100 p-4 text-red-500">
        MapTiler Key 尚未設定！
      </div>
    );
  }

  // Info: (20260430 - Tzuhan) dataviz-light
  // Info: (20260430 - Tzuhan) （要付費）使用 MapTiler 的 dataviz-light (高對比亮色，且保留國家邊界與地理脈絡) 底圖
  const mapStyle = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${mapTilerKey}`;

  return (
    <div
      className={`${className} relative overflow-hidden rounded-xl shadow-2xl`}
    >
      <Map
        id={mapInstanceId}
        ref={mapRef}
        // @ts-expect-error: Required for html2canvas to capture WebGL context, types might be missing in react-map-gl
        preserveDrawingBuffer={true}
        renderWorldCopies={false}
        initialViewState={
          initialBbox
            ? {
                bounds: initialBbox,
                fitBoundsOptions: { padding: fitBoundsPadding },
              }
            : {
                longitude: 150,
                latitude: 20,
                zoom: 2,
              }
        }
        mapStyle={mapStyle}
        interactive={interactive}
      >
        {/* Info: (20260430 - Tzuhan) 如果傳入了 GeoJSON，就把它畫在圖層上 */}
        {routeGeojson && (
          <Source
            id={`route-source-${mapInstanceId}`}
            type="geojson"
            data={routeGeojson}
          >
            <Layer
              id={`route-layer-${mapInstanceId}`}
              type="line"
              paint={{
                // Info: (20260430 - Tzuhan) 如果 feature 有 properties.color 則使用，否則使用預設 ESG 螢光綠
                "line-color": ["coalesce", ["get", "color"], "#00E676"],
                "line-width": 3, // Info: (20260430 - Tzuhan) 線條寬度
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}
      </Map>

      {!hideLabel && (
        <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-lg border border-gray-700 bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-sm">
          <span>🟢 ESG 物流碳盤查軌跡 (Powered by MapLibre)</span>
        </div>
      )}
    </div>
  );
}
