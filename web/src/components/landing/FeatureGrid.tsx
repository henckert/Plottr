'use client';

import Link from 'next/link';
import { MapPin, Ruler, ClipboardList, Calendar } from 'lucide-react';
import { ROUTES } from '@/config/app';

const features = [
  {
    icon: MapPin,
    title: 'Sites',
    description: 'Create a digital map of your facility.',
    href: ROUTES.SITES,
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Ruler,
    title: 'Layouts',
    description: 'Draw and arrange pitches or zones.',
    href: ROUTES.LAYOUTS,
    color: 'from-green-500 to-green-600',
  },
  {
    icon: ClipboardList,
    title: 'Templates',
    description: 'Start from ready-made field setups.',
    href: ROUTES.TEMPLATES,
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Calendar,
    title: 'Sessions',
    description: 'Plan training and events.',
    href: ROUTES.SESSIONS,
    color: 'from-orange-500 to-orange-600',
  },
];

export default function FeatureGrid() {
  return (
    <section className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
          Get Started
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Everything you need to plan, visualize, and share your field layouts
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Icon */}
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-6 h-6" />
              </div>
              
              {/* Content */}
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {feature.description}
              </p>
              
              {/* Hover indicator */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
