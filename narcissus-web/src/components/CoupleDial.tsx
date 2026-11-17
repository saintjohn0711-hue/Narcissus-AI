"use client";

import Link from "next/link";
import { useCallback, useId, useMemo, useState } from "react";
import { PERSON_LABEL } from "@/lib/artOfX";
import { OUTLETS } from "@/lib/outlets";

export type DialItem = {
  id: string;
  label: string;
  href: string;
  kind: "outlet" | "room";
  /** Short hint under the dial when focused */
  hint: string;
};

/** Primary ring — outlets first, then key rooms */
export const DIAL_PRIMARY: DialItem[] = [
  {
    id: "women",
    label: "Women",
    href: OUTLETS[0].href,
    kind: "outlet",
    hint: "Muses who present as women",
  },
  {
    id: "men",
    label: "Men",
    href: OUTLETS[1].href,
    kind: "outlet",
    hint: "Muses who present as men",
  },
  {
    id: "trans",
    label: "Trans",
    href: OUTLETS[2].href,
    kind: "outlet",
    hint: "Trans Muses",
  },
  {
    id: "muses",
    label: PERSON_LABEL.plural,
    href: "/art-of-x/partners",
    kind: "room",
    hint: "All Muses — full desire ledger",
  },
  {
    id: "chat",
    label: "AI chat",
    href: "/art-of-x/chat",
    kind: "room",
    hint: "Living companion conversation",
  },
  {
    id: "studio",
    label: "Studio",
    href: "/studio",
    kind: "room",
    hint: "Likeness edits & short video",
  },
];

export const DIAL_MORE: DialItem[] = [
  {
    id: "aox",
    label: "Art of X",
    href: "/art-of-x",
    kind: "room",
    hint: "Desire craft hub",
  },
  {
    id: "stories",
    label: "Stories",
    href: "/art-of-x/stories",
    kind: "room",
    hint: "Scene builder",
  },
  {
    id: "home",
    label: "Menu",
    href: "/menu",
    kind: "room",
    hint: "Main menu",
  },
  {
    id: "circle",
    label: "Circle",
    href: "/circle",
    kind: "room",
    hint: "Discovery & share codes",
  },
  {
    id: "echo",
    label: "Echo",
    href: "/account",
    kind: "room",
    hint: "Your account",
  },
];

type CoupleDialProps = {
  activeHref?: string | null;
  isActive?: (href: string) => boolean;
  onNavigate?: () => void;
  /**
   * full — radial Couple dial (phone Menu)
   * more — extras only (desktop More drawer; primary lives in AppNav)
   */
  mode?: "full" | "more";
};

function CoupleOrnament({ uid }: { uid: string }) {
  const metal = `${uid}-metal`;
  const glow = `${uid}-glow`;
  const fill = `${uid}-fill`;
  return (
    <svg
      className="couple-dial-ornament"
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0dcc8" />
          <stop offset="45%" stopColor="#e5c3b2" />
          <stop offset="100%" stopColor="#c4a08c" />
        </linearGradient>
        <linearGradient id={fill} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#1a2840" />
          <stop offset="100%" stopColor="#070b14" />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="rgba(0,229,255,0.45)" />
          <stop offset="55%" stopColor="rgba(0,163,255,0.12)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill={`url(#${glow})`} />
      <circle
        cx="60"
        cy="60"
        r="46"
        fill={`url(#${fill})`}
        stroke={`url(#${metal})`}
        strokeWidth="1.4"
      />
      {/* Dual figures — intimate couple silhouette */}
      <g fill={`url(#${metal})`} opacity="0.92">
        {/* Left figure */}
        <ellipse cx="48" cy="42" rx="9" ry="10.5" />
        <path d="M36 88 C36 64 42 56 48 56 C54 56 58 62 58 72 C54 70 50 72 48 78 C46 72 42 70 38 72 Z" />
        {/* Right figure */}
        <ellipse cx="72" cy="40" rx="9.5" ry="11" />
        <path d="M62 88 C62 66 68 54 72 54 C78 54 86 64 86 88 C80 78 76 74 72 76 C68 74 64 78 62 88 Z" />
        {/* Embrace bridge */}
        <path
          d="M56 62 C60 58 64 58 68 62 C64 66 60 66 56 62Z"
          opacity="0.75"
        />
      </g>
      <circle
        cx="60"
        cy="60"
        r="46"
        fill="none"
        stroke="rgba(0,229,255,0.35)"
        strokeWidth="1"
        className="couple-dial-ornament-ring"
      />
    </svg>
  );
}

function polarLabel(index: number, total: number) {
  const angle = -90 + (360 / total) * index;
  const rad = (angle * Math.PI) / 180;
  const r = 42; // % from center
  const x = 50 + r * Math.cos(rad);
  const y = 50 + r * Math.sin(rad);
  return { x, y, angle };
}

/**
 * Sexy couple dial — radial outlets + rooms.
 * Keyboard: ←/→ cycle, Enter opens focused segment.
 */
export function CoupleDial({
  activeHref = null,
  isActive,
  onNavigate,
  mode = "full",
}: CoupleDialProps) {
  const uid = useId().replace(/:/g, "");
  const [focusIdx, setFocusIdx] = useState(0);
  const total = DIAL_PRIMARY.length;
  const moreOnly = mode === "more";

  const activeIndex = useMemo(() => {
    const check = isActive ?? ((href: string) => href === activeHref);
    const idx = DIAL_PRIMARY.findIndex((item) => check(item.href));
    return idx >= 0 ? idx : -1;
  }, [activeHref, isActive]);

  const focused = DIAL_PRIMARY[focusIdx] ?? DIAL_PRIMARY[0];

  const move = useCallback(
    (delta: number) => {
      setFocusIdx((i) => (i + delta + total) % total);
    },
    [total],
  );

  const checkHref = isActive ?? ((href: string) => href === activeHref);

  return (
    <div className={`couple-dial${moreOnly ? " couple-dial--more" : ""}`}>
      {moreOnly ? (
        <p className="couple-dial-kicker">More destinations</p>
      ) : (
        <p className="couple-dial-kicker">Couple dial</p>
      )}

      {!moreOnly && (
        <>
          <div
            className="couple-dial-stage"
            role="group"
            aria-label="Couple dial navigation"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
            }}
          >
            <div className="couple-dial-ring" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="couple-dial-ring-svg">
                <defs>
                  <linearGradient id={`${uid}-seg`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgba(0,229,255,0.22)" />
                    <stop offset="100%" stopColor="rgba(0,163,255,0.06)" />
                  </linearGradient>
                </defs>
                {DIAL_PRIMARY.map((_, i) => {
                  const start = -90 + (360 / total) * i;
                  const end = start + 360 / total - 1.2;
                  const toRad = (d: number) => (d * Math.PI) / 180;
                  const rO = 48;
                  const rI = 22;
                  const x1 = 50 + rO * Math.cos(toRad(start));
                  const y1 = 50 + rO * Math.sin(toRad(start));
                  const x2 = 50 + rO * Math.cos(toRad(end));
                  const y2 = 50 + rO * Math.sin(toRad(end));
                  const x3 = 50 + rI * Math.cos(toRad(end));
                  const y3 = 50 + rI * Math.sin(toRad(end));
                  const x4 = 50 + rI * Math.cos(toRad(start));
                  const y4 = 50 + rI * Math.sin(toRad(start));
                  const large = 360 / total > 180 ? 1 : 0;
                  const d = [
                    `M ${x1} ${y1}`,
                    `A ${rO} ${rO} 0 ${large} 1 ${x2} ${y2}`,
                    `L ${x3} ${y3}`,
                    `A ${rI} ${rI} 0 ${large} 0 ${x4} ${y4}`,
                    "Z",
                  ].join(" ");
                  const lit = i === focusIdx || i === activeIndex;
                  return (
                    <path
                      key={i}
                      d={d}
                      className={`couple-dial-wedge${lit ? " is-lit" : ""}`}
                      fill={lit ? `url(#${uid}-seg)` : "rgba(10,16,28,0.55)"}
                      stroke={
                        lit ? "rgba(0,229,255,0.65)" : "rgba(0,229,255,0.18)"
                      }
                      strokeWidth={lit ? 0.7 : 0.35}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="couple-dial-hub">
              <CoupleOrnament uid={uid} />
              <span className="couple-dial-hub-label">Dial</span>
            </div>

            {DIAL_PRIMARY.map((item, i) => {
              const { x, y } = polarLabel(i, total);
              const active = checkHref(item.href);
              const focusedHere = i === focusIdx;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onNavigate}
                  onFocus={() => setFocusIdx(i)}
                  onMouseEnter={() => setFocusIdx(i)}
                  className={`couple-dial-spoke${active ? " is-active" : ""}${
                    focusedHere ? " is-focus" : ""
                  }${item.kind === "outlet" ? " is-outlet" : ""}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="couple-dial-spoke-label">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="couple-dial-readout" aria-live="polite">
            <p className="couple-dial-readout-label">{focused.label}</p>
            <p className="couple-dial-readout-hint">{focused.hint}</p>
          </div>
        </>
      )}

      <div className="couple-dial-more">
        {!moreOnly && <p className="couple-dial-more-kicker">More</p>}
        <div className="couple-dial-more-row">
          {DIAL_MORE.map((item) => {
            const active = checkHref(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onNavigate}
                className={`couple-dial-chip${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {moreOnly && (
          <p className="couple-dial-readout-hint" style={{ marginTop: "0.65rem" }}>
            Women · Men · Trans · Studio · Art of X stay in the top bar.
          </p>
        )}
      </div>

      {/* Screen-reader / keyboard list fallback */}
      <nav
        className="couple-dial-list-fallback"
        aria-label={moreOnly ? "More destinations" : "All destinations"}
      >
        <ul>
          {(moreOnly ? DIAL_MORE : [...DIAL_PRIMARY, ...DIAL_MORE]).map(
            (item) => (
              <li key={`list-${item.id}`}>
                <Link href={item.href} onClick={onNavigate}>
                  {item.label}
                </Link>
              </li>
            ),
          )}
        </ul>
      </nav>
    </div>
  );
}
