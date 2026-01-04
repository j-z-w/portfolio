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
  const pageRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

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

    const renderPdf = async () => {
      if (!canvasRef.current || !containerRef.current) return;

      // Cancel any previous render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (isCancelled) return;

        const page = await pdf.getPage(1);
        if (isCancelled) return;

        pageRef.current = page;

        const containerHeight = containerRef.current.clientHeight;
        const unscaledViewport = page.getViewport({ scale: 1 });

        // Base scale to fit container with padding
        const calculatedBaseScale =
          (containerHeight / unscaledViewport.height) * 0.96;
        baseScaleRef.current = calculatedBaseScale;

        const scale = calculatedBaseScale * zoom;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context || isCancelled) return;

        // Reset canvas and context before rendering
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.setTransform(1, 0, 0, 1, 0, 0);

        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        // Update scrollbar after render
        setTimeout(updateScrollbar, 50);
      } catch (error) {
        console.error("Error rendering PDF:", error);
      }
    };

    setTimeout(renderPdf, 50);

    const handleResize = () => setTimeout(renderPdf, 50);
    window.addEventListener("resize", handleResize);
    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [url, zoom, updateScrollbar]);

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
