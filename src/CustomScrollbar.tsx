import { useEffect, useRef, useState } from "react";

interface CustomScrollbarProps {
  hidden?: boolean;
}

function CustomScrollbar({ hidden = false }: CustomScrollbarProps) {
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLight, setIsLight] = useState(true);
  const [isEdge, setIsEdge] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);

  // Detect Edge browser on mount
  useEffect(() => {
    setIsEdge(navigator.userAgent.includes("Edg/"));
  }, []);

  useEffect(() => {
    const updateScrollbar = () => {
      const docHeight = document.documentElement.scrollHeight;
      const viewHeight = window.innerHeight;
      // Edge needs more offset due to rounded corner UI chrome
      const trackPadding = isEdge ? 10 : 4;
      const trackHeight = viewHeight - trackPadding;
      const scrollTop = window.scrollY;

      // Calculate thumb size as percentage of viewport
      const thumbPercent = viewHeight / docHeight;
      const thumbPx = Math.max(thumbPercent * trackHeight, 40); // Min 40px
      setThumbHeight(thumbPx);

      // Calculate thumb position
      const maxScroll = docHeight - viewHeight;
      const scrollPercent = maxScroll > 0 ? scrollTop / maxScroll : 0;
      const maxThumbTop = trackHeight - thumbPx;
      setThumbTop(scrollPercent * maxThumbTop);

      // Determine scrollbar color based on what percentage is over dark background
      const sections = document.querySelectorAll(
        ".grid-section, .index-section, .resume-section",
      );

      // Calculate thumb position in viewport
      const topPadding = isEdge ? 5 : 2;
      const thumbTopInViewport = thumbTop + topPadding;
      const thumbBottomInViewport = thumbTopInViewport + thumbPx;

      let darkPixels = 0;
      let lightPixels = 0;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const isSectionLight = section.classList.contains("grid-section");

        // Calculate overlap between thumb and this section
        const overlapTop = Math.max(thumbTopInViewport, rect.top);
        const overlapBottom = Math.min(thumbBottomInViewport, rect.bottom);
        const overlap = Math.max(0, overlapBottom - overlapTop);

        if (isSectionLight) {
          lightPixels += overlap;
        } else {
          darkPixels += overlap;
        }
      });

      // If more than 50% is over dark, use light scrollbar
      const totalOverlap = darkPixels + lightPixels;
      if (totalOverlap > 0) {
        setIsLight(darkPixels / totalOverlap > 0.5);
      }
    };

    updateScrollbar();
    window.addEventListener("scroll", updateScrollbar);
    window.addEventListener("resize", updateScrollbar);

    return () => {
      window.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateScrollbar);
    };
  }, [isEdge]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartScroll.current = window.scrollY;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = e.clientY - dragStartY.current;
      const docHeight = document.documentElement.scrollHeight;
      const viewHeight = window.innerHeight;
      const maxScroll = docHeight - viewHeight;
      const maxThumbTop = viewHeight - thumbHeight;

      const scrollDelta = (deltaY / maxThumbTop) * maxScroll;
      window.scrollTo(0, dragStartScroll.current + scrollDelta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, thumbHeight]);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target === thumbRef.current) return;

    const trackRect = trackRef.current?.getBoundingClientRect();
    if (!trackRect) return;

    const clickY = e.clientY - trackRect.top;
    const viewHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const maxScroll = docHeight - viewHeight;

    const clickPercent = clickY / viewHeight;
    window.scrollTo(0, clickPercent * maxScroll);
  };

  if (hidden) {
    return null;
  }

  return (
    <div
      ref={trackRef}
      className={`custom-scrollbar-track ${isEdge ? "edge-offset" : ""}`}
      onClick={handleTrackClick}
    >
      <div
        ref={thumbRef}
        className={`custom-scrollbar-thumb ${isLight ? "on-light" : "on-dark"}`}
        style={{
          height: `${thumbHeight}px`,
          top: `${thumbTop}px`,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

export default CustomScrollbar;
