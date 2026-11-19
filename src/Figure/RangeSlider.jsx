// Two-handle slider of a [lo, hi] range (Bokeh's RangeSlider).

export default function RangeSlider({ title, range, step, value, onChange }) {
  const [min, max] = range;
  const [lo, hi] = value;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  // the decimal value of a slider position, without floating-point noise
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const read = (e) => Number(Number(e.target.value).toFixed(decimals));
  return (
    <div>
      <div className="text-sm">
        {title}: <span className="font-mono">{lo.toFixed(decimals)} .. {hi.toFixed(decimals)}</span>
      </div>
      <div className="range-slider">
        <div className="track">
          <div className="track-active" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        </div>
        <input
          type="range"
          aria-label={`${title}, from`}
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([Math.min(read(e), hi), hi])}
        />
        <input
          type="range"
          aria-label={`${title}, to`}
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, Math.max(read(e), lo)])}
        />
      </div>
    </div>
  );
}
