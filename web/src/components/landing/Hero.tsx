'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Play } from 'lucide-react';
import { SITE_NAME, SITE_TAGLINE, ROUTES } from '@/config/app';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Diagonal gradient background - navy to light blue */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-blue-400" />
      
      {/* Subtle globe outline */}
      <div className="absolute inset-0 opacity-10">
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"
          viewBox="0 0 800 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Globe circle */}
          <circle
            cx="400"
            cy="400"
            r="350"
            stroke="white"
            strokeWidth="2"
            fill="none"
            opacity="0.3"
          />
          
          {/* Latitude lines */}
          <ellipse cx="400" cy="400" rx="350" ry="100" stroke="white" strokeWidth="1" fill="none" opacity="0.2" />
          <ellipse cx="400" cy="400" rx="350" ry="200" stroke="white" strokeWidth="1" fill="none" opacity="0.2" />
          <ellipse cx="400" cy="400" rx="350" ry="280" stroke="white" strokeWidth="1" fill="none" opacity="0.2" />
          
          {/* Longitude lines */}
          <ellipse cx="400" cy="400" rx="100" ry="350" stroke="white" strokeWidth="1" fill="none" opacity="0.2" />
          <ellipse cx="400" cy="400" rx="200" ry="350" stroke="white" strokeWidth="1" fill="none" opacity="0.2" />
          <ellipse cx="400" cy="400" rx="280" ry="350" stroke="white" strokeWidth="1" fill="none" opacity="0.2" />
          
          {/* Equator */}
          <line x1="50" y1="400" x2="750" y2="400" stroke="white" strokeWidth="1.5" opacity="0.3" />
          
          {/* Prime meridian */}
          <line x1="400" y1="50" x2="400" y2="750" stroke="white" strokeWidth="1.5" opacity="0.3" />
        </svg>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-white [mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left: Text content */}
          <div className="text-center lg:text-left space-y-8 motion-safe:animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-lg">
                {SITE_TAGLINE}
              </h1>
              <p className="text-xl sm:text-2xl text-blue-50 max-w-2xl mx-auto lg:mx-0 drop-shadow-md">
                {SITE_NAME} helps clubs and event organizers design, visualize, and share field layouts in minutes.
              </p>
            </div>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href={ROUTES.SITES_NEW}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-slate-900 bg-white rounded-2xl shadow-lg hover:bg-blue-50 hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50"
              >
                Create Your First Site
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                href={ROUTES.LAYOUTS}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-2xl hover:bg-white/20 hover:border-white/50 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/20"
              >
                <Play className="w-5 h-5" />
                Explore a Demo
              </Link>
            </div>
            
            {/* Trust indicator */}
            <p className="text-sm text-blue-100">
              No credit card required • Free to get started • Map data © OpenStreetMap
            </p>
          </div>
          
          {/* Right: Visual */}
          <div className="relative motion-safe:animate-slide-up">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
              <Image
                src="/landing/hero-placeholder.png"
                alt="PlotIQ field layout demo showing multiple pitches on a map"
                width={800}
                height={600}
                className="w-full h-auto"
                priority
              />
              
              {/* Overlay badge */}
              <div className="absolute top-4 right-4 bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
                Live Preview
              </div>
            </div>
            
            {/* Decorative blur */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/30 to-cyan-300/30 rounded-3xl blur-3xl -z-10" />
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @media (prefers-reduced-motion: no-preference) {
          .motion-safe\\:animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }
          
          .motion-safe\\:animate-slide-up {
            animation: slide-up 0.8s ease-out 0.2s both;
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
