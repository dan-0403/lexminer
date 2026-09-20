import { useEffect, useMemo, useState } from "react";

import { ArrowUp } from "lucide-react";

import "../../styles/scroll-to-top.css";

const SHOW_BUTTON_AFTER = 400;

const RING_RADIUS = 24;

const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let animationFrameId = null;

    function updateScrollState() {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;

      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );

      const viewportHeight = window.innerHeight;

      const scrollableHeight = Math.max(documentHeight - viewportHeight, 0);

      const nextProgress =
        scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;

      setVisible(scrollTop > SHOW_BUTTON_AFTER);

      setScrollProgress(Math.min(Math.max(nextProgress, 0), 100));

      animationFrameId = null;
    }

    function handleScroll() {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateScrollState);
    }

    updateScrollState();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);

      window.removeEventListener("resize", handleScroll);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const progressOffset = useMemo(() => {
    return RING_CIRCUMFERENCE - (scrollProgress / 100) * RING_CIRCUMFERENCE;
  }, [scrollProgress]);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <button
      type="button"
      className={`scroll-top-button ${visible ? "scroll-top-visible" : ""}`}
      onClick={scrollToTop}
      aria-label={`Back to top. ${Math.round(scrollProgress)}% of page viewed.`}
      title="Back to top"
    >
      <svg
        className="scroll-top-progress-ring"
        viewBox="0 0 60 60"
        aria-hidden="true"
      >
        <circle
          className="scroll-top-progress-track"
          cx="30"
          cy="30"
          r={RING_RADIUS}
        />

        <circle
          className="scroll-top-progress-value"
          cx="30"
          cy="30"
          r={RING_RADIUS}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={progressOffset}
        />
      </svg>

      <span className="scroll-top-inner">
        <ArrowUp size={21} />
      </span>

      <span className="scroll-top-tooltip">{Math.round(scrollProgress)}%</span>
    </button>
  );
}
