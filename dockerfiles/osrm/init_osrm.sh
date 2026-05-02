#!/bin/bash
set -e

# Info: (20260501) 初始化本地 OSRM 資料 (預設下載台灣地圖進行開發測試)
# Info: (20260503) 改進：直接下載為 map.osm.pbf，並清理舊資料，避免產生 Broken File 錯誤

VOLUME_NAME="isunfa_osrm_data"

echo "🛑 Stopping OSRM container if running to prevent file locking..."
docker stop osrm 2>/dev/null || true

echo "📦 Ensuring Docker volume '$VOLUME_NAME' exists..."
docker volume create $VOLUME_NAME

echo "🧹 Cleaning up old map data..."
docker run --rm -v $VOLUME_NAME:/data alpine sh -c "rm -rf /data/*"

echo "🌍 Downloading Taiwan OSM map data into Docker volume..."
docker run --rm -v $VOLUME_NAME:/data alpine sh -c "apk add --no-cache curl && curl -L -o /data/map.osm.pbf https://download.geofabrik.de/asia/taiwan-latest.osm.pbf"

echo "🗺️  Extracting map data (This might take a while, please do not interrupt)..."
docker run --platform linux/amd64 --rm -v $VOLUME_NAME:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/map.osm.pbf

echo "⚙️  Partitioning map data..."
docker run --platform linux/amd64 --rm -v $VOLUME_NAME:/data osrm/osrm-backend osrm-partition /data/map.osrm

echo "🔧 Customizing map data..."
docker run --platform linux/amd64 --rm -v $VOLUME_NAME:/data osrm/osrm-backend osrm-customize /data/map.osrm

echo "✅ Map data processed successfully! No renaming needed."
echo "🚀 You can now run 'docker compose up -d osrm' (or 'docker compose restart osrm') to start the local routing server!"
