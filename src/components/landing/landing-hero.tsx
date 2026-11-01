"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./landing-hero.module.css";

/* Engines mirror src/lib/config/database.config.ts — real ports, real schemes. */
type Engine = {
  key: string;
  label: string;
  scheme: string;
  port: string;
  db: string;
};

const ENGINES: Engine[] = [
  { key: "postgresql", label: "PostgreSQL", scheme: "postgresql", port: "5432", db: "production" },
  { key: "mysql", label: "MySQL", scheme: "mysql", port: "3306", db: "app" },
  { key: "mongodb", label: "MongoDB", scheme: "mongodb", port: "27017", db: "records" },
  { key: "redis", label: "Redis", scheme: "redis", port: "6379", db: "0" },
  { key: "mariadb", label: "MariaDB", scheme: "mariadb", port: "3306", db: "shop" },
];

/* Ordered segments of a connection string, each with a caption that names its part. */
function buildSegments(engine: Engine) {
  return [
    { cls: styles.scheme, text: engine.scheme, caption: "scheme" },
    { cls: styles.punct, text: "://", caption: "" },
    { cls: styles.user, text: "admin", caption: "user" },
    { cls: styles.punct, text: ":", caption: "" },
    { cls: styles.secret, text: "••••••••", caption: "secret" },
    { cls: styles.punct, text: "@", caption: "" },
    { cls: styles.host, text: "db.orchard.internal", caption: "host" },
    { cls: styles.punct, text: ":", caption: "" },
    { cls: styles.port, text: engine.port, caption: "port" },
    { cls: styles.punct, text: "/", caption: "" },
    { cls: styles.dbname, text: engine.db, caption: "database" },
  ];
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function LandingHero() {
  const [engineIdx, setEngineIdx] = useState(0);
  const [typed, setTyped] = useState(0); // characters revealed
  const [live, setLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const engine = ENGINES[engineIdx];
  const segments = buildSegments(engine);
  const full = segments.map((s) => s.text).join("");

  // Type the string out one char at a time, then flip status to "live".
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCopied(false);

    if (prefersReducedMotion()) {
      setTyped(full.length);
      setLive(true);
      return;
    }

    setTyped(0);
    setLive(false);

    for (let i = 1; i <= full.length; i++) {
      timers.current.push(setTimeout(() => setTyped(i), i * 34));
    }
    timers.current.push(
      setTimeout(() => setLive(true), full.length * 34 + 450)
    );

    return () => timers.current.forEach(clearTimeout);
  }, [engineIdx, full]);

  // Render segments up to the typed cursor position.
  let remaining = typed;
  const done = typed >= full.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <div className={styles.brand}>
            <span className={styles.brandDot} aria-hidden />
            FlexiDB
          </div>
          <div className={styles.navRight}>
            <a
              className={`${styles.navLink} ${styles.navLinkHideSm}`}
              href="https://github.com/Flexidbio/flexidb"
            >
              GitHub
            </a>
            <Link className={styles.navLink} href="/auth/login">
              Sign in
            </Link>
          </div>
        </nav>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Self-hosted database control plane</p>
            <h1 className={styles.title}>
              Your databases.
              <span className={styles.titleMuted}>Your hardware.</span>
            </h1>
            <p className={styles.lede}>
              Provision Postgres, MySQL, MongoDB, Redis, and MariaDB on Docker
              you own. Pick an engine, get a connection string. No cloud bill, no
              lock-in.
            </p>
            <div className={styles.actions}>
              <Link href="/auth/signup" className={`${styles.btn} ${styles.btnPrimary}`}>
                Create account
              </Link>
              <Link href="/auth/login" className={`${styles.btn} ${styles.btnGhost}`}>
                Sign in
              </Link>
            </div>
          </div>

          <div className={styles.engines}>
            <p className={styles.enginesLabel}>Choose an engine</p>
            <div className={styles.chipRow} role="tablist" aria-label="Database engines">
              {ENGINES.map((e, i) => (
                <button
                  key={e.key}
                  role="tab"
                  aria-selected={i === engineIdx}
                  className={`${styles.chip} ${i === engineIdx ? styles.chipActive : ""}`}
                  onClick={() => setEngineIdx(i)}
                >
                  <span>{e.label}</span>
                  <span className={styles.chipPort}>:{e.port}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          className={styles.assembler}
          aria-label="Live connection string preview"
        >
          <div className={styles.assemblerBar}>
            <span className={styles.assemblerBarLeft}>connection string</span>
            <span
              className={`${styles.status} ${
                live ? styles.statusLive : styles.statusProvisioning
              }`}
            >
              <span className={styles.statusDot} aria-hidden />
              {live ? "live" : "provisioning"}
            </span>
          </div>

          <div className={styles.assemblerBody}>
            <div className={styles.stringRow}>
              {segments.map((seg, idx) => {
                if (remaining <= 0) return null;
                const shown = seg.text.slice(0, remaining);
                remaining -= seg.text.length;
                const isLastVisible = remaining <= 0 && !done;
                return (
                  <span key={idx} className={styles.seg}>
                    <span className={`${styles.segValue} ${seg.cls}`}>
                      {shown}
                      {isLastVisible && <span className={styles.cursor} aria-hidden />}
                    </span>
                    <span className={styles.segCaption}>
                      {shown.length >= seg.text.length ? seg.caption : ""}
                    </span>
                  </span>
                );
              })}
              {done && !live && <span className={styles.cursor} aria-hidden />}
            </div>

            <div className={styles.assemblerFoot}>
              <span className={styles.footNote}>
                {live ? (
                  <>
                    <b>{engine.label}</b> container ready · port {engine.port}{" "}
                    exposed
                  </>
                ) : (
                  <>starting {engine.label} container…</>
                )}
              </span>
              <button className={styles.copyBtn} onClick={handleCopy} disabled={!done}>
                {copied ? "copied" : "copy"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
