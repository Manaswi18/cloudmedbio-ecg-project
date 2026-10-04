import { ChangeEvent, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  Cloud,
  FileHeart,
  HeartPulse,
  Info,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Upload,
  Waves,
} from "lucide-react";

type TracePoint = { time: number; value: number };
type Analysis = {
  estimated_rate_bpm: number;
  peaks_found: number;
  duration_sec: number;
  sample_rate: number;
  samples_parsed: number;
  peaks: number[];
  trace: TracePoint[];
  status: string;
  disclaimer: string;
  filename?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ?? (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

function EcgChart({ trace, peaks }: { trace: TracePoint[]; peaks: number[] }) {
  const width = 900;
  const height = 300;
  const pad = { l: 52, r: 18, t: 18, b: 40 };

  const { points, min, max, endTime } = useMemo(() => {
    if (!trace.length) return { points: "", min: -1, max: 1, endTime: 0 };
    const vals = trace.map(p => p.value);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const span = Math.max(rawMax - rawMin, 0.1);
    const minV = rawMin - span * 0.08;
    const maxV = rawMax + span * 0.08;
    const tMax = trace[trace.length - 1].time || 1;

    const pts = trace.map(p => {
      const x = pad.l + (p.time / tMax) * (width - pad.l - pad.r);
      const y = pad.t + (1 - (p.value - minV) / (maxV - minV)) * (height - pad.t - pad.b);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    return { points: pts, min: minV, max: maxV, endTime: tMax };
  }, [trace]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({
    y: pad.t + r * (height - pad.t - pad.b),
    value: max - r * (max - min),
  }));

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="ecg-svg" role="img" aria-label="ECG amplitude trace">
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={pad.l} x2={width - pad.r} y1={tick.y} y2={tick.y} className="grid-line" />
            <text x={pad.l - 10} y={tick.y + 4} textAnchor="end" className="axis-label">
              {tick.value.toFixed(1)}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={width - pad.r} y1={height - pad.b} y2={height - pad.b} className="axis-line" />
        <polyline points={points} className="ecg-line" fill="none" />
        {peaks.map((time, i) => {
          const nearest = trace.reduce((best, p) =>
            Math.abs(p.time - time) < Math.abs(best.time - time) ? p : best, trace[0]);
          const x = pad.l + (nearest.time / endTime) * (width - pad.l - pad.r);
          const y = pad.t + (1 - (nearest.value - min) / (max - min)) * (height - pad.t - pad.b);
          return <circle key={i} cx={x} cy={y} r="3.2" className="peak-dot" />;
        })}
        {[0, 1, 2, 3, 4].map(i => {
          const x = pad.l + (i / 4) * (width - pad.l - pad.r);
          return <text key={i} x={x} y={height - 12} textAnchor="middle" className="axis-label">{(endTime * i / 4).toFixed(1)}s</text>;
        })}
      </svg>
      <div className="chart-caption">
        <span><i className="legend-dot" /> ECG signal</span>
        <span><Check size={15} /> Saved analysis</span>
      </div>
    </div>
  );
}

type ProteinResidue = { residue: string; type: "H" | "E" | "C" };

type ProteinAnalysis = {
  sequence: string;
  length: number;
  hydrophobicity: number;
  charge: number;
  helixPropensity: number;
  sheetPropensity: number;
  coilPropensity: number;
  foldClass: string;
  stability: string;
  structure: ProteinResidue[];
};

const AMINO_ACIDS = new Set([
  "A", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "P",
  "Q", "R", "S", "T", "V", "W", "Y"
]);

const AMINO_ACID_PROPS: Record<string, { helix: number; sheet: number; coil: number; hydrophobic: number; charge: number }> = {
  A: { helix: 1.0, sheet: 0.6, coil: 0.8, hydrophobic: 0.9, charge: 0 },
  C: { helix: 0.7, sheet: 0.8, coil: 0.6, hydrophobic: 0.8, charge: 0 },
  D: { helix: 0.5, sheet: 0.3, coil: 1.2, hydrophobic: 0.2, charge: -1 },
  E: { helix: 0.6, sheet: 0.4, coil: 1.1, hydrophobic: 0.2, charge: -1 },
  F: { helix: 0.8, sheet: 1.3, coil: 0.5, hydrophobic: 1.0, charge: 0 },
  G: { helix: 0.5, sheet: 0.5, coil: 1.0, hydrophobic: 0.7, charge: 0 },
  H: { helix: 0.9, sheet: 0.6, coil: 0.8, hydrophobic: 0.5, charge: 1 },
  I: { helix: 1.1, sheet: 1.2, coil: 0.4, hydrophobic: 1.0, charge: 0 },
  K: { helix: 0.8, sheet: 0.4, coil: 1.1, hydrophobic: 0.3, charge: 1 },
  L: { helix: 1.2, sheet: 0.8, coil: 0.5, hydrophobic: 1.0, charge: 0 },
  M: { helix: 1.1, sheet: 0.9, coil: 0.6, hydrophobic: 0.9, charge: 0 },
  N: { helix: 0.6, sheet: 0.5, coil: 1.1, hydrophobic: 0.4, charge: 0 },
  P: { helix: 0.2, sheet: 0.4, coil: 1.4, hydrophobic: 0.6, charge: 0 },
  Q: { helix: 0.7, sheet: 0.5, coil: 1.0, hydrophobic: 0.4, charge: 0 },
  R: { helix: 0.9, sheet: 0.5, coil: 1.0, hydrophobic: 0.3, charge: 1 },
  S: { helix: 0.7, sheet: 0.5, coil: 1.0, hydrophobic: 0.5, charge: 0 },
  T: { helix: 0.8, sheet: 1.0, coil: 0.8, hydrophobic: 0.6, charge: 0 },
  V: { helix: 1.0, sheet: 1.1, coil: 0.5, hydrophobic: 1.0, charge: 0 },
  W: { helix: 0.9, sheet: 1.3, coil: 0.5, hydrophobic: 1.0, charge: 0 },
  Y: { helix: 0.7, sheet: 1.0, coil: 0.8, hydrophobic: 0.7, charge: 0 },
};

const SAMPLE_PROTEIN = "MKTAYIAQKLEKARLQKELLEFQKASGL";

function analyzeProteinSequence(sequence: string): ProteinAnalysis {
  const cleaned = sequence.replace(/\s+/g, "").toUpperCase();
  if (!cleaned) {
    throw new Error("Enter an amino-acid sequence before analyzing.");
  }

  const invalid = Array.from(cleaned).find(residue => !AMINO_ACIDS.has(residue));
  if (invalid) {
    throw new Error(`Invalid residue "${invalid}". Use standard amino-acid codes only.`);
  }

  const structure: ProteinResidue[] = Array.from(cleaned).map(residue => {
    const props = AMINO_ACID_PROPS[residue];
    const scores = [props.helix, props.sheet, props.coil];
    const mode = scores.indexOf(Math.max(...scores));

    if (mode === 0) return { residue, type: "H" };
    if (mode === 1) return { residue, type: "E" };
    return { residue, type: "C" };
  });

  const hydrophobicResidues = structure.filter(item => AMINO_ACID_PROPS[item.residue].hydrophobic >= 0.8).length;
  const hydrophobicity = (hydrophobicResidues / structure.length) * 100;
  const charge = structure.reduce((total, item) => total + AMINO_ACID_PROPS[item.residue].charge, 0);

  const helixPropensity = (structure.filter(item => item.type === "H").length / structure.length) * 100;
  const sheetPropensity = (structure.filter(item => item.type === "E").length / structure.length) * 100;
  const coilPropensity = (structure.filter(item => item.type === "C").length / structure.length) * 100;

  let foldClass = "mixed fold";
  let stability = "moderate";

  if (helixPropensity >= 45 && hydrophobicity >= 42) {
    foldClass = "alpha-helical bundle";
    stability = hydrophobicity >= 52 ? "highly stable" : "stable";
  } else if (sheetPropensity >= 42) {
    foldClass = "beta-sheet rich";
    stability = charge <= 0 ? "stable" : "moderate";
  } else if (coilPropensity >= 40) {
    foldClass = "dynamic coil";
    stability = "flexible";
  } else {
    foldClass = "mixed fold";
    stability = "moderate";
  }

  return {
    sequence: cleaned,
    length: cleaned.length,
    hydrophobicity: Number(hydrophobicity.toFixed(1)),
    charge,
    helixPropensity: Number(helixPropensity.toFixed(1)),
    sheetPropensity: Number(sheetPropensity.toFixed(1)),
    coilPropensity: Number(coilPropensity.toFixed(1)),
    foldClass,
    stability,
    structure,
  };
}

function ProteinFigure({ structure }: { structure: ProteinResidue[] }) {
  const width = 780;
  const height = 180;
  const startX = 30;
  const stepX = structure.length > 1 ? (width - startX * 2) / (structure.length - 1) : 0;

  const points = structure.map((item, index) => {
    const x = startX + index * stepX;
    const base = 90;
    const offset = item.type === "H" ? -38 : item.type === "E" ? 34 : 0;
    const y = base + offset + (index % 4 === 0 ? 8 : -8);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="protein-svg" role="img" aria-label="Protein folding diagram">
      <line x1={20} y1={90} x2={760} y2={90} className="protein-axis" />
      <polyline points={points} className="protein-fold" fill="none" />
      {structure.map((item, index) => {
        const x = startX + index * stepX;
        const base = 90;
        const offset = item.type === "H" ? -38 : item.type === "E" ? 34 : 0;
        const y = base + offset + (index % 4 === 0 ? 8 : -8);
        const color = item.type === "H" ? "#2b7a69" : item.type === "E" ? "#d67626" : "#6a7d8d";
        return (
          <g key={`${item.residue}-${index}`}>
            <circle cx={x} cy={y} r="6" fill={color} />
            <text x={x} y={y + 22} textAnchor="middle" className="protein-label">{item.residue}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function App() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [active, setActive] = useState<"ecg" | "protein">("ecg");
  const [proteinSequence, setProteinSequence] = useState(SAMPLE_PROTEIN);
  const [proteinResult, setProteinResult] = useState<ProteinAnalysis | null>(null);
  const [proteinError, setProteinError] = useState("");

  async function loadSample() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/sample`);
      if (!res.ok) throw new Error("Could not load sample.");
      setAnalysis(await res.json());
    } catch {
      setMessage("Backend is not running. Start the FastAPI server first.");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMessage("Please select a CSV file.");
      return;
    }

    setLoading(true);
    setMessage("");
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed.");
      setAnalysis(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  function runProteinAnalysis() {
    try {
      const result = analyzeProteinSequence(proteinSequence);
      setProteinResult(result);
      setProteinError("");
    } catch (err) {
      setProteinError(err instanceof Error ? err.message : "Protein analysis failed.");
      setProteinResult(null);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Activity size={25} /></div>
          <div>
            <div className="brand-name">cloudmedbio</div>
            <div className="brand-sub">RESEARCH CLOUD</div>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>

        <button className={`nav-item ${active === "ecg" ? "selected" : ""}`} onClick={() => setActive("ecg")}>
          <HeartPulse size={21} />
          <span>ECG analysis</span>
        </button>

        <button className={`nav-item ${active === "protein" ? "selected" : ""}`} onClick={() => setActive("protein")}>
          <Waves size={21} />
          <span>Protein folding</span>
        </button>

        <div className="sidebar-bottom">
          <div className="privacy">
            <ShieldCheck size={20} />
            <div>
              <strong>Private by default</strong>
              <p>ECG files are processed, not stored.</p>
            </div>
          </div>
          <div className="api-status">
            <span className="status-dot" />
            <span>API workspace</span>
            <span className="version">v1.0</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{active === "ecg" ? "ECG analysis" : "Protein folding"}</strong></div>
          <div className="cloud-status"><Cloud size={21} /> AWS-ready environment <span className="online-dot" /></div>
        </header>

        {active === "protein" ? (
          <section className="protein-module">
            <div className="protein-header">
              <div>
                <div className="eyebrow">MOLECULAR MODELLING</div>
                <h1>Protein folding</h1>
                <p>Explore an amino-acid sequence and estimate likely secondary-structure tendencies.</p>
              </div>
              <div className="hero-badge"><Waves size={18} /> Protein / Sequence</div>
            </div>

            <div className="card protein-card">
              <div className="protein-controls">
                <textarea
                  value={proteinSequence}
                  onChange={event => setProteinSequence(event.target.value)}
                  className="protein-input"
                  placeholder="Enter amino acid sequence, e.g. MKTAYIAQKLEK..."
                  spellCheck={false}
                />
                <div className="protein-actions">
                  <button className="primary-btn" onClick={runProteinAnalysis}>Analyze fold</button>
                  <button className="secondary-btn" onClick={() => setProteinSequence(SAMPLE_PROTEIN)}>Load sample</button>
                </div>
              </div>

              {proteinError && <div className="error"><AlertCircle size={17} /> {proteinError}</div>}

              {proteinResult && (
                <>
                  <div className="protein-summary-grid">
                    <div className="metric"><span>SEQUENCE</span><strong>{proteinResult.length}</strong><em>aa</em></div>
                    <div className="metric"><span>HYDROPHOBICITY</span><strong>{proteinResult.hydrophobicity}</strong><em>%</em></div>
                    <div className="metric"><span>FOLD CLASS</span><strong className="compact-value">{proteinResult.foldClass}</strong></div>
                  </div>

                  <div className="protein-figure-wrap">
                    <div className="trace-title"><span>SECONDARY-STRUCTURE MODEL</span><span>{proteinResult.stability}</span></div>
                    <ProteinFigure structure={proteinResult.structure} />
                  </div>

                  <div className="protein-stats">
                    <div>
                      <span>Helix</span>
                      <strong>{proteinResult.helixPropensity}%</strong>
                    </div>
                    <div>
                      <span>Sheet</span>
                      <strong>{proteinResult.sheetPropensity}%</strong>
                    </div>
                    <div>
                      <span>Coil</span>
                      <strong>{proteinResult.coilPropensity}%</strong>
                    </div>
                    <div>
                      <span>Net charge</span>
                      <strong>{proteinResult.charge}</strong>
                    </div>
                  </div>

                  <div className="sequence-readout">
                    <div className="sequence-label">Sequence</div>
                    <div className="sequence-string">{proteinResult.sequence}</div>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="hero">
              <div>
                <div className="eyebrow">SIGNAL INPUT</div>
                <h1>ECG analysis</h1>
                <p>Upload a CSV waveform or load a sample ECG signal for cloud-ready analysis.</p>
              </div>
              <div className="hero-badge"><FileHeart size={18} /> ECG / CSV</div>
            </section>

            <section className="card input-card">
              <div className="input-actions">
                <label className="primary-btn">
                  <Upload size={18} />
                  Choose CSV
                  <input type="file" accept=".csv,text/csv" onChange={analyzeFile} hidden />
                </label>
                <button className="secondary-btn" onClick={loadSample} disabled={loading}>
                  <RotateCcw size={18} />
                  {loading ? "Processing..." : "Load sample"}
                </button>
              </div>
              <div className="hint"><Info size={17} /> CSV may include a header. If there are multiple columns, the last one is read as the signal.</div>
              {message && <div className="error"><AlertCircle size={17} /> {message}</div>}
            </section>

            {analysis && (
              <section className="card result-card">
                <div className="result-header">
                  <div>
                    <div className="eyebrow">OUTPUT</div>
                    <h2>Signal overview</h2>
                  </div>
                  <span className="analyzed"><Check size={15} /> ANALYZED</span>
                </div>

                <div className="metrics">
                  <div className="metric"><span>EST. RATE</span><strong>{analysis.estimated_rate_bpm}</strong><em>bpm</em></div>
                  <div className="metric"><span>PEAKS FOUND</span><strong>{analysis.peaks_found}</strong></div>
                  <div className="metric"><span>DURATION</span><strong>{analysis.duration_sec}</strong><em>sec</em></div>
                </div>

                <div className="trace-title">
                  <span>AMPLITUDE TRACE</span>
                  <span>{analysis.sample_rate} samples / second</span>
                </div>

                <EcgChart trace={analysis.trace} peaks={analysis.peaks} />

                <div className="sample-info">{analysis.samples_parsed.toLocaleString()} samples parsed</div>

                <div className="disclaimer"><ShieldCheck size={17} /> {analysis.disclaimer}</div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
