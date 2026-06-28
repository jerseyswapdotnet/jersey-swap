"use client";

import { useEffect, useState } from "react";

export type ReelItem = { key: string; label: string; sublabel?: string };

type SpinningReelProps = {
  pool: ReelItem[];
  landOn: ReelItem | null;
  spinToken: number;
  onSettle: () => void;
  placeholder: string;
};

const ITEM_HEIGHT = 56;
const VISIBLE_COUNT = 5;
const MIN_CYCLES = 6;
const MIDDLE_SLOT = Math.floor(VISIBLE_COUNT / 2);

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function SpinningReel({ pool, landOn, spinToken, onSettle, placeholder }: SpinningReelProps) {
  const [track, setTrack] = useState<ReelItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (spinToken === 0 || !landOn || pool.length === 0) return;

    // Concatenate independently-shuffled full passes over the pool as spin filler —
    // each pass contains every item exactly once, so no duplicate is ever visible at
    // the same time within one pass. landOn itself is placed once, separately, in a
    // landing zone built only from other items, so it can't also turn up nearby from
    // its own natural shuffle position.
    const otherItems = pool.filter((item) => item.key !== landOn.key);
    const nextTrack: ReelItem[] = [];
    for (let i = 0; i < MIN_CYCLES; i++) nextTrack.push(...shuffled(pool.length > 1 ? otherItems : pool));
    const landIndex = nextTrack.length;
    nextTrack.push(landOn);
    nextTrack.push(...shuffled(otherItems).slice(0, VISIBLE_COUNT));

    setTrack(nextTrack);
    setOffset(0);
    setSpinning(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOffset((landIndex - MIDDLE_SLOT) * ITEM_HEIGHT);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900"
      style={{ height: ITEM_HEIGHT * VISIBLE_COUNT }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y-2 border-orange-500/70 bg-orange-500/10"
        style={{ height: ITEM_HEIGHT }}
      />
      {track.length === 0 ? (
        <div
          className="flex items-center justify-center text-neutral-500"
          style={{ height: ITEM_HEIGHT * VISIBLE_COUNT }}
        >
          {placeholder}
        </div>
      ) : (
        <div
          className="ease-out"
          style={{
            transform: `translateY(-${offset}px)`,
            transitionProperty: "transform",
            transitionDuration: spinning ? "4000ms" : "0ms",
          }}
          onTransitionEnd={() => {
            if (spinning) {
              setSpinning(false);
              onSettle();
            }
          }}
        >
          {track.map((item, i) => (
            <div
              key={`${item.key}-${i}`}
              className="flex flex-col items-center justify-center text-center"
              style={{ height: ITEM_HEIGHT }}
            >
              <span className="font-semibold text-white">{item.label}</span>
              {item.sublabel && <span className="text-xs text-neutral-400">{item.sublabel}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
