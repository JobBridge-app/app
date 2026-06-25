import type { ReactNode } from "react";

type LegalHeroProps = {
  title: string;
  description?: ReactNode;
};

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

type LegalPanelProps = {
  title: string;
  children: ReactNode;
};

type LegalRowProps = {
  label: string;
  children: ReactNode;
};

export function LegalHero({ title, description }: LegalHeroProps) {
  return (
    <header className="not-prose legal-hero">
      <h1>{title}</h1>
      {description && <div className="legal-hero-copy">{description}</div>}
    </header>
  );
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="legal-section">
      <header className="not-prose legal-section-heading">
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

export function LegalPanel({ title, children }: LegalPanelProps) {
  return (
    <section className="not-prose legal-panel">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

export function LegalRow({ label, children }: LegalRowProps) {
  return (
    <div className="not-prose legal-row">
      <p>{label}</p>
      <div>{children}</div>
    </div>
  );
}

export function LegalStamp({ children }: { children: ReactNode }) {
  return <div className="not-prose legal-stamp">{children}</div>;
}
