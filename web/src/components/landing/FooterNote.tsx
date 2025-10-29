'use client';

import Link from 'next/link';
import { COPYRIGHT_YEAR, EXTERNAL_LINKS } from '@/config/app';

export default function FooterNote() {
  return (
    <footer className="relative border-t border-white/10 overflow-hidden">
      {/* Diagonal gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-blue-400" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Copyright */}
          <div className="text-sm text-blue-100">
            © {COPYRIGHT_YEAR} PlotIQ
          </div>
          
          {/* Attribution */}
          <div className="flex flex-wrap items-center justify-center gap-1 text-sm text-blue-100">
            <span>Map data ©</span>
            <a
              href={EXTERNAL_LINKS.OSM}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:underline focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              OpenStreetMap contributors
            </a>
          </div>
          
          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="text-sm text-blue-100 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-blue-100 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              Privacy
            </Link>
            <Link
              href="/changelog"
              className="text-sm text-blue-100 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              What's New
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
