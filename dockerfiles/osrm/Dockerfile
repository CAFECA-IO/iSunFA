# Info: (20260503 - Luphia) Stage 1 - Download Map Data
FROM alpine:latest AS downloader

RUN apk add --no-cache curl
WORKDIR /data
RUN curl -L -o map.osm.pbf https://download.geofabrik.de/asia/taiwan-latest.osm.pbf

# Info: (20260503 - Luphia) Stage 2 - Process Map Data
FROM osrm/osrm-backend:latest AS builder

WORKDIR /data

# Info: (20260503 - Luphia) Copy the downloaded map from the downloader stage
COPY --from=downloader /data/map.osm.pbf ./

# Info: (20260503 - Luphia) Extract, Partition, and Customize using the default car profile
RUN osrm-extract -p /opt/car.lua map.osm.pbf
RUN osrm-partition map.osrm
RUN osrm-customize map.osrm

# Info: (20260503 - Luphia) Clean up raw map data to reduce final image size
RUN rm map.osm.pbf

# Info: (20260503 - Luphia) Stage 3 - Final Runtime Image
FROM osrm/osrm-backend:latest

WORKDIR /data

# Info: (20260503 - Luphia) Copy only the processed routing data from builder
COPY --from=builder /data/ /data/

EXPOSE 5000

# Info: (20260503 - Luphia) Start the routing engine
CMD ["osrm-routed", "--algorithm", "mld", "/data/map.osrm"]
