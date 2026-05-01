#!/bin/bash

# Info: (20260501) 初始化本地 OSRM 資料 (預設下載台灣地圖進行開發測試)
# Info: (20260501) 改為直接將資料下載與解壓縮至 Docker Volume 中 (isunfa_osrm_data)

VOLUME_NAME="isunfa_osrm_data"

echo "📦 Ensuring Docker volume '$VOLUME_NAME' exists..."
docker volume create $VOLUME_NAME

echo "🌍 Downloading Taiwan OSM map data into Docker volume..."
docker run --rm -v $VOLUME_NAME:/data alpine sh -c "apk add --no-cache curl && curl -L -o /data/taiwan-latest.osm.pbf https://download.geofabrik.de/asia/taiwan-latest.osm.pbf"

echo "🗺️  Extracting map data..."
docker run --platform linux/amd64 --rm -v $VOLUME_NAME:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/taiwan-latest.osm.pbf || echo "Extract completed"

echo "⚙️  Partitioning map data..."
docker run --platform linux/amd64 --rm -v $VOLUME_NAME:/data osrm/osrm-backend osrm-partition /data/taiwan-latest.osrm || echo "Partition completed"

echo "🔧 Customizing map data..."
docker run --platform linux/amd64 --rm -v $VOLUME_NAME:/data osrm/osrm-backend osrm-customize /data/taiwan-latest.osrm || echo "Customize completed"

echo "✅ Rename to map.osrm for docker-compose..."
docker run --rm -v $VOLUME_NAME:/data alpine sh -c "cd /data && for file in taiwan-latest.osrm*; do mv \"\$file\" \"map\${file#taiwan-latest}\"; done"

echo "🚀 You can now run 'docker compose up -d osrm' to start the local routing server!"
