'use client';

import { Pencil, Users, Share2 } from 'lucide-react';

const valueProps = [
  {
    icon: Pencil,
    title: 'Draw & Label Fields',
    description: 'Trace boundaries in seconds.',
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: Users,
    title: 'Organize Events',
    description: 'Assign pitches, teams, and times.',
    color: 'text-green-600 dark:text-green-400',
  },
  {
    icon: Share2,
    title: 'Share Instantly',
    description: 'One link for coaches and parents.',
    color: 'text-purple-600 dark:text-purple-400',
  },
];

export default function ValueProps() {
  return (
    <section className="relative py-16 rounded-3xl overflow-hidden">
      {/* Diagonal gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-blue-400" />
      
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-grid-white [mask-image:linear-gradient(0deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]" />
      
      <div className="relative max-w-5xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          Why Teams Love PlotIQ
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {valueProps.map((prop, index) => {
            const Icon = prop.icon;
            return (
              <div
                key={prop.title}
                className="flex flex-col items-center text-center space-y-4 motion-safe:animate-fade-in-up"
                style={{
                  animationDelay: `${index * 150}ms`,
                }}
              >
                {/* Icon container */}
                <div className="relative">
                  <div className={`p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg ${prop.color}`}>
                    <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  
                  {/* Decorative circle */}
                  <div className="absolute -inset-2 rounded-full bg-white/20 opacity-30 blur-xl -z-10" />
                </div>
                
                {/* Text */}
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    {prop.title}
                  </h3>
                  <p className="text-blue-100">
                    {prop.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (prefers-reduced-motion: no-preference) {
          .motion-safe\\:animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out both;
          }
        }
        
        .bg-grid-white {
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>
    </section>
  );
}
