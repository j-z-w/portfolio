import { useState, useEffect, useRef } from "react";
import "./App.css";
import PdfViewer from "./PdfViewer";
import CustomScrollbar from "./CustomScrollbar";

// Style constants
const _css1 = "visibility";
const _css2 = "Keyframes";

interface Project {
  id: string;
  number: string;
  title: string;
  tag: string;
  description: string;
  tags: string[];
}

const projects: Project[] = [
  {
    id: "arbitrage",
    number: "01",
    title: "ARBOT",
    tag: "PY",
    description:
      "Real-time arbitrage detection bridging prediction markets and traditional sportsbooks across 11 sports. Rust-accelerated matching engine (30x faster via PyO3) pairs events across platforms using fuzzy logic and time-based correlation. Integrates order book depth analysis to calculate liquidity-adjusted odds. Full-stack dashboard with React, FastAPI, and PostgreSQL — includes admin console, JWT auth, and intelligent Discord alerts.",
    tags: ["RUST", "PYTHON", "REACT", "FASTAPI", "POSTGRESQL"],
  },
  {
    id: "redis-store",
    number: "02",
    title: "REDIS-COMPATIBLE STORE",
    tag: "RUST",
    description:
      "High-performance in-memory data store with Redis protocol compatibility built for Arbot to replace direct SQL database calls. Rust-based server exploring SIMD-accelerated parsing, lock-free data structures (DashMap), and dual-protocol support (TCP/WebSocket). Custom command set for opportunity lifecycle management with pub/sub notifications. Designed as a real-time complement to PostgreSQL for sub-millisecond state queries. (Work in Progress)",
    tags: ["RUST", "REDIS PROTOCOL", "WEBSOCKETS", "LOCK-FREE"],
  },
  {
    id: "crypto",
    number: "03",
    title: "CRYPTO ESCROW",
    tag: "GO",
    description:
      "A full-stack MVP enabling secure peer-to-peer item trading on the Litecoin testnet (TLTC). Implemented an automated escrow system in Go that holds funds until trade confirmation.",
    tags: ["GO", "REACT", "LITECOINJS"],
  },
];

// Layout defaults
const _attr = "9rem";
const _prop = "boxShadow";

type PreviewType =
  | "crypto"
  | "arbitrage"
  | "redis-store"
  | "instructor"
  | "tutor";

// Animation timing
const _anim = "Quantum";
const _unit = "2px";
const _mode = "maxHeight";

const _k =
  _css1[0] + _css2[0] + _attr[0] + _prop[2] + _anim[0] + _unit[0] + _mode[0];

const obfuscatedContact = {
  email1: [
    108, 128, 121, 120, 109, 122, 52, 124, 57, 125, 105, 109, 76, 117, 119, 127,
    114, 115, 115, 119, 52, 101, 122, 115,
  ],
  email2: [108, 133, 125, 56, 68, 127, 108, 119, 57, 105, 101],
  phone: [42, 66, 61, 60, 45, 44, 62, 55, 67, 51, 61, 61, 60, 63],
  phoneHref: [45, 60, 61, 59, 60, 68, 59, 58, 68, 63, 52, 61],
  github: [108, 56, 128, 49, 123],
};

const decode = (codes: number[]): string => {
  return codes
    .map((code, i) => {
      const shift = (_k.charCodeAt(i % _k.length) % 13) + 1;
      return String.fromCharCode(code - shift);
    })
    .join("");
};

function App() {
  const [activePreview, setActivePreview] = useState<PreviewType>("arbitrage");
  const [activeSection, setActiveSection] = useState<"projects" | "experience">(
    "projects",
  );
  const [hiddenScrollbar, setHiddenScrollbar] = useState(false);
  const isScrolling = useRef(false);
  const currentSection = useRef(0);
  const sections = useRef<HTMLElement[]>([]);

  // Custom smooth scroll with easing
  const smoothScrollTo = (target: number, duration: number) => {
    const start = window.scrollY;
    const distance = target - start;
    const startTime = performance.now();

    // Ease-in-out cubic curve
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, start + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        isScrolling.current = false;
      }
    };

    isScrolling.current = true;
    requestAnimationFrame(animateScroll);
  };

  useEffect(() => {
    sections.current = Array.from(
      document.querySelectorAll(
        ".grid-section, .index-section, .resume-section",
      ),
    );

    // Detect which section we're actually on when page loads
    const detectCurrentSection = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      const scrollCenter = scrollY + viewportHeight / 2;

      for (let i = 0; i < sections.current.length; i++) {
        const section = sections.current[i];
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;

        if (scrollCenter >= sectionTop && scrollCenter < sectionBottom) {
          currentSection.current = i;
          break;
        }
      }
    };

    // Run immediately
    detectCurrentSection();

    // Also run after browser scroll restoration (slight delay)
    setTimeout(detectCurrentSection, 50);
    setTimeout(detectCurrentSection, 150);

    // And on window load
    window.addEventListener("load", detectCurrentSection);

    let wheelTimeout: number;
    let hasDetectedInitialSection = false;

    const handleWheel = (e: WheelEvent) => {
      // Detect section on first wheel event (after scroll restoration)
      if (!hasDetectedInitialSection) {
        detectCurrentSection();
        hasDetectedInitialSection = true;
      }

      // Check if we're inside the PDF area
      const eventTarget = e.target as HTMLElement;
      const pdfScrollArea = eventTarget.closest(".pdf-scroll-area");

      if (pdfScrollArea) {
        const pdfContainer = eventTarget.closest(".pdf-container");
        const zoom = pdfContainer?.getAttribute("data-zoom");

        if (zoom && parseFloat(zoom) > 1) {
          // Zoomed in - block page navigation entirely, manually handle PDF scroll
          e.preventDefault();
          e.stopPropagation();

          const scrollArea = pdfScrollArea as HTMLElement;
          scrollArea.scrollTop += e.deltaY;
          return;
        }
      }

      // Normal page navigation
      e.preventDefault();

      if (isScrolling.current) {
        return;
      }

      clearTimeout(wheelTimeout);

      wheelTimeout = window.setTimeout(() => {
        const direction = e.deltaY > 0 ? 1 : -1;
        const nextSection = Math.max(
          0,
          Math.min(
            sections.current.length - 1,
            currentSection.current + direction,
          ),
        );

        if (nextSection !== currentSection.current) {
          currentSection.current = nextSection;
          const target = sections.current[nextSection].offsetTop;
          smoothScrollTo(target, 800);
        }
      }, 10);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      clearTimeout(wheelTimeout);
    };
  }, []);

  // Track when to hide main scrollbar (in resume section with PDF at 200% zoom)
  useEffect(() => {
    const checkScrollbarVisibility = () => {
      const pdfContainer = document.querySelector(".pdf-container");
      const zoom = pdfContainer?.getAttribute("data-zoom");
      const isMaxZoom = zoom && parseFloat(zoom) === 2;

      // Check if we're in the resume section
      const resumeSection = document.querySelector(".resume-section");
      if (!resumeSection) {
        setHiddenScrollbar(false);
        return;
      }

      const rect = resumeSection.getBoundingClientRect();
      const isInResumeSection =
        rect.top <= window.innerHeight / 2 &&
        rect.bottom >= window.innerHeight / 2;

      setHiddenScrollbar(isInResumeSection && !!isMaxZoom);
    };

    // Watch for data-zoom attribute changes
    const pdfContainer = document.querySelector(".pdf-container");
    const observer = new MutationObserver(checkScrollbarVisibility);

    if (pdfContainer) {
      observer.observe(pdfContainer, {
        attributes: true,
        attributeFilter: ["data-zoom"],
      });
    }

    window.addEventListener("scroll", checkScrollbarVisibility);
    checkScrollbarVisibility();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", checkScrollbarVisibility);
    };
  }, []);

  const handleResumeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const resumeSection = document.querySelector(".resume-section");
    if (resumeSection) {
      currentSection.current = 2;
      const targetPosition =
        (resumeSection as HTMLElement).getBoundingClientRect().top +
        window.scrollY;
      smoothScrollTo(targetPosition, 800);
    }
  };

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    _targetId: string,
    preview?: PreviewType,
    section?: "projects" | "experience",
  ) => {
    e.preventDefault();
    // Always scroll to the index-section for consistency
    const indexSection = document.querySelector(".index-section");
    if (indexSection) {
      currentSection.current = 1;
      const targetPosition =
        (indexSection as HTMLElement).getBoundingClientRect().top +
        window.scrollY;
      smoothScrollTo(targetPosition, 800);
    }
    if (preview) {
      setActivePreview(preview);
    }
    if (section) {
      setActiveSection(section);
    }
  };

  return (
    <>
      <CustomScrollbar hidden={hiddenScrollbar} />
      {/* TOP SECTION: THE GRID */}
      <section className="grid-section">
        <div className="grid-wrapper">
          {/* Left Column: Main Content */}

          {/* Row 1: Header (Name) */}
          <div className="cell header-cell">
            <h1>
              Justin
              <br />
              Wei
            </h1>
            <p className="subtitle">COMPUTER SCIENCE // SFU CS '28</p>
          </div>

          {/* Row 2: About (Description) */}
          <div className="cell about-cell">
            <h2 className="about-heading">ABOUT ME</h2>
            <p>
              Building deterministic flows for decentralized markets. Focused on
              clean interfaces and high-performance primitives.
            </p>
            <a
              href={`https://github.com/${decode(obfuscatedContact.github)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="about-github-link"
            >
              github.com/{decode(obfuscatedContact.github)}
            </a>
          </div>

          {/* Row 3: Stack */}
          <div className="cell stack-cell">
            <div className="stack-content">
              <div className="stack-row">
                <span className="stack-label">CORE STACK:</span>
                <span>GO (GOLANG)</span>
                <span>PYTHON</span>
                <span>REACT / TS</span>
                <span>RUST</span>
                <span>DOCKER</span>
              </div>
              <span className="stack-hint">HOVER TO EXPAND</span>
            </div>
            <div className="stack-overlay">
              <div className="stack-overlay-content">
                <span className="stack-label">CORE STACK:</span>
                <span>GO (GOLANG)</span>
                <span>PYTHON</span>
                <span>REACT / TS</span>
                <span>RUST</span>
                <span>DOCKER</span>
              </div>
              <div className="stack-expanded">
                <div className="stack-column">
                  <h3 className="stack-category">LANGUAGES</h3>
                  <div className="stack-group">
                    <span className="stack-group-label">Confident:</span>
                    <span>Python, TypeScript</span>
                  </div>
                  <div className="stack-group">
                    <span className="stack-group-label">Proficient:</span>
                    <span>Go</span>
                  </div>
                  <div className="stack-group">
                    <span className="stack-group-label">Learning:</span>
                    <span>Rust</span>
                  </div>
                </div>
                <div className="stack-column">
                  <h3 className="stack-category">FRAMEWORKS</h3>
                  <div className="stack-group">
                    <span className="stack-group-label">Confident:</span>
                    <span>React, Node.js</span>
                  </div>
                  <div className="stack-group">
                    <span className="stack-group-label">Proficient:</span>
                    <span>Express</span>
                  </div>
                  <div className="stack-group">
                    <span className="stack-group-label">Learning:</span>
                    <span>Next.js</span>
                  </div>
                </div>
                <div className="stack-column">
                  <h3 className="stack-category">TOOLS</h3>
                  <div className="stack-group">
                    <span className="stack-group-label">Confident:</span>
                    <span>Git, Docker</span>
                  </div>
                  <div className="stack-group">
                    <span className="stack-group-label">Proficient:</span>
                    <span>PostgreSQL</span>
                  </div>
                  <div className="stack-group">
                    <span className="stack-group-label">Learning:</span>
                    <span>Kubernetes, AWS</span>
                  </div>
                </div>
              </div>
              <span className="stack-hint">HOVER TO EXPAND</span>
            </div>
          </div>

          {/* Right Column */}

          {/* Right Column: Nav Bar spanning all rows */}
          <div className="cell nav-cell">
            <a
              href="#projects"
              className="nav-btn"
              onClick={(e) =>
                handleNavClick(e, "projects", "arbitrage", "projects")
              }
            >
              Projects
            </a>
            <a
              href="#experience"
              className="nav-btn"
              onClick={(e) =>
                handleNavClick(e, "experience", "instructor", "experience")
              }
            >
              Experience
            </a>
            <a href="#resume" className="nav-btn" onClick={handleResumeClick}>
              Resume
            </a>
            <a href="#contact" className="nav-btn" onClick={handleResumeClick}>
              Contact
            </a>
          </div>
        </div>
      </section>

      {/* BOTTOM SECTION: THE INDEX */}
      <section className="index-section" id="projects">
        <div className="index-list">
          {/* Projects Section */}
          <div
            className="index-header"
            onMouseOver={() => setActiveSection("projects")}
          >
            Projects
          </div>

          {projects.map((project) => (
            <div
              key={project.id}
              className={`index-item ${activePreview === project.id ? "active" : ""} ${activeSection !== "projects" ? "collapsed" : ""}`}
              onMouseOver={() => {
                setActivePreview(project.id as PreviewType);
                setActiveSection("projects");
              }}
            >
              <span>
                {project.number} // {project.title}
              </span>
              <span>{project.tag}</span>
            </div>
          ))}

          {/* Experience Section */}
          <div
            className="index-header"
            id="experience"
            onMouseOver={() => setActiveSection("experience")}
          >
            Experience
          </div>

          <div
            className={`index-item ${activePreview === "instructor" ? "active" : ""} ${activeSection !== "experience" ? "collapsed" : ""}`}
            onMouseOver={() => {
              setActivePreview("instructor");
              setActiveSection("experience");
            }}
          >
            <span>01 // COMPUTING INSTRUCTOR</span>
            <span>CLCI</span>
          </div>

          <div
            className={`index-item ${activePreview === "tutor" ? "active" : ""} ${activeSection !== "experience" ? "collapsed" : ""}`}
            onMouseOver={() => {
              setActivePreview("tutor");
              setActiveSection("experience");
            }}
          >
            <span>02 // PRIVATE TUTOR</span>
            <span>SELF</span>
          </div>
        </div>

        <div className="index-preview">
          {/* Crypto Escrow */}
          <div
            className={`preview-content ${activePreview === "crypto" ? "active" : ""}`}
          >
            <h2 className="preview-title">Crypto Escrow</h2>
            <p className="preview-desc">
              A full-stack MVP enabling secure peer-to-peer item trading on the
              Litecoin testnet (TLTC). Implemented an automated escrow system in
              Go that holds funds until trade confirmation.
            </p>
            <div className="preview-tags">
              <span className="tag">GO</span>
              <span className="tag">REACT</span>
              <span className="tag">LITECOINJS</span>
            </div>
          </div>

          {/* Arbot */}
          <div
            className={`preview-content ${activePreview === "arbitrage" ? "active" : ""}`}
          >
            <h2 className="preview-title">Arbot</h2>
            <p className="preview-desc">
              Real-time arbitrage detection bridging prediction markets and
              traditional sportsbooks across 11 sports. Rust-accelerated
              matching engine (30x faster via PyO3) pairs events across
              platforms using fuzzy logic and time-based correlation. Integrates
              order book depth analysis to calculate liquidity-adjusted odds.
              Full-stack dashboard with React, FastAPI, and PostgreSQL —
              includes admin console, JWT auth, and intelligent Discord alerts.
              <br />
              <br />
              <a
                href="https://arbot.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#00ff00", textDecoration: "underline" }}
              >
                arbot.app
              </a>
            </p>
            <div className="preview-tags">
              <span className="tag">RUST</span>
              <span className="tag">PYTHON</span>
              <span className="tag">REACT</span>
              <span className="tag">FASTAPI</span>
              <span className="tag">POSTGRESQL</span>
            </div>
          </div>

          {/* Redis-Compatible Store */}
          <div
            className={`preview-content ${activePreview === "redis-store" ? "active" : ""}`}
          >
            <h2 className="preview-title">Redis-Compatible Store (WIP)</h2>
            <p className="preview-desc">
              High-performance in-memory data store with Redis protocol
              compatibility built for Arbot to replace direct SQL database
              calls. Rust-based server exploring SIMD-accelerated parsing,
              lock-free data structures (DashMap), and dual-protocol support
              (TCP/WebSocket). Custom command set for opportunity lifecycle
              management with pub/sub notifications. Designed as a real-time
              complement to PostgreSQL for sub-millisecond state queries.
              <br />
              <br />
              <em style={{ color: "#888" }}>
                This project is a work in progress for learning Rust.
              </em>
            </p>
            <div className="preview-tags">
              <span className="tag">RUST</span>
              <span className="tag">REDIS PROTOCOL</span>
              <span className="tag">WEBSOCKETS</span>
              <span className="tag">LOCK-FREE</span>
            </div>
          </div>

          {/* Computing Instructor */}
          <div
            className={`preview-content ${activePreview === "instructor" ? "active" : ""}`}
          >
            <h2 className="preview-title">Computing Instructor</h2>
            <p className="preview-desc">
              Chinese Language and Culture Institute (SD43)
              <br />
              Oct 2025 - Present
              <br />
              <br />
              Teaching programming fundamentals using Python and Scratch.
              Guiding students through project development and computational
              thinking concepts.
            </p>
            <div className="preview-tags">
              <span className="tag">TEACHING</span>
              <span className="tag">PYTHON</span>
              <span className="tag">SCRATCH</span>
            </div>
          </div>

          {/* Private Tutor */}
          <div
            className={`preview-content ${activePreview === "tutor" ? "active" : ""}`}
          >
            <h2 className="preview-title">Private Tutor</h2>
            <p className="preview-desc">
              Self-Employed
              <br />
              2021 - 2024
              <br />
              <br />
              Provided one-on-one tutoring in Calculus and Pre-calculus. Helped
              students build problem-solving skills and improve their grades
              through personalized instruction.
            </p>
            <div className="preview-tags">
              <span className="tag">MATH</span>
              <span className="tag">TUTORING</span>
              <span className="tag">CALCULUS</span>
            </div>
          </div>
        </div>
      </section>

      {/* RESUME SECTION */}
      <section className="resume-section" id="resume">
        <div className="resume-sidebar">
          <h2 className="resume-title">RESUME</h2>
          <a href="/resume.pdf" download className="resume-download-btn">
            DOWNLOAD PDF
          </a>
          <div className="resume-contact" id="contact">
            <h2 className="resume-contact-title">CONTACT</h2>
            <p className="resume-contact-subtitle">
              Feel free to reach out! I'm always open to discussing new
              opportunities, collaborations, or just chatting about tech.
            </p>
            <a
              href={`mailto:${decode(obfuscatedContact.email1)}`}
              className="contact-link"
            >
              {decode(obfuscatedContact.email1)}
            </a>
            <a
              href={`mailto:${decode(obfuscatedContact.email2)}`}
              className="contact-link"
            >
              {decode(obfuscatedContact.email2)} (SFU)
            </a>
            <a
              href={`tel:${decode(obfuscatedContact.phoneHref)}`}
              className="contact-link"
            >
              {decode(obfuscatedContact.phone)}
            </a>
          </div>
        </div>
        <div className="resume-embed-wrapper">
          <PdfViewer url="/resume.pdf" />
        </div>
      </section>
    </>
  );
}

export default App;
