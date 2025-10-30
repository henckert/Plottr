/**
 * FeatureCards - Animated feature section cards
 * Elevated cards with gradient accents, hover effects, and accessibility
 */

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, ClipboardList, CalendarDays, ChevronRight } from "lucide-react";

type CardDef = {
  title: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  accentFrom: string;
  accentTo: string;
  testId: string;
  badge?: string;
};

const CARDS: CardDef[] = [
  {
    title: "Workbench",
    desc: "Create a new plan or resume one.",
    href: "/workbench",
    icon: MapPin,
    accentFrom: "from-sky-400/20",
    accentTo: "to-blue-600/20",
    testId: "card-workbench",
  },
  {
    title: "Templates",
    desc: "Start with ready-made setups.",
    href: "/templates",
    icon: ClipboardList,
    accentFrom: "from-fuchsia-400/20",
    accentTo: "to-violet-600/20",
    testId: "card-templates",
  },
  {
    title: "Sessions",
    desc: "Plan training and events.",
    href: "/sessions",
    icon: CalendarDays,
    accentFrom: "from-amber-400/20",
    accentTo: "to-orange-600/20",
    testId: "card-sessions",
    badge: "New",
  },
];

export default function FeatureCards() {
  return (
    <section
      aria-labelledby="features-heading"
      className="relative isolate"
    >
      {/* Curved divider to blend hero → cards */}
      <div className="pointer-events-none absolute -top-10 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-black/10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <h2 id="features-heading" className="sr-only">Key sections</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {CARDS.map((c, i) => (
            <Card key={c.title} def={c} delay={i * 0.05} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ def, delay }: { def: CardDef; delay: number }) {
  const Icon = def.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.35, delay }}
    >
      <Link
        href={def.href}
        data-testid={def.testId}
        className={[
          "group relative block rounded-2xl border border-white/10",
          "bg-gradient-to-br from-slate-900/70 to-slate-900/30",
          "shadow-[0_8px_40px_-12px_rgba(0,0,0,0.45)]",
          "hover:shadow-[0_16px_50px_-12px_rgba(0,0,0,0.6)]",
          "ring-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
          "p-5 md:p-6 min-h-[150px]",
          "transition-all duration-300",
          "hover:-translate-y-1",
        ].join(" ")}
      >
        {/* Accent glow */}
        <div 
          className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${def.accentFrom} ${def.accentTo} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} 
        />

        <div className="relative z-10 flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-white/10 p-3 backdrop-blur group-hover:bg-white/15 transition-colors">
            <Icon className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{def.title}</h3>
              {def.badge && (
                <span className="inline-flex items-center rounded-full bg-sky-400/20 px-2 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-inset ring-sky-400/30">
                  {def.badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-white/70 group-hover:text-white/85 transition-colors">
              {def.desc}
            </p>
          </div>
          <ChevronRight 
            className="h-5 w-5 text-white/70 mt-1 group-hover:translate-x-0.5 group-hover:text-white/90 transition-all" 
            aria-hidden="true" 
          />
        </div>

        {/* Bottom underline on hover */}
        <div className="relative z-10 mt-4 h-px bg-white/10 group-hover:bg-white/20 transition-colors" />
      </Link>
    </motion.div>
  );
}
