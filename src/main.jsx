import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  Menu,
  MousePointer2,
  Move3D,
  SlidersHorizontal,
  X,
} from "lucide-react";
import "./styles.css";

const DEMO_URL = "/explorerapp/";

const imagePath = (name) => `/images/homw/${name}.png`;

const navLinks = [
  { label: "Experience", href: "#experience" },
  { label: "Process", href: "#process" },
  { label: "For Developers", href: "#audiences" },
  { label: "Demo", href: "#demo" },
];

const narrativeSteps = [
  {
    number: "01",
    eyebrow: "Explore",
    title: "Understand the complete development.",
    body:
      "Move beyond static plans. Discover the architecture, amenities, surroundings and available units inside one environment.",
    image: "exploreui",
    alt: "HOMW Explorer interface showing the development overview and project navigation.",
    icon: Building2,
    label: "Project overview",
    reverse: false,
  },
  {
    number: "02",
    eyebrow: "Experience",
    title: "Enter the space before construction is complete.",
    body:
      "Walk through the apartment, understand its proportions and experience different lighting conditions.",
    image: "customui",
    alt: "HOMW interior experience with customization controls visible beside the apartment scene.",
    icon: Move3D,
    label: "Live interior experience",
    reverse: true,
  },
  {
    number: "03",
    eyebrow: "Decide",
    title: "Turn exploration into confidence.",
    body:
      "Compare units, understand availability and move from interest to a clearer purchasing decision.",
    image: "selectui",
    alt: "HOMW unit selection interface showing building availability and filtering controls.",
    icon: SlidersHorizontal,
    label: "Unit decision system",
    reverse: false,
  },
];

const audienceCards = [
  {
    audience: "Developers",
    title: "Present the complete vision.",
    body:
      "Give the development a premium digital presence before every physical space is available.",
    icon: Building2,
  },
  {
    audience: "Sales Teams",
    title: "Sell with greater clarity.",
    body:
      "Guide buyers through units, availability, environments and key project information in one experience.",
    icon: MousePointer2,
  },
  {
    audience: "Buyers",
    title: "Decide with confidence.",
    body:
      "Understand the property, compare options and experience the future space before committing.",
    icon: Check,
  },
];

const demoCapabilities = [
  "Interactive development overview",
  "Unit exploration",
  "Interior experience",
  "Material and atmosphere customization",
];

const galleryItems = [
  {
    id: "ameni",
    label: "Amenities",
    image: "ameni",
    alt: "Architectural amenities context from the HOMW prototype environment.",
  },
  {
    id: "sou",
    label: "Surroundings",
    image: "sou",
    alt: "Surrounding urban context from the HOMW prototype environment.",
  },
  {
    id: "unit",
    label: "Unit view",
    image: "unit",
    alt: "Closer architectural unit view from the HOMW prototype environment.",
  },
];

function HomwIcon({ icon: Icon, className = "" }) {
  return <Icon className={className} size={20} strokeWidth={1.6} absoluteStrokeWidth aria-hidden="true" />;
}

function HomwButton({ children, href, variant = "primary", icon: Icon, onClick }) {
  const className = `homw-button homw-button-${variant}`;

  if (onClick) {
    return (
      <button className={className} type="button" onClick={onClick}>
        <span>{children}</span>
        {Icon && <Icon size={18} strokeWidth={1.7} absoluteStrokeWidth aria-hidden="true" />}
      </button>
    );
  }

  return (
    <a className={className} href={href}>
      <span>{children}</span>
      {Icon && <Icon size={18} strokeWidth={1.7} absoluteStrokeWidth aria-hidden="true" />}
    </a>
  );
}

function ContactModal({ open, onClose }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    details: "",
  });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const subject = `HOMW walkthrough request from ${form.name}`;
    const body = [
      "New HOMW walkthrough request",
      "",
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Company: ${form.company || "Not provided"}`,
      "",
      "Project details:",
      form.details,
    ].join("\n");

    window.location.href = `mailto:info@woehm.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus("sent");
    setMessage("Your email app is opening with the request ready to send.");
  }

  return (
    <div className="contact-modal-layer" role="presentation" onMouseDown={onClose}>
      <section
        className="contact-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="contact-modal-close" type="button" aria-label="Close contact form" onClick={onClose}>
          <X size={20} strokeWidth={1.7} absoluteStrokeWidth aria-hidden="true" />
        </button>
        <p className="contact-modal-kicker">Request a Walkthrough</p>
        <h2 id="contact-modal-title">See what HOMW can do for your development.</h2>
        <p className="contact-modal-lead">Tell us about your project. We'll arrange a private session.</p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Name <span>*</span>
            <input name="name" value={form.name} onChange={updateField} required autoFocus />
          </label>
          <label>
            Email <span>*</span>
            <input name="email" type="email" value={form.email} onChange={updateField} required />
          </label>
          <label>
            Company
            <input name="company" value={form.company} onChange={updateField} />
          </label>
          <label>
            Project details <span>*</span>
            <textarea name="details" value={form.details} onChange={updateField} required rows={5} />
          </label>
          {message && <p className={`contact-form-message ${status}`}>{message}</p>}
          <button className="contact-submit" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending..." : "Send request"}
          </button>
        </form>
      </section>
    </div>
  );
}

function StatusIndicator({ children }) {
  return (
    <span className="homw-status">
      <span aria-hidden="true" />
      {children}
    </span>
  );
}

function Wordmark() {
  return (
    <a className="wordmark" href="#top" aria-label="HOMW home">
      <img src="/logohomw-wordmark.png" alt="" aria-hidden="true" />
    </a>
  );
}

function useScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(".reveal"));

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.16 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

function Navigation() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;

      if (open) {
        setHidden(false);
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY < 24) {
        setHidden(false);
      } else if (currentScrollY > lastScrollY + 8) {
        setHidden(true);
      } else if (currentScrollY < lastScrollY - 8) {
        setHidden(false);
      }

      lastScrollY = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  return (
    <header className="site-header">
      <nav className={`nav homw-glass-secondary ${hidden ? "is-hidden" : ""}`} aria-label="Primary navigation">
        <Wordmark />

        <div className="nav-links">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="nav-actions">
          <a className="nav-demo" href={DEMO_URL}>
            <span>Launch Demo</span>
            <ArrowUpRight size={16} strokeWidth={1.8} absoluteStrokeWidth aria-hidden="true" />
          </a>
          <button
            className="homw-icon-button"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="mobile-menu homw-glass-secondary">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href={DEMO_URL} onClick={() => setOpen(false)}>
            Launch Demo
          </a>
        </div>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section className="hero-section" id="top">
      <img
        className="hero-image"
        src={imagePath("hero")}
        alt="Interactive visualization of a premium high-rise development within its urban context."
        loading="eager"
        fetchPriority="high"
      />
      <div className="hero-overlay" aria-hidden="true" />
      <div className="hero-content page-shell">
        <div className="hero-copy reveal">
          <p className="eyebrow">Digital Sales Infrastructure for Real Estate</p>
          <h1>See the property before it exists.</h1>
          <p className="hero-lead">
            HOMW transforms real estate developments into interactive sales experiences.
          </p>
          <div className="button-row">
            <HomwButton href={DEMO_URL} icon={ArrowUpRight}>
              Experience the Demo
            </HomwButton>
            <HomwButton href="#audiences" variant="glass">
              For Developers & Sales Teams
            </HomwButton>
          </div>
        </div>

        <a className="prototype-panel homw-glass-secondary" href={DEMO_URL}>
          <div>
            <p>HOMW Prototype 01</p>
            <StatusIndicator>Interactive demo available</StatusIndicator>
            <span>Explore the complete development.</span>
          </div>
          <ArrowUpRight size={20} strokeWidth={1.7} absoluteStrokeWidth aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function PropositionSection() {
  return (
    <section className="section proposition" id="experience">
      <div className="page-shell proposition-grid">
        <div className="section-copy reveal">
          <p className="eyebrow">A New Property Experience</p>
          <h2>Not another property website.</h2>
          <h3>A digital environment where buyers can explore, compare and decide.</h3>
          <p>
            HOMW brings the development, its surroundings, available units and interior
            experience into one interactive sales environment.
          </p>
        </div>

        <figure className="media-stack reveal">
          <img
            src={imagePath("home")}
            alt="Clean development overview from the HOMW prototype environment."
            loading="lazy"
          />
          <span className="homw-chip chip-top">Development overview</span>
          <span className="homw-chip chip-bottom is-live">Live project environment</span>
        </figure>
      </div>
    </section>
  );
}

function NarrativeStep({ step }) {
  const Icon = step.icon;

  return (
    <article className={`narrative-step ${step.reverse ? "reverse" : ""} reveal`}>
      <div className="narrative-copy">
        <span className="step-number">{step.number}</span>
        <p className="eyebrow">{step.eyebrow}</p>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="step-icon">
          <HomwIcon icon={Icon} />
          <span>{step.label}</span>
        </div>
      </div>
      <figure className="homw-media-frame narrative-media">
        <img src={imagePath(step.image)} alt={step.alt} loading="lazy" />
        <span className="homw-chip">{step.label}</span>
      </figure>
    </article>
  );
}

function ProcessSection() {
  return (
    <section className="section process-section" id="process">
      <div className="page-shell">
        <div className="section-intro reveal">
          <p className="eyebrow">Property Exploration Environment</p>
          <h2>From first understanding to a clearer decision.</h2>
        </div>
        <div className="narrative-list">
          {narrativeSteps.map((step) => (
            <NarrativeStep key={step.number} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AudienceCard({ card }) {
  const Icon = card.icon;

  return (
    <article className="audience-card reveal">
      <div className="audience-icon">
        <HomwIcon icon={Icon} />
      </div>
      <p>{card.audience}</p>
      <h3>{card.title}</h3>
      <span>{card.body}</span>
    </article>
  );
}

function AudienceSection() {
  return (
    <section className="light-section" id="audiences">
      <div className="page-shell">
        <div className="light-head reveal">
          <p className="eyebrow">Built for the Sales Process</p>
          <h2>One platform. Three perspectives.</h2>
        </div>
        <div className="audience-grid">
          {audienceCards.map((card) => (
            <AudienceCard key={card.audience} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ImageGallery() {
  const [selected, setSelected] = useState(galleryItems[2]);

  return (
    <div className="gallery" aria-label="Prototype supporting image gallery">
      <figure className="gallery-frame">
        <img src={imagePath(selected.image)} alt={selected.alt} loading="lazy" />
      </figure>
      <div className="gallery-controls" role="tablist" aria-label="Demo image views">
        {galleryItems.map((item) => (
          <button
            key={item.id}
            className={item.id === selected.id ? "selected" : ""}
            type="button"
            role="tab"
            aria-selected={item.id === selected.id}
            onClick={() => setSelected(item)}
          >
            <img src={imagePath(item.image)} alt="" loading="lazy" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DemoShowcase({ onContactOpen }) {
  return (
    <section className="section demo-section" id="demo">
      <div className="page-shell">
        <div className="demo-head reveal">
          <div>
            <p className="eyebrow">HOMW Prototype 01</p>
            <h2>A live demonstration of the future property sales experience.</h2>
          </div>
          <div>
            <p>
              Explore a complete development, discover available units, enter the
              apartment and personalize the space through one interactive environment.
            </p>
            <div className="button-row">
              <HomwButton href={DEMO_URL} icon={ArrowUpRight}>
                Launch Live Demo
              </HomwButton>
              <HomwButton variant="glass" onClick={onContactOpen}>
                Request a Private Walkthrough
              </HomwButton>
            </div>
          </div>
        </div>

        <div className="demo-showcase-grid reveal">
          <div className="demo-top-grid">
            <figure className="demo-main">
              <img src={imagePath("home")} alt="Main development overview from the HOMW prototype." loading="lazy" />
              <span className="homw-chip is-live">Demo environment available</span>
            </figure>
            <div className="demo-side-tiles">
              <figure className="demo-tile tile-map">
                <img src={imagePath("map")} alt="Nearby parks and location context in the HOMW prototype." loading="lazy" />
              </figure>
              <figure className="demo-tile tile-hall">
                <img src={imagePath("interiorhall")} alt="Interior living experience from the HOMW prototype." loading="lazy" />
              </figure>
            </div>
          </div>

          <div className="demo-bottom-grid">
            <aside className="demo-info homw-glass-primary">
              <p className="demo-info-kicker">HOMW Prototype 01</p>
              <h3>Interactive development overview.</h3>
              <ul>
                {demoCapabilities.map((item) => (
                  <li key={item}>
                    <Check size={17} strokeWidth={1.8} absoluteStrokeWidth aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <StatusIndicator>Demo environment available</StatusIndicator>
            </aside>

            <ImageGallery />
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onContactOpen }) {
  return (
    <section className="final-cta">
      <img
        src={imagePath("interiorbedroom")}
        alt="Calm premium bedroom interior from the HOMW prototype."
        loading="lazy"
      />
      <div className="final-overlay" aria-hidden="true" />
      <div className="final-content reveal">
        <h2>
          Real estate should not be presented as static information.
          <span>It should be experienced.</span>
        </h2>
        <div className="button-row">
          <HomwButton href={DEMO_URL} icon={ArrowRight}>
            Experience HOMW
          </HomwButton>
          <HomwButton variant="glass" onClick={onContactOpen}>
            Build a project with us
          </HomwButton>
        </div>
      </div>
    </section>
  );
}

function Footer({ onContactOpen }) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="page-shell footer-inner">
        <Wordmark />
        <div className="footer-links">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <button type="button" onClick={onContactOpen}>
            Contact
          </button>
        </div>
        <p>© {year} HOMW · Powered by Blueether</p>
      </div>
    </footer>
  );
}

function App() {
  useScrollReveal();
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="app">
      <Navigation />
      <main>
        <HeroSection />
        <PropositionSection />
        <ProcessSection />
        <AudienceSection />
        <DemoShowcase onContactOpen={() => setContactOpen(true)} />
        <FinalCTA onContactOpen={() => setContactOpen(true)} />
      </main>
      <Footer onContactOpen={() => setContactOpen(true)} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
