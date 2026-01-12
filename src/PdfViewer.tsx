import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  url: string;
}

function PdfViewer({ url }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const baseScaleRef = useRef(1);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const currentUrlRef = useRef<string>(url);

  // Custom scrollbar state
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);

  // Update scrollbar position
  const updateScrollbar = useCallback(() => {
    if (!scrollAreaRef.current) return;

    const scrollArea = scrollAreaRef.current;
    const scrollHeight = scrollArea.scrollHeight;
    const clientHeight = scrollArea.clientHeight;
    const scrollTop = scrollArea.scrollTop;

    // Calculate thumb size
    const thumbPercent = clientHeight / scrollHeight;
    const thumbPx = Math.max(thumbPercent * clientHeight, 40);
    setThumbHeight(thumbPx);

    // Calculate thumb position
    const maxScroll = scrollHeight - clientHeight;
    const scrollPercent = maxScroll > 0 ? scrollTop / maxScroll : 0;
    const maxThumbTop = clientHeight - thumbPx;
    setThumbTop(scrollPercent * maxThumbTop);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    // Track URL changes to invalidate cached PDF
    if (currentUrlRef.current !== url) {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
      currentUrlRef.current = url;
    }

    const renderPdf = async () => {
      if (!canvasRef.current || !containerRef.current) return;
      if (isCancelled) return;

      // Check container has valid dimensions
      const containerHeight = containerRef.current.clientHeight;
      const containerWidth = containerRef.current.clientWidth;
      if (containerHeight === 0 || containerWidth === 0) {
        // Container not ready, retry shortly
        if (!isCancelled) {
          setTimeout(renderPdf, 100);
        }
        return;
      }

      // Cancel any previous render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }

      if (isCancelled) return;

      try {
        // Load PDF document if not already loaded
        if (!pdfDocRef.current) {
          loadingTask = pdfjsLib.getDocument(url);
          const pdf = await loadingTask.promise;
          if (isCancelled) {
            pdf.destroy();
            return;
          }
          pdfDocRef.current = pdf;
          loadingTask = null;
        }

        if (isCancelled) return;

        const page = await pdfDocRef.current.getPage(1);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1 });

        // Scale PDF to fill full container height (no top/bottom gaps)
        const calculatedBaseScale = containerHeight / unscaledViewport.height;
        baseScaleRef.current = calculatedBaseScale;

        // Display scale - what the user sees
        const displayScale = calculatedBaseScale * zoom;

        // Render at 1.5x for crisp but not oversharpened text
        const deviceRatio = window.devicePixelRatio || 1;
        const outputScale = Math.max(1.5, deviceRatio);

        // Render viewport - PDF.js renders at this resolution
        const renderScale = displayScale * outputScale;
        const renderViewport = page.getViewport({ scale: renderScale });

        // Display viewport - used for CSS sizing
        const displayViewport = page.getViewport({ scale: displayScale });

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        // Get a fresh 2D context - this resets any transforms
        const context = canvas.getContext("2d", { alpha: false });
        if (!context || isCancelled) return;

        // Canvas internal size matches the high-res render
        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);

        // CSS size is the intended display size (browser downscales for us)
        canvas.style.width = `${displayViewport.width}px`;
        canvas.style.height = `${displayViewport.height}px`;

        // Reset canvas transform and clear with white background
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (isCancelled) return;

        // Render using the high-resolution viewport
        const renderTask = page.render({
          canvasContext: context,
          viewport: renderViewport,
          background: "white",
          canvas: canvas,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;

        if (isCancelled) return;

        // Center scroll horizontally if content overflows
        if (scrollAreaRef.current) {
          const scrollArea = scrollAreaRef.current;
          const scrollWidth = scrollArea.scrollWidth;
          const clientWidthNow = scrollArea.clientWidth;
          if (scrollWidth > clientWidthNow) {
            scrollArea.scrollLeft = (scrollWidth - clientWidthNow) / 2;
          }
        }

        // Update scrollbar after render
        updateScrollbar();
      } catch (error: unknown) {
        // Ignore cancellation errors
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name !== "RenderingCancelledException"
        ) {
          console.error("Error rendering PDF:", error);
        }
      }
    };

    // Small delay to ensure container is laid out
    const timeoutId = setTimeout(renderPdf, 50);

    const handleResize = () => {
      if (!isCancelled) {
        renderPdf();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);

      // Cancel any in-progress loading
      if (loadingTask) {
        loadingTask.destroy();
      }

      // Cancel any in-progress render
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore
        }
        renderTaskRef.current = null;
      }

      window.removeEventListener("resize", handleResize);
    };
  }, [url, zoom, updateScrollbar]);

  // Cleanup PDF document on unmount only
  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  // Listen for scroll events in the PDF area
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    scrollArea.addEventListener("scroll", updateScrollbar);
    return () => scrollArea.removeEventListener("scroll", updateScrollbar);
  }, [updateScrollbar]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 1));
  const handleReset = () => setZoom(1);

  // Custom scrollbar drag handling
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartScroll.current = scrollAreaRef.current?.scrollTop || 0;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !scrollAreaRef.current) return;

      const deltaY = e.clientY - dragStartY.current;
      const scrollArea = scrollAreaRef.current;
      const clientHeight = scrollArea.clientHeight;
      const scrollHeight = scrollArea.scrollHeight;
      const maxScroll = scrollHeight - clientHeight;
      const maxThumbTop = clientHeight - thumbHeight;

      const scrollDelta = (deltaY / maxThumbTop) * maxScroll;
      scrollArea.scrollTop = dragStartScroll.current + scrollDelta;
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
    if (e.target === thumbRef.current || !scrollAreaRef.current) return;

    const track = e.currentTarget;
    const trackRect = track.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;
    const scrollArea = scrollAreaRef.current;
    const clientHeight = scrollArea.clientHeight;
    const scrollHeight = scrollArea.scrollHeight;
    const maxScroll = scrollHeight - clientHeight;

    const clickPercent = clickY / clientHeight;
    scrollArea.scrollTop = clickPercent * maxScroll;
  };

  const showScrollbar = zoom > 1;

  return (
    <div ref={containerRef} className="pdf-container" data-zoom={zoom}>
      <div className="pdf-controls">
        <button onClick={handleZoomOut} className="pdf-control-btn">
          -
        </button>
        <span className="pdf-zoom-level">{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} className="pdf-control-btn">
          +
        </button>
        <button onClick={handleReset} className="pdf-control-btn pdf-reset-btn">
          Reset
        </button>
      </div>
      <div className="pdf-scroll-wrapper">
        <div ref={scrollAreaRef} className="pdf-scroll-area">
          <canvas ref={canvasRef} className="pdf-canvas" />
        </div>
        {showScrollbar && (
          <div className="pdf-scrollbar-track" onClick={handleTrackClick}>
            <div
              ref={thumbRef}
              className="pdf-scrollbar-thumb"
              style={{
                height: `${thumbHeight}px`,
                top: `${thumbTop}px`,
              }}
              onMouseDown={handleThumbMouseDown}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default PdfViewer;
