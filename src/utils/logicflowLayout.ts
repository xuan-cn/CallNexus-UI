export interface FlowLayoutNode {
  id: string;
  type?: string;
  x: number;
  y: number;
}

export interface FlowLayoutEdge {
  source: string;
  target: string;
}

export interface FlowLayoutOptions {
  direction?: 'LR' | 'TB';
  horizontalGap?: number;
  verticalGap?: number;
  originX?: number;
  originY?: number;
  startNodeType?: string;
}

/**
 * Produces a deterministic layered layout while treating loop edges as
 * back references. Node and edge contents are never changed.
 */
export const createLayeredFlowLayout = <T extends FlowLayoutNode>(nodes: T[], edges: FlowLayoutEdge[], options: FlowLayoutOptions = {}): T[] => {
  if (nodes.length < 2) return nodes.map((node) => ({ ...node }));

  const horizontalGap = options.horizontalGap ?? 250;
  const verticalGap = options.verticalGap ?? 140;
  const topToBottom = options.direction === 'TB';
  const originX = options.originX ?? 160;
  const originY = options.originY ?? 110;
  const startNodeType = options.startNodeType ?? 'START';
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incomingCount = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));

  edges.forEach((edge) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) return;
    outgoing.get(edge.source)?.push(edge.target);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
  });

  const byCurrentPosition = (left: T, right: T) =>
    (topToBottom ? left.x - right.x || left.y - right.y : left.y - right.y || left.x - right.x) || left.id.localeCompare(right.id);
  const roots = nodes
    .filter((node) => node.type === startNodeType || incomingCount.get(node.id) === 0)
    .sort((left, right) => {
      const startOrder = Number(right.type === startNodeType) - Number(left.type === startNodeType);
      return startOrder || byCurrentPosition(left, right);
    });
  const layerById = new Map<string, number>();

  const assignComponent = (seedIds: string[], baseLayer: number) => {
    const queue = seedIds.map((id) => ({ id, layer: baseLayer }));
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (layerById.has(current.id)) continue;
      layerById.set(current.id, current.layer);
      (outgoing.get(current.id) || []).forEach((targetId) => {
        if (!layerById.has(targetId)) queue.push({ id: targetId, layer: current.layer + 1 });
      });
    }
  };

  assignComponent(
    roots.map((node) => node.id),
    0
  );

  nodes
    .filter((node) => !layerById.has(node.id))
    .sort(byCurrentPosition)
    .forEach((node) => {
      if (layerById.has(node.id)) return;
      const nextLayer = Math.max(-1, ...layerById.values()) + 1;
      assignComponent([node.id], nextLayer);
    });

  const layers = new Map<number, T[]>();
  nodes.forEach((node) => {
    const layer = layerById.get(node.id) || 0;
    const entries = layers.get(layer) || [];
    entries.push(node);
    layers.set(layer, entries);
  });
  const maximumRows = Math.max(...Array.from(layers.values(), (entries) => entries.length));
  const positionById = new Map<string, { x: number; y: number }>();

  Array.from(layers.entries())
    .sort(([left], [right]) => left - right)
    .forEach(([layer, entries]) => {
      entries.sort(byCurrentPosition);
      const layerOffset = ((maximumRows - entries.length) * (topToBottom ? horizontalGap : verticalGap)) / 2;
      entries.forEach((node, row) => {
        positionById.set(node.id, {
          x: topToBottom ? originX + layerOffset + row * horizontalGap : originX + layer * horizontalGap,
          y: topToBottom ? originY + layer * verticalGap : originY + layerOffset + row * verticalGap
        });
      });
    });

  return nodes.map((node) => ({ ...node, ...positionById.get(node.id) }));
};
