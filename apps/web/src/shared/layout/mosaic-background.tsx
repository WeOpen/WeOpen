"use client";

import { useEffect, useRef } from "react";

type Tile = {
  centerX: number;
  centerY: number;
  phase: number;
  size: number;
  tone: number;
  x: number;
  y: number;
};

type TrailPoint = {
  energy: number;
  life: number;
  radius: number;
  x: number;
  y: number;
};

const CELL_SIZE = 10;
const GAP_SIZE = 2;
const MAX_DPR = 1.5;
const MAX_TRAIL_POINTS = 48;
const FRAME_INTERVAL = 1000 / 45;

function hash2(a: number, b: number): number {
  let seed = Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0xc2b2ae35, 0x27d4eb2f);
  seed ^= seed >>> 15;
  seed = Math.imul(seed, 0x2c1b3c6d);
  seed ^= seed >>> 12;
  seed = Math.imul(seed, 0x297a2d39);
  seed ^= seed >>> 15;
  return (seed >>> 0) / 4294967295;
}

function pickSpan(seed: number): number {
  if (seed > 0.992) {
    return 5;
  }
  if (seed > 0.972) {
    return 3;
  }
  if (seed > 0.928) {
    return 2;
  }
  return 1;
}

function canPlace(occupied: Uint8Array, columns: number, rows: number, column: number, row: number, span: number): boolean {
  if (column + span > columns || row + span > rows) {
    return false;
  }

  for (let y = row; y < row + span; y += 1) {
    for (let x = column; x < column + span; x += 1) {
      if (occupied[x + y * columns]) {
        return false;
      }
    }
  }

  return true;
}

function markOccupied(occupied: Uint8Array, columns: number, column: number, row: number, span: number): void {
  for (let y = row; y < row + span; y += 1) {
    for (let x = column; x < column + span; x += 1) {
      occupied[x + y * columns] = 1;
    }
  }
}

function mixChannel(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount);
}

function accentColor(tile: Tile, energy: number, time: number): string {
  const pulse = 0.06 * Math.sin(time * 0.004 + tile.phase);
  const amount = Math.max(0, Math.min(1, energy + pulse)) * 0.55;
  const base = 18 + tile.tone * 14;
  const r = mixChannel(base, 37, amount);
  const g = mixChannel(base, 206, amount);
  const b = mixChannel(base, 83, amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function baseColor(tile: Tile): string {
  const value = Math.round(9 + tile.tone * 14 + Math.min(tile.size / 20, 1) * 4);
  return `rgb(${value}, ${value}, ${value})`;
}

function generateTiles(width: number, height: number): Tile[] {
  const columns = Math.ceil(width / CELL_SIZE) + 1;
  const rows = Math.ceil(height / CELL_SIZE) + 1;
  const occupied = new Uint8Array(columns * rows);
  const tiles: Tile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (occupied[column + row * columns]) {
        continue;
      }

      const seed = hash2(column, row);
      let span = pickSpan(seed);
      while (span > 1 && !canPlace(occupied, columns, rows, column, row, span)) {
        span -= 1;
      }

      markOccupied(occupied, columns, column, row, span);

      const x = column * CELL_SIZE;
      const y = row * CELL_SIZE;
      const size = Math.max(2, span * CELL_SIZE - GAP_SIZE);

      tiles.push({
        centerX: x + size / 2,
        centerY: y + size / 2,
        phase: hash2(column + 11, row + 29) * Math.PI * 2,
        size,
        tone: hash2(column + 101, row + 59),
        x,
        y
      });
    }
  }

  return tiles;
}

function drawBase(context: CanvasRenderingContext2D, width: number, height: number, tiles: Tile[]): void {
  context.fillStyle = "#050505";
  context.fillRect(0, 0, width, height);

  for (const tile of tiles) {
    context.fillStyle = baseColor(tile);
    context.fillRect(tile.x, tile.y, tile.size, tile.size);
  }
}

function tileEnergy(tile: Tile, trail: TrailPoint[]): number {
  let energy = 0;

  for (const point of trail) {
    const dx = tile.centerX - point.x;
    const dy = tile.centerY - point.y;
    const distanceSquared = dx * dx + dy * dy;
    const radiusSquared = point.radius * point.radius;

    if (distanceSquared >= radiusSquared) {
      continue;
    }

    const falloff = 1 - distanceSquared / radiusSquared;
    energy = Math.max(energy, falloff * falloff * point.life * point.energy);
  }

  return energy;
}

export function MosaicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) {
      return undefined;
    }

    const baseCanvas = document.createElement("canvas");
    const baseContext = baseCanvas.getContext("2d", { alpha: false });
    if (!baseContext) {
      return undefined;
    }

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = motionPreference.matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let tiles: Tile[] = [];
    let trail: TrailPoint[] = [];
    let animationFrame = 0;
    let resizeTimer = 0;
    let lastFrame = 0;
    let lastPointerX = Number.NEGATIVE_INFINITY;
    let lastPointerY = Number.NEGATIVE_INFINITY;

    const setupCanvas = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      baseContext.setTransform(dpr, 0, 0, dpr, 0, 0);

      tiles = generateTiles(width, height);
      drawBase(baseContext, width, height, tiles);
      context.drawImage(baseCanvas, 0, 0, width, height);
    };

    const pushTrailPoint = (x: number, y: number, energy = 1) => {
      trail.push({
        energy,
        life: 1,
        radius: energy > 1 ? 22 : 16,
        x,
        y
      });

      if (trail.length > MAX_TRAIL_POINTS) {
        trail = trail.slice(trail.length - MAX_TRAIL_POINTS);
      }
    };

    const addTrailPoint = (x: number, y: number, energy = 1) => {
      const dx = x - lastPointerX;
      const dy = y - lastPointerY;
      if (dx * dx + dy * dy < 36 && trail.length > 0) {
        const lastPoint = trail[trail.length - 1];
        lastPoint.x = x;
        lastPoint.y = y;
        lastPoint.life = 1;
        lastPoint.energy = Math.max(lastPoint.energy, energy);
        return;
      }

      if (Number.isFinite(lastPointerX) && Number.isFinite(lastPointerY)) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.min(12, Math.floor(distance / 9));

        for (let step = 1; step <= steps; step += 1) {
          const progress = step / (steps + 1);
          pushTrailPoint(lastPointerX + dx * progress, lastPointerY + dy * progress, energy * 0.86);
        }
      }

      pushTrailPoint(x, y, energy);
      lastPointerX = x;
      lastPointerY = y;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const events = event.getCoalescedEvents?.() ?? [event];
      const step = events.length > 8 ? Math.ceil(events.length / 8) : 1;

      for (let index = 0; index < events.length; index += step) {
        addTrailPoint(events[index].clientX, events[index].clientY);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      addTrailPoint(event.clientX, event.clientY, 1.25);
    };

    const handlePointerClear = () => {
      lastPointerX = Number.NEGATIVE_INFINITY;
      lastPointerY = Number.NEGATIVE_INFINITY;
    };

    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setupCanvas, 140);
    };

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
    };

    const render = (time: number) => {
      animationFrame = window.requestAnimationFrame(render);

      if (time - lastFrame < FRAME_INTERVAL) {
        return;
      }

      lastFrame = time;
      context.drawImage(baseCanvas, 0, 0, width, height);

      for (const tile of tiles) {
        const energy = tileEnergy(tile, trail);
        if (energy <= 0.025) {
          continue;
        }

        context.fillStyle = accentColor(tile, Math.min(1, energy), time);
        context.fillRect(tile.x, tile.y, tile.size, tile.size);
      }

      if (prefersReducedMotion) {
        trail = trail.slice(-1);
        return;
      }

      trail = trail
        .map((point) => ({
          ...point,
          life: point.life - 0.07,
          radius: point.radius + 0.12
        }))
        .filter((point) => point.life > 0);
    };

    setupCanvas();
    animationFrame = window.requestAnimationFrame(render);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerleave", handlePointerClear);
    window.addEventListener("pointercancel", handlePointerClear);
    window.addEventListener("blur", handlePointerClear);
    window.addEventListener("resize", handleResize);
    motionPreference.addEventListener("change", handleMotionPreference);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerleave", handlePointerClear);
      window.removeEventListener("pointercancel", handlePointerClear);
      window.removeEventListener("blur", handlePointerClear);
      window.removeEventListener("resize", handleResize);
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  return <canvas aria-hidden="true" className="weopen-mosaic-background" ref={canvasRef} />;
}
