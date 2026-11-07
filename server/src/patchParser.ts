import { Fixture, PatchData, PatchBounds } from './types.js';

export interface ColumnMapping {
  xCol: string;
  yCol: string;
  typeCol: string;
  idCol: string;
  nameCol?: string;
  universeCol?: string;
  channelCol?: string;
  groupCol?: string;
}

export function parseMadrixCsv(
  csvContent: string,
  filename: string,
  customMapping?: ColumnMapping,
  delimiter?: string
): PatchData {
  // Strip BOM if present
  let cleanContent = csvContent;
  if (cleanContent.charCodeAt(0) === 0xfeff) {
    cleanContent = cleanContent.slice(1);
  }

  // Detect delimiter if not forced
  const firstLine = cleanContent.split(/\r?\n/)[0] || '';
  const sep = delimiter || (firstLine.includes(';') ? ';' : ',');

  const rawLines = cleanContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (rawLines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const headerCols = rawLines[0].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
  const headerLower = headerCols.map((c) => c.toLowerCase());

  // Auto-detect columns
  const findCol = (candidates: string[]): number => {
    for (const cand of candidates) {
      const idx = headerLower.findIndex((h) => h === cand || h.includes(cand));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const xIdx = customMapping
    ? headerCols.indexOf(customMapping.xCol)
    : findCol(['position x', 'pos x', 'pos_x', 'x position', 'x']);
  const yIdx = customMapping
    ? headerCols.indexOf(customMapping.yCol)
    : findCol(['position y', 'pos y', 'pos_y', 'y position', 'y']);
  const typeIdx = customMapping
    ? headerCols.indexOf(customMapping.typeCol)
    : findCol(['fixture', 'fixture type', 'type', 'model']);
  const idIdx = customMapping
    ? headerCols.indexOf(customMapping.idCol)
    : findCol(['identifier', 'fixture id', 'id', 'index']);
  const nameIdx = customMapping && customMapping.nameCol
    ? headerCols.indexOf(customMapping.nameCol)
    : findCol(['display name', 'name', 'label']);
  const universeIdx = findCol(['universe', 'univ']);
  const channelIdx = findCol(['channel', 'dmx channel', 'chan']);
  const groupIdx = findCol(['groups', 'group']);

  if (xIdx === -1 || yIdx === -1) {
    throw new Error(
      `Could not detect X and Y position columns in CSV header: [${headerCols.join(', ')}]. Please provide manual column mappings.`
    );
  }

  const fixtures: Fixture[] = [];
  const warnings: string[] = [];
  const coordMap = new Map<string, number>();
  const typeCounts: Record<string, number> = {};

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    const parts = line.split(sep).map((p) => p.trim().replace(/^"|"$/g, ''));
    if (parts.length <= Math.max(xIdx, yIdx)) {
      warnings.push(`Row ${i + 1}: Insufficient columns, skipped.`);
      continue;
    }

    const rawX = parts[xIdx];
    const rawY = parts[yIdx];
    const x = Math.round(parseFloat(rawX));
    const y = Math.round(parseFloat(rawY));

    if (isNaN(x) || isNaN(y)) {
      warnings.push(`Row ${i + 1}: Invalid non-numeric coordinates (X: "${rawX}", Y: "${rawY}").`);
      continue;
    }

    const typeStr = typeIdx !== -1 && parts[typeIdx] ? parts[typeIdx] : 'Default';
    const idStr = idIdx !== -1 && parts[idIdx] ? parts[idIdx] : String(i);
    const displayName = nameIdx !== -1 && parts[nameIdx] ? parts[nameIdx] : `Fixture #${idStr}`;
    const universe = universeIdx !== -1 ? parseInt(parts[universeIdx]) || 1 : 1;
    const channel = channelIdx !== -1 ? parseInt(parts[channelIdx]) || 1 : 1;
    const group = groupIdx !== -1 && parts[groupIdx] ? parts[groupIdx] : '';

    // Check duplicate coordinates
    const key = `${x},${y}`;
    if (coordMap.has(key)) {
      warnings.push(`Duplicate fixture coordinate at (${x}, ${y}) - Fixture ID ${idStr}`);
    } else {
      coordMap.set(key, i);
    }

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    typeCounts[typeStr] = (typeCounts[typeStr] || 0) + 1;

    fixtures.push({
      id: idStr,
      identifier: parseInt(idStr) || i,
      x,
      y,
      type: typeStr,
      displayName,
      universe,
      channel,
      group,
      isIsolated: false,
      isInVerticalLine: false,
    });
  }

  if (fixtures.length === 0) {
    throw new Error('No valid fixtures found in CSV file.');
  }

  // Analyze vertical mounting lines & isolated dots
  const xBuckets = new Map<number, Fixture[]>();
  for (const f of fixtures) {
    const bucket = xBuckets.get(f.x) || [];
    bucket.push(f);
    xBuckets.set(f.x, bucket);
  }

  let verticalCount = 0;
  for (const [colX, colFixtures] of xBuckets.entries()) {
    // If 4 or more fixtures share the exact same X coordinate, they form a vertical strip/line
    if (colFixtures.length >= 4) {
      for (const f of colFixtures) {
        f.isInVerticalLine = true;
        f.verticalColumnX = colX;
        verticalCount++;
      }
    }
  }

  // Isolated dot detection using spatial neighbor density
  // Fixture is isolated if it has fewer than 2 neighbors within a 14-pixel radius
  let isolatedCount = 0;
  const radiusSq = 14 * 14;

  for (let i = 0; i < fixtures.length; i++) {
    const f1 = fixtures[i];
    let neighborCount = 0;

    for (let j = 0; j < fixtures.length; j++) {
      if (i === j) continue;
      const f2 = fixtures[j];
      const dx = f1.x - f2.x;
      const dy = f1.y - f2.y;
      if (Math.abs(dx) > 14) continue; // fast cull
      if (dx * dx + dy * dy <= radiusSq) {
        neighborCount++;
        if (neighborCount >= 2) break;
      }
    }

    if (neighborCount < 2) {
      f1.isIsolated = true;
      isolatedCount++;
    }
  }

  const bounds: PatchBounds = {
    minX: minX === Infinity ? 0 : minX,
    maxX: maxX === -Infinity ? 0 : maxX,
    minY: minY === Infinity ? 0 : minY,
    maxY: maxY === -Infinity ? 0 : maxY,
    width: maxX >= minX ? maxX - minX + 1 : 0,
    height: maxY >= minY ? maxY - minY + 1 : 0,
  };

  return {
    filename,
    totalCount: fixtures.length,
    fixtures,
    types: typeCounts,
    bounds,
    warnings: warnings.slice(0, 50), // cap warnings
    isolatedCount,
    verticalLineCount: verticalCount,
  };
}
