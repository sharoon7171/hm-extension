import type { ReactNode } from "react";
import { cardClasses } from "../../ui-classes/options";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  subtitle,
  children,
  className,
}: SectionCardProps) {
  const root = className ? `${cardClasses.root} ${className}` : cardClasses.root;
  return (
    <section className={root}>
      <header className={cardClasses.header}>
        <h2 className={cardClasses.title}>{title}</h2>
        {subtitle ? <p className={cardClasses.subtitle}>{subtitle}</p> : null}
      </header>
      <div className={cardClasses.body}>{children}</div>
    </section>
  );
}
