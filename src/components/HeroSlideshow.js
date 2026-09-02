"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./HeroSlideshow.module.css";

function Chevron({ dir }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

export default function HeroSlideshow({ images, children, interval = 6000 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  const count = images.length;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const go = useCallback((i) => setIndex(i), []);

  useEffect(() => {
    if (paused || count < 2) return undefined;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;
    timer.current = setInterval(next, interval);
    return () => clearInterval(timer.current);
  }, [next, paused, count, interval]);

  return (
    <div
      className={styles.slideshow}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured community"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.slides}>
        {images.map((img, i) => (
          <div
            key={img.src}
            className={i === index ? `${styles.slide} ${styles.slideActive}` : styles.slide}
            aria-hidden={i !== index}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="100vw"
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
              className={styles.img}
            />
          </div>
        ))}
      </div>
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.content}>{children}</div>

      {count > 1 && (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowLeft}`}
            onClick={prev}
            aria-label="Previous slide"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowRight}`}
            onClick={next}
            aria-label="Next slide"
          >
            <Chevron dir="right" />
          </button>
          <div className={styles.dots}>
            {images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                className={i === index ? `${styles.dot} ${styles.dotActive}` : styles.dot}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}