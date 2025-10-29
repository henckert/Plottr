// web/src/components/editor/QuickStartWizard.tsx
"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEditorStore } from "@/store/editor.store";

type StartMethod = "template" | "rectangle" | "trace";

export function QuickStartWizard({
  onComplete,
}: {
  onComplete: (p: { method: StartMethod; templateId?: string; width?: number; length?: number; rotation?: number }) => void;
}) {
  const { openQuickStart, setOpenQuickStart } = useEditorStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [method, setMethod] = useState<StartMethod>("template");

  useEffect(() => {
    const skip = localStorage.getItem("plotiq:skipQuickStart");
    if (skip === "1") setOpenQuickStart(false);
  }, [setOpenQuickStart]);

  if (!openQuickStart) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-3xl rounded-2xl bg-slate-900/90 border border-white/10 p-6 shadow-2xl"
        >
          {/* Stepper */}
          <div className="mb-6 text-white/80 text-sm">Quick Start — Step {step} of 3</div>

          {step === 1 && (
            <div className="text-white">
              <h3 className="text-2xl font-semibold mb-3">Pick a site</h3>
              <p className="text-white/70 mb-4">Search your site or pick a recent one.</p>
              {/* TODO: hook into your site search/geocode picker */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/5 mb-4">
                <p className="text-sm text-white/60">Site search integration coming soon...</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("plotiq:skipQuickStart", "1");
                    setOpenQuickStart(false);
                  }}
                  className="px-6 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-white transition-colors"
                >
                  Skip wizard
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-white">
              <h3 className="text-2xl font-semibold mb-3">How do you want to start?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card
                  selected={method === "template"}
                  onClick={() => setMethod("template")}
                  title="From Template"
                  subtitle="GAA/Rugby/Soccer presets"
                />
                <Card
                  selected={method === "rectangle"}
                  onClick={() => setMethod("rectangle")}
                  title="Custom Rectangle"
                  subtitle="Width × Length × Rotation"
                />
                <Card
                  selected={method === "trace"}
                  onClick={() => setMethod("trace")}
                  title="Trace Boundary"
                  subtitle="Free polygon draw"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-white">
              <h3 className="text-2xl font-semibold mb-3">Place at site center</h3>
              <p className="text-white/70 mb-6">
                We'll drop your first shape at the current map center. You can adjust after.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("plotiq:skipQuickStart", "1");
                    onComplete({ method });
                  }}
                  className="px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors"
                >
                  Start Mapping
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Card({ selected, onClick, title, subtitle }: any) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl border p-5 text-left transition-all",
        selected
          ? "border-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/20"
          : "border-white/10 hover:border-white/20 hover:bg-white/5",
      ].join(" ")}
    >
      <div className="text-white font-semibold mb-1">{title}</div>
      <div className="text-white/70 text-sm">{subtitle}</div>
    </button>
  );
}
