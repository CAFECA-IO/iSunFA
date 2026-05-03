import { calculateDistanceKm, splitAtAntimeridian } from "@/lib/utils/geo";
import { ITransportSegment } from "@/interfaces/logistics";
import shippingLanes from "@/lib/data/shipping_lanes.json";

// Info: (20260501 - Luphia) 抽離基礎座標型別，統一資料結構，提升擴充與維護性
type Coordinate = [number, number];

// Info: (20260501 - Luphia) 採用 Discriminated Unions 實作 GeoJSON Geometry，消滅後續強制轉型的需求
type GeoJSONGeometry =
  | { type: "Point"; coordinates: Coordinate }
  | { type: "LineString"; coordinates: Coordinate[] }
  | { type: "MultiLineString"; coordinates: Coordinate[][] };

interface INode {
  lng: number;
  lat: number;
  key: string;
}

interface IEdge {
  target: string;
  weight: number;
}

interface IFeature {
  geometry: GeoJSONGeometry;
}

interface IShippingLanes {
  name: string;
  type: string;
  crs: {
    type: string;
    properties: {
      name: string;
    };
  };
  features: IFeature[];
}

class PriorityQueue<T> {
  private data: { element: T; priority: number }[] = [];

  enqueue(element: T, priority: number) {
    this.data.push({ element, priority });
    this.bubbleUp(this.data.length - 1);
  }

  dequeue(): T | undefined {
    if (this.data.length === 0) return undefined;
    const result = this.data[0].element;
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return result;
  }

  isEmpty() {
    return this.data.length === 0;
  }

  private bubbleUp(n: number) {
    // Info: (20260501 - Luphia) 建立內部變數 currentIndex 避免直接修改參數 n (no-param-reassign)
    let currentIndex = n;
    const element = this.data[currentIndex];
    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex + 1) / 2) - 1;
      const parent = this.data[parentIndex];
      if (element.priority >= parent.priority) break;
      this.data[parentIndex] = element;
      this.data[currentIndex] = parent;
      currentIndex = parentIndex;
    }
  }

  private sinkDown(n: number) {
    // Info: (20260501 - Luphia) 建立內部變數 currentIndex 避免直接修改參數 n (no-param-reassign)
    let currentIndex = n;
    const length = this.data.length;
    const element = this.data[currentIndex];
    while (true) {
      const child2Index = (currentIndex + 1) * 2;
      const child1Index = child2Index - 1;
      let swapIndex = null;
      let child1Priority = 0;

      if (child1Index < length) {
        const child1 = this.data[child1Index];
        child1Priority = child1.priority;
        if (child1Priority < element.priority) {
          swapIndex = child1Index;
        }
      }
      if (child2Index < length) {
        const child2 = this.data[child2Index];
        if (
          child2.priority <
          (swapIndex === null ? element.priority : child1Priority)
        ) {
          swapIndex = child2Index;
        }
      }

      if (swapIndex === null) break;
      this.data[currentIndex] = this.data[swapIndex];
      this.data[swapIndex] = element;
      currentIndex = swapIndex;
    }
  }
}

class SeaGraph {
  nodes = new Map<string, INode>();
  edges = new Map<string, IEdge[]>();
  mainComponentKeys = new Set<string>();

  // Info: (20260501 - Luphia) 建立空間索引網格，加速 snapToMainNetwork
  private gridIndex = new Map<string, Set<string>>();

  constructor() {
    this.buildGraph();
  }

  private getGridKey(lat: number, lng: number): string {
    // Info: (20260501 - Luphia) 採用 5x5 度的空間分塊
    return `${Math.floor(lat / 5)},${Math.floor(lng / 5)}`;
  }

  private buildGraph() {
    const data = shippingLanes as unknown as IShippingLanes;

    for (const feature of data.features) {
      // Info: (20260501 - Luphia) 判斷為 LineString 後，TypeScript 會自動推導 coords 為 Coordinate[]，無須 as 轉型
      if (feature.geometry && feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates;
        for (let i = 0; i < coords.length - 1; i++) {
          const c1 = coords[i];
          const c2 = coords[i + 1];
          const k1 = `${c1[0]},${c1[1]}`;
          const k2 = `${c2[0]},${c2[1]}`;

          if (!this.nodes.has(k1))
            this.nodes.set(k1, { lng: c1[0], lat: c1[1], key: k1 });
          if (!this.nodes.has(k2))
            this.nodes.set(k2, { lng: c2[0], lat: c2[1], key: k2 });

          const dist = calculateDistanceKm(c1[1], c1[0], c2[1], c2[0]);

          // Info: (20260501 - Luphia) 減少 Map.has 與 set 的重複操作
          let edges1 = this.edges.get(k1);
          if (!edges1) {
            edges1 = [];
            this.edges.set(k1, edges1);
          }
          edges1.push({ target: k2, weight: dist });

          let edges2 = this.edges.get(k2);
          if (!edges2) {
            edges2 = [];
            this.edges.set(k2, edges2);
          }
          edges2.push({ target: k1, weight: dist });
        }
      }
    }

    const visited = new Set<string>();
    let largestComponent: string[] = [];

    for (const key of this.nodes.keys()) {
      if (!visited.has(key)) {
        const comp: string[] = [];
        const queue = [key];
        visited.add(key);

        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          comp.push(curr);
          for (const edge of this.edges.get(curr) || []) {
            if (!visited.has(edge.target)) {
              visited.add(edge.target);
              queue.push(edge.target);
            }
          }
        }

        if (comp.length > largestComponent.length) {
          largestComponent = comp;
        }
      }
    }

    this.mainComponentKeys = new Set(largestComponent);

    // Info: (20260501 - Luphia) 建立空間索引 (Spatial Index)
    for (const key of this.mainComponentKeys) {
      const node = this.nodes.get(key)!;
      const gridKey = this.getGridKey(node.lat, node.lng);
      if (!this.gridIndex.has(gridKey)) {
        this.gridIndex.set(gridKey, new Set());
      }
      this.gridIndex.get(gridKey)!.add(key);
    }
  }

  // Info: (20260501 - Luphia) 回傳型別為 INode
  public snapToMainNetwork(lat: number, lng: number): INode {
    let minDist = Infinity;
    let closest: INode | null = null;

    // Info: (20260501 - Luphia) 先在鄰近的 3x3 網格區塊找點 (大幅減少運算量)
    const centerGridLat = Math.floor(lat / 5);
    const centerGridLng = Math.floor(lng / 5);
    const searchKeys = new Set<string>();

    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLng = -1; dLng <= 1; dLng++) {
        const gridKey = `${centerGridLat + dLat},${centerGridLng + dLng}`;
        const cellNodes = this.gridIndex.get(gridKey);
        if (cellNodes) {
          for (const key of cellNodes) searchKeys.add(key);
        }
      }
    }

    // Info: (20260501 - Luphia) 若鄰近網格有節點則僅搜尋該範圍；若落入極端空白區塊，退回全局掃描
    const targetKeys =
      searchKeys.size > 0 ? searchKeys : this.mainComponentKeys;

    for (const key of targetKeys) {
      const node = this.nodes.get(key)!;

      // Info: (20260501 - Luphia) 快速剔除明顯過遠的點 (啟發式篩選：1緯度約 111 公里)
      if (Math.abs(node.lat - lat) * 111 > minDist) continue;

      const dist = calculateDistanceKm(lat, lng, node.lat, node.lng);
      if (dist < minDist) {
        minDist = dist;
        closest = node;
      }
    }
    return closest!;
  }

  // Info: (20260501 - Luphia) 回傳型別為 INode[]
  public aStar(startKey: string, endKey: string): INode[] {
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const openSet = new PriorityQueue<string>();
    const closedSet = new Set<string>(); // Info: (20260501 - Luphia) 防止重複處理已展開的節點

    gScore.set(startKey, 0);
    const endNode = this.nodes.get(endKey)!;

    const heuristic = (k: string) => {
      const n = this.nodes.get(k)!;
      return calculateDistanceKm(n.lat, n.lng, endNode.lat, endNode.lng);
    };

    openSet.enqueue(startKey, heuristic(startKey));

    while (!openSet.isEmpty()) {
      const current = openSet.dequeue()!;

      // Info: (20260501 - Luphia) Priority Queue 沒有 decreaseKey，可能會 enqueue 多次同一個點
      // Info: (20260501 - Luphia) 使用 closedSet 確保最優解出列後，不再重複處理
      if (closedSet.has(current)) continue;
      closedSet.add(current);

      if (current === endKey) {
        const path: INode[] = [this.nodes.get(current)!];
        let curr = current;
        while (cameFrom.has(curr)) {
          curr = cameFrom.get(curr)!;
          path.unshift(this.nodes.get(curr)!);
        }
        return path;
      }

      const currentG = gScore.get(current) ?? Infinity; // Info: (20260501 - Luphia) 惰性取值，避免提早 O(N) 寫入

      for (const neighbor of this.edges.get(current) || []) {
        if (!this.mainComponentKeys.has(neighbor.target)) continue;
        if (closedSet.has(neighbor.target)) continue; // Info: (20260501 - Luphia) 若已展開過則略過

        const tentativeG = currentG + neighbor.weight;
        const neighborG = gScore.get(neighbor.target) ?? Infinity;

        if (tentativeG < neighborG) {
          cameFrom.set(neighbor.target, current);
          gScore.set(neighbor.target, tentativeG);
          openSet.enqueue(
            neighbor.target,
            tentativeG + heuristic(neighbor.target),
          );
        }
      }
    }
    return [];
  }
}

let graphInstance: SeaGraph | null = null;

/**
 * Info: (20260501 - Luphia) 計算海運路徑與距離
 * @param start 起點 { lat: number, lng: number }
 * @param end 終點 { lat: number, lng: number }
 * @returns 包含成功狀態、海浬距離(NM)、以及 GeoJSON 路徑的物件
 */
export function calculateSeaPath(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): ITransportSegment {
  try {
    if (!graphInstance) {
      graphInstance = new SeaGraph();
    }

    const startNode = graphInstance.snapToMainNetwork(start.lat, start.lng);
    const endNode = graphInstance.snapToMainNetwork(end.lat, end.lng);

    const pathNodes = graphInstance.aStar(startNode.key, endNode.key);

    if (pathNodes.length === 0) {
      throw new Error("Route not found");
    }

    // Info: (20260501 - Luphia) 配合新的 Coordinate 型別，統一此處座標格式
    const coordinates: Coordinate[] = [];
    coordinates.push([start.lng, start.lat]);

    let totalDistance = 0;
    totalDistance += calculateDistanceKm(
      start.lat,
      start.lng,
      startNode.lat,
      startNode.lng,
    );

    for (let i = 0; i < pathNodes.length; i++) {
      coordinates.push([pathNodes[i].lng, pathNodes[i].lat]);
      if (i > 0) {
        totalDistance += calculateDistanceKm(
          pathNodes[i - 1].lat,
          pathNodes[i - 1].lng,
          pathNodes[i].lat,
          pathNodes[i].lng,
        );
      }
    }

    totalDistance += calculateDistanceKm(
      endNode.lat,
      endNode.lng,
      end.lat,
      end.lng,
    );
    coordinates.push([end.lng, end.lat]);

    const geometry: GeoJSON.LineString = {
      type: "LineString",
      coordinates,
    };

    return {
      success: true,
      distanceKm: totalDistance,
      geometry: splitAtAntimeridian(geometry),
      isFallback: false, // Info: (20260501 - Luphia) 強制路由，不再使用 fallback
    };
  } catch (e) {
    console.error("[SeaPath] A* Routing error:", e);
    // Info: (20260501 - Luphia) 若系統錯誤，仍必須有一條路徑
    const distKm =
      calculateDistanceKm(start.lat, start.lng, end.lat, end.lng) * 1.5;
    const geometry: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat],
      ] as Coordinate[],
    };
    return {
      success: true,
      distanceKm: distKm,
      geometry: splitAtAntimeridian(geometry),
      isFallback: true,
    };
  }
}
