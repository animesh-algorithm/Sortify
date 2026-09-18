"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Enhances server-rendered content; all content remains visible without JavaScript. */
export default function MarketingMotion({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (preference.matches) return;
      const animations = new Set<Animation>();
      const targets = element.querySelectorAll<HTMLElement>(
        "section h2, section > p, section article, [data-reveal], section details",
      );
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const index = Array.from(
              entry.target.parentElement?.children ?? [],
            ).indexOf(entry.target);
            // Do not fade initial-viewport content or delay its LCP paint.
            if (
              entry.boundingClientRect.top < innerHeight &&
              window.scrollY === 0
            ) {
              observer.unobserve(entry.target);
              continue;
            }
            const animation = entry.target.animate(
              [
                { opacity: 0, translate: "0 42px" },
                { opacity: 1, translate: "0 0" },
              ],
              {
                duration: 850,
                delay: Math.min(index * 75, 300),
                easing: "cubic-bezier(.16,1,.3,1)",
                fill: "backwards",
              },
            );
            animations.add(animation);
            animation.addEventListener(
              "finish",
              () => animations.delete(animation),
              { once: true },
            );
            observer.unobserve(entry.target);
          }
        },
        { threshold: 0.12 },
      );
      targets.forEach((target) => observer.observe(target));
      const parallaxTargets =
        element.querySelectorAll<HTMLElement>("[data-parallax]");
      let frame = 0;
      const update = () => {
        frame = 0;
        parallaxTargets.forEach((target) => {
          const rect = target.parentElement!.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > innerHeight) return;
          const offset = Math.max(
            -28,
            Math.min(
              28,
              (innerHeight / 2 - rect.top - rect.height / 2) * 0.055,
            ),
          );
          target.style.setProperty("--drift", `${offset}px`);
        });
      };
      const scroll = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      window.addEventListener("scroll", scroll, { passive: true });
      update();
      dispose = () => {
        observer.disconnect();
        animations.forEach((animation) => animation.cancel());
        window.removeEventListener("scroll", scroll);
        cancelAnimationFrame(frame);
        parallaxTargets.forEach((target) =>
          target.style.removeProperty("--drift"),
        );
      };
    };
    setup();
    preference.addEventListener("change", setup);
    return () => {
      dispose();
      preference.removeEventListener("change", setup);
    };
  }, []);
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
