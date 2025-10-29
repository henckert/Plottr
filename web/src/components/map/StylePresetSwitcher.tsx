"use client";

export type StylePreset = "rural" | "greyscale" | "minimal" | "night";

export default function StylePresetSwitcher({
  value = "rural",
  onChange,
  className,
}: {
  value?: StylePreset;
  onChange: (v: StylePreset) => void;
  className?: string;
}) {
  return (
    <div className={className ?? "absolute top-3 left-3 z-10 bg-white rounded-xl shadow-lg px-3 py-2 border border-gray-200"}>
      <label className="text-xs mr-2 font-semibold text-navy-900">Style</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as StylePreset)}
        className="text-sm bg-white text-navy-900 font-medium outline-none border-none cursor-pointer"
        aria-label="Map style"
      >
        <option value="rural" className="text-navy-900 bg-white">Rural View</option>
        <option value="greyscale" className="text-navy-900 bg-white">Greyscale</option>
        <option value="minimal" className="text-navy-900 bg-white">Minimal</option>
        <option value="night" className="text-navy-900 bg-white">Night Survey</option>
      </select>
    </div>
  );
}
