import { useState } from "react";
import {
  X,
  Check,
  BookOpen,
  GitBranch,
  Flag,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  Network,
  Scale,
  FileCheck2,
  Factory,
  Microscope,
  Target,
  Eye,
} from "lucide-react";
import { STUDIO_NAME, STUDIO_HOME } from "../constants/branding";
import useInViewOnce from "../hooks/useInViewOnce";
import BrandLogo from "./shared/BrandLogo";

// Public-safe summary of the SRG – Symmetra Systems Design Studio brief
// (docs/product-specs/about-symmetra.md). No people, funding, internal dates or
// unvalidated targets belong on this page.

const NAV_LINKS = [
  { id: "about", label: "About" },
  { id: "goals", label: "Goals" },
  { id: "principles", label: "Principles" },
  { id: "copilot", label: "Co-pilot" },
  { id: "next", label: "Next" },
];

const GLOSSARY = [
  { term: "SWOT", definition: "Strengths, Weaknesses, Opportunities, and Threats — a framework for strategic analysis." },
  { term: "SDG", definition: "Sustainable Development Goals — 17 global goals adopted by the United Nations for 2030." },
  { term: "BMC", definition: "Expanded Business Model Canvas — an 11-block template describing how a business creates value, including social and environmental impact." },
  { term: "DTM", definition: "Dilemma Triangle Method — a People–Planet–Prosperity framework for surfacing and ranking strategic trade-offs in SDG-aligned planning." },
  { term: "Decision allocation", definition: "A recommendation of how decision work is divided between people and AI: AI-led, AI-supported or human-led." },
  { term: "Decision authority", definition: "The formally delegated power to approve a change. It always stays with the organisation, never with the tool." },
];

const GLOSSARY_PREVIEW_COUNT = 3;

const ABOUT_CARDS = [
  {
    title: "From research to practice",
    text: "We turn SRG research in systems engineering, connected engineering knowledge and human–AI decision-making into tools that organisations can try, question and evaluate.",
  },
  {
    title: "Built around real decisions",
    text: "We focus on the moments where engineering and business decisions are hard to trace, justify or hand over — and where better structure makes a difference.",
  },
  {
    title: "Open about what is proven",
    text: "Each tool starts as a decision-support prototype. We say clearly what has been demonstrated and what is still being validated.",
  },
];

const GOAL_CARDS = [
  {
    title: "Trace the consequences of change",
    text: "Connect engineering knowledge so the assets, processes and dependencies a change affects can be found, not guessed.",
    Icon: Network,
  },
  {
    title: "Make human–AI roles explicit",
    text: "Recommend whether a decision should be AI-led, AI-supported or human-led, and show the reasoning behind the recommendation.",
    Icon: Scale,
  },
  {
    title: "Keep a defensible record",
    text: "Capture the evidence, assumptions, rationale and approval status behind every recommendation in one place.",
    Icon: FileCheck2,
  },
  {
    title: "Validate with industry",
    text: "Shape and test each tool with the people who will use it before making any claim about its value.",
    Icon: Factory,
  },
];

const OUR_TOOLS_DO = [
  "Show their sources, assumptions, missing data and uncertainty",
  "Recommend who should decide, with the reasoning visible",
  "Let people confirm, correct or override every recommendation",
  "Keep a record of evidence, rationale and reviewer status",
];

const OUR_TOOLS_NEVER = [
  "Approve a change on their own",
  "Replace an organisation's own approval rules",
  "Connect to live industrial control systems",
  "Present illustrative estimates as benchmarked results",
];

const COPILOT_STEPS = [
  {
    title: "Story",
    text: "Share your idea and who you serve — type or speak — to ground everything that follows.",
    Icon: BookOpen,
  },
  {
    title: "Focus & tensions",
    text: "Four specialist agents help you clarify drivers, issues and trade-offs so goals don't silently conflict.",
    Icon: GitBranch,
  },
  {
    title: "Evidence & plan",
    text: "Review the evidence the plan will use, then get a SWOT, canvas and SDG-aligned plan you can refine and export.",
    Icon: Flag,
  },
];

const CHANGE_IMPACT_POINTS = [
  { text: "Show what an engineering change affects across assets and processes", Icon: Target },
  { text: "Recommend who should decide, and keep that separate from who may approve", Icon: Scale },
  { text: "Keep the evidence and approval record together in one exportable case", Icon: Eye },
];

function aboutClass(inView, extra = "") {
  return ["entry-about", extra, inView ? "entry-about--visible" : ""]
    .filter(Boolean)
    .join(" ");
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

function SectionIntro({ id, pill, title, sub }) {
  return (
    <div className="entry-about__intro">
      <span className="entry-pill entry-reveal" style={{ "--entry-stagger": 0 }}>{pill}</span>
      <h2 id={`${id}-heading`} className="entry-about__title entry-reveal" style={{ "--entry-stagger": 1 }}>
        {title}
      </h2>
      <p className="entry-about__sub entry-reveal" style={{ "--entry-stagger": 2 }}>
        {sub}
      </p>
    </div>
  );
}

function IconCard({ title, text, Icon, index }) {
  return (
    <article
      className="entry-glass-card entry-glass-card--value entry-reveal"
      style={{ "--entry-stagger": index + 3 }}
    >
      <div className="entry-glass-card__icon" aria-hidden="true">
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <h3 className="entry-glass-card__title">{title}</h3>
      <p className="entry-glass-card__text">{text}</p>
    </article>
  );
}

export default function OnboardingScreen({
  onStartCreating,
  onTakeTour,
  savedPlansCount = 0,
  onViewSavedPlans,
}) {
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [glossaryExpanded, setGlossaryExpanded] = useState(false);
  const [aboutRef, aboutInView] = useInViewOnce();
  const [goalsRef, goalsInView] = useInViewOnce();
  const [principlesRef, principlesInView] = useInViewOnce();
  const [copilotRef, copilotInView] = useInViewOnce();
  const [nextRef, nextInView] = useInViewOnce();

  function handleStartCreating() {
    setButtonsDisabled(true);
    onStartCreating();
  }

  const visibleGlossary = glossaryExpanded ? GLOSSARY : GLOSSARY.slice(0, GLOSSARY_PREVIEW_COUNT);
  const disabledStyle = {
    opacity: buttonsDisabled ? 0.5 : 1,
    cursor: buttonsDisabled ? "not-allowed" : "pointer",
  };

  return (
    <div className="entry-screen entry-screen--wide entry-screen--hero">
      <main className="entry-shell entry-shell--hero animate-fade-in" aria-label="About Symmetra Systems">
        <header className="entry-nav entry-nav--moc">
          <div className="entry-nav__brand">
            <BrandLogo height={36} />
          </div>

          <nav className="entry-nav__pill" aria-label="Page sections">
            {NAV_LINKS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className="entry-nav__link"
                onClick={() => scrollToSection(id)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="entry-nav__link entry-nav__link--tour"
              onClick={onTakeTour}
              disabled={buttonsDisabled}
              style={disabledStyle}
            >
              Tour
            </button>
          </nav>

          <button
            type="button"
            className="btn-primary entry-nav__cta"
            onClick={handleStartCreating}
            disabled={buttonsDisabled}
            style={disabledStyle}
          >
            Start creating
            <ArrowUpRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </header>

        <section className="entry-hero" aria-labelledby="entry-hero-headline">
          <p className="entry-hero__brand">{STUDIO_NAME}</p>
          <h1 id="entry-hero-headline" className="entry-hero__headline">
            Decisions people can understand, trust and defend.
          </h1>
          <p className="entry-hero__support">
            Symmetra Systems turns systems-engineering research from the Systems Realization Group
            at Cranfield University into decision-support tools that keep people in charge.
          </p>
          <nav className="entry-hero__cta" aria-label="Getting started">
            <button
              type="button"
              className="btn-primary entry-hero__primary"
              onClick={handleStartCreating}
              disabled={buttonsDisabled}
              style={disabledStyle}
            >
              Start the business plan co-pilot
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="entry-hero__secondary"
              onClick={onTakeTour}
              disabled={buttonsDisabled}
              style={disabledStyle}
            >
              Take a tour
            </button>
          </nav>
        </section>

        <section id="about" ref={aboutRef} className={aboutClass(aboutInView)} aria-labelledby="about-heading">
          <SectionIntro
            id="about"
            pill="About"
            title="Who we are"
            sub="The SRG – Symmetra Systems Design Studio works with engineering, manufacturing and process-industry organisations on decisions that need to be traceable and accountable."
          />
          <div className="entry-about__grid">
            {ABOUT_CARDS.map(({ title, text }, index) => (
              <article key={title} className="entry-glass-card entry-reveal" style={{ "--entry-stagger": index + 3 }}>
                <h3 className="entry-glass-card__title">{title}</h3>
                <p className="entry-glass-card__text">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="goals"
          ref={goalsRef}
          className={aboutClass(goalsInView, "entry-about--values")}
          aria-labelledby="goals-heading"
        >
          <SectionIntro
            id="goals"
            pill="Our goals"
            title="What we are working towards"
            sub="Helping organisations understand what a change affects, identify who should decide, and keep a defensible record of the evidence and approval."
          />
          <div className="entry-values__grid">
            {GOAL_CARDS.map((card, index) => (
              <IconCard key={card.title} {...card} index={index} />
            ))}
          </div>
        </section>

        <section
          id="principles"
          ref={principlesRef}
          className={aboutClass(principlesInView, "entry-about--why")}
          aria-labelledby="principles-heading"
        >
          <SectionIntro
            id="principles"
            pill="How we work"
            title="Decision support, not autonomous approval"
            sub="Our tools recommend how decision work is divided between people and AI. The authority to approve always stays with the organisation."
          />
          <div className="entry-why__grid">
            <article
              className="entry-why-card entry-why-card--highlight entry-reveal"
              style={{ "--entry-stagger": 3 }}
            >
              <h3 className="entry-why-card__title">Our tools always</h3>
              <ul className="entry-why-card__list">
                {OUR_TOOLS_DO.map((item) => (
                  <li key={item}>
                    <span className="entry-why-card__mark entry-why-card__mark--good" aria-hidden="true">
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="entry-why-card entry-reveal" style={{ "--entry-stagger": 4 }}>
              <h3 className="entry-why-card__title">Our tools never</h3>
              <ul className="entry-why-card__list">
                {OUR_TOOLS_NEVER.map((item) => (
                  <li key={item}>
                    <span className="entry-why-card__mark entry-why-card__mark--bad" aria-hidden="true">
                      <X size={14} strokeWidth={2.5} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section
          id="copilot"
          ref={copilotRef}
          className={aboutClass(copilotInView, "entry-about--process")}
          aria-labelledby="copilot-heading"
        >
          <SectionIntro
            id="copilot"
            pill="Available now"
            title="Business Plan Co-Pilot"
            sub="Co-create an SDG-aligned business model in about 30 minutes. A guided ten-step path, specialist AI agents, and evidence you review before the plan is written — you approve every step."
          />
          <div className="entry-about__grid">
            {COPILOT_STEPS.map((card, index) => (
              <IconCard key={card.title} {...card} index={index} />
            ))}
          </div>
          <div className="entry-section-cta entry-reveal" style={{ "--entry-stagger": 6 }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleStartCreating}
              disabled={buttonsDisabled}
              style={disabledStyle}
            >
              Start creating
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section
          id="next"
          ref={nextRef}
          className={aboutClass(nextInView, "entry-about--next")}
          aria-labelledby="next-heading"
        >
          <SectionIntro
            id="next"
            pill="In development"
            title="Symmetra Change Impact"
            sub="Understand what an engineering change affects, identify who should decide, and retain a defensible record of the evidence and approval."
          />
          <article className="entry-glass-card entry-next-card entry-reveal" style={{ "--entry-stagger": 3 }}>
            <div className="entry-next-card__status">
              <Microscope size={16} aria-hidden="true" />
              Early-stage decision-support prototype — not yet available
            </div>
            <ul className="entry-next-card__list">
              {CHANGE_IMPACT_POINTS.map(({ text, Icon }) => (
                <li key={text}>
                  <span className="entry-glass-card__icon entry-next-card__icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <p className="entry-next-card__note">
              Management of Change in asset-intensive and process industries is the first area we are exploring.
              Demonstrations use synthetic or authorised data only.
            </p>
          </article>
        </section>

        <section className="entry-glossary entry-glossary--quiet" aria-labelledby="glossary-heading">
          <h2 id="glossary-heading" className="entry-about__title entry-about__title--sm">
            Key terms
          </h2>
          {savedPlansCount > 0 && onViewSavedPlans && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10 }}>
                You have {savedPlansCount} saved plan{savedPlansCount === 1 ? "" : "s"} in this browser.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={onViewSavedPlans}
                style={{ fontSize: 13 }}
              >
                View saved plans
              </button>
            </div>
          )}
          <div className="entry-glossary__list">
            {visibleGlossary.map(({ term, definition }) => (
              <div key={term} className="entry-glossary__row">
                <span className="entry-glossary__term">{term}</span>
                <p className="entry-glossary__def">{definition}</p>
              </div>
            ))}
            {GLOSSARY.length > GLOSSARY_PREVIEW_COUNT && (
              <button
                type="button"
                className="entry-glossary__toggle"
                onClick={() => setGlossaryExpanded((v) => !v)}
                aria-expanded={glossaryExpanded}
                aria-label={glossaryExpanded ? "Show fewer glossary terms" : "Show all glossary terms"}
              >
                {glossaryExpanded ? "Show fewer" : "Show all glossary"}
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  style={{ transform: glossaryExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                />
              </button>
            )}
          </div>
        </section>

        <footer className="entry-footer">
          <BrandLogo variant="mark" height={28} decorative />
          <span>{STUDIO_NAME} · {STUDIO_HOME}</span>
        </footer>
      </main>
    </div>
  );
}
