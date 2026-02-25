import { useEffect, useState } from "react";

/**
 * FasoGaz — SplashScreen professionnel
 *
 * Usage dans main.jsx / App.jsx :
 *
 *   import SplashScreen from "./components/SplashScreen";
 *
 *   function App() {
 *     const [splashDone, setSplashDone] = useState(false);
 *     return splashDone ? <MainApp /> : <SplashScreen onFinish={() => setSplashDone(true)} />;
 *   }
 *
 * Props :
 *   onFinish : () => void   — appelé quand l'animation se termine
 *   duration : number       — durée totale en ms (défaut 2800)
 */
export default function SplashScreen({ onFinish, duration = 2800 }) {
  const [phase, setPhase] = useState("enter"); // enter | hold | exit

  useEffect(() => {
    // Phase 1 : entrée (800ms) → hold
    const t1 = setTimeout(() => setPhase("hold"), 800);
    // Phase 2 : exit commence 600ms avant la fin
    const t2 = setTimeout(() => setPhase("exit"), duration - 600);
    // Phase 3 : démonte le splash
    const t3 = setTimeout(() => onFinish?.(), duration);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [duration, onFinish]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;600&display=swap');

        :root {
          --red:    #dc2626;
          --red2:   #b91c1c;
          --ember:  #f97316;
          --gold:   #fbbf24;
          --black:  #0a0a0a;
        }

        /* ── WRAPPER ─────────────────────────── */
        .fg-splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          overflow: hidden;
          background: linear-gradient(160deg, var(--red2) 0%, #1a0000 55%, var(--black) 100%);
          transition: opacity 0.55s cubic-bezier(.4,0,.2,1), transform 0.55s cubic-bezier(.4,0,.2,1);
        }
        .fg-splash.exit {
          opacity: 0;
          transform: scale(1.04);
          pointer-events: none;
        }

        /* ── GRAIN OVERLAY ───────────────────── */
        .fg-splash::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
          background-size: 180px;
          opacity: 0.35;
          pointer-events: none;
        }

        /* ── RADIAL GLOW ─────────────────────── */
        .fg-glow {
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(220,38,38,.35) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -58%);
          animation: fg-pulse 2.4s ease-in-out infinite;
        }
        @keyframes fg-pulse {
          0%, 100% { opacity: .6; transform: translate(-50%,-58%) scale(1); }
          50%       { opacity: 1;  transform: translate(-50%,-58%) scale(1.12); }
        }

        /* ── RING ────────────────────────────── */
        .fg-ring {
          position: relative;
          width: 148px;
          height: 148px;
          flex-shrink: 0;
          animation: fg-rise 0.75s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes fg-rise {
          from { opacity: 0; transform: translateY(28px) scale(.85); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
        .fg-ring svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          animation: fg-spin 6s linear infinite;
        }
        @keyframes fg-spin { to { transform: rotate(360deg); } }

        /* ── LOGO IMG ────────────────────────── */
        .fg-logo {
          position: absolute;
          inset: 14px;
          border-radius: 50%;
          object-fit: contain;
          padding: 10px;
          filter: drop-shadow(0 0 14px rgba(220,38,38,.7));
        }

        /* ── TEXT BLOCK ──────────────────────── */
        .fg-text {
          text-align: center;
          margin-top: 28px;
          animation: fg-fadein 0.7s 0.4s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes fg-fadein {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .fg-brand {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(52px, 14vw, 72px);
          letter-spacing: 0.06em;
          line-height: 1;
          color: #fff;
          text-shadow: 0 0 30px rgba(220,38,38,.6), 0 2px 0 rgba(0,0,0,.5);
        }
        .fg-brand span {
          color: var(--gold);
          text-shadow: 0 0 24px rgba(251,191,36,.5);
        }

        .fg-tagline {
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          font-size: clamp(12px, 3.5vw, 15px);
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.55);
          margin-top: 6px;
        }

        /* ── DIVIDER ─────────────────────────── */
        .fg-divider {
          width: 60px;
          height: 2px;
          margin: 18px auto 0;
          background: linear-gradient(90deg, transparent, var(--ember), transparent);
          animation: fg-fadein 0.7s 0.65s both;
        }

        /* ── LOADER BAR ──────────────────────── */
        .fg-bar-wrap {
          margin-top: 38px;
          width: clamp(160px, 45vw, 220px);
          height: 3px;
          border-radius: 99px;
          background: rgba(255,255,255,0.1);
          overflow: hidden;
          animation: fg-fadein 0.5s 0.7s both;
        }
        .fg-bar {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, var(--ember), var(--gold));
          animation: fg-load ${props => props.duration - 400}ms cubic-bezier(.4,0,.2,1) 0.3s both;
          transform-origin: left;
        }
        @keyframes fg-load {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        /* ── TAGLINE BOTTOM ──────────────────── */
        .fg-bottom {
          position: absolute;
          bottom: 36px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.2);
          animation: fg-fadein 1s 1s both;
        }

        /* ── EMBER PARTICLES ─────────────────── */
        .fg-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .fg-particle {
          position: absolute;
          border-radius: 50%;
          background: var(--ember);
          animation: fg-float linear infinite;
          opacity: 0;
        }
        @keyframes fg-float {
          0%   { transform: translateY(0)   scale(1);   opacity: 0; }
          15%  { opacity: .8; }
          80%  { opacity: .3; }
          100% { transform: translateY(-320px) scale(0.3); opacity: 0; }
        }
      `}</style>

      <div className={`fg-splash${phase === "exit" ? " exit" : ""}`}>
        {/* Glow de fond */}
        <div className="fg-glow" />

        {/* Particules ember */}
        <div className="fg-particles">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="fg-particle"
              style={{
                width: `${3 + Math.random() * 4}px`,
                height: `${3 + Math.random() * 4}px`,
                left: `${20 + Math.random() * 60}%`,
                bottom: `${30 + Math.random() * 20}%`,
                animationDuration: `${2 + Math.random() * 2.5}s`,
                animationDelay: `${Math.random() * 2}s`,
                background: Math.random() > 0.5 ? "#f97316" : "#fbbf24",
              }}
            />
          ))}
        </div>

        {/* Logo avec anneau tournant */}
        <div className="fg-ring">
          {/* Anneau SVG rotatif */}
          <svg viewBox="0 0 148 148" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="74" cy="74" r="70" stroke="url(#ringGrad)" strokeWidth="2.5" strokeDasharray="6 10" strokeLinecap="round"/>
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="148" y2="148" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f97316"/>
                <stop offset="50%" stopColor="#fbbf24"/>
                <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
          {/* Logo */}
          <img
            className="fg-logo"
            src="/icons/icon-192x192.png"
            alt="FasoGaz logo"
          />
        </div>

        {/* Nom + slogan */}
        <div className="fg-text">
          <div className="fg-brand">
            Faso<span>Gaz</span>
          </div>
          <div className="fg-tagline">Votre gaz à portée de clic</div>
          <div className="fg-divider" />
        </div>

        {/* Barre de chargement */}
        <div className="fg-bar-wrap">
          <div
            className="fg-bar"
            style={{
              animation: `fg-load ${duration - 400}ms cubic-bezier(.4,0,.2,1) 0.3s both`,
            }}
          />
        </div>

        {/* Mention bas de page */}
        <div className="fg-bottom">Burkina Faso · 100% local</div>
      </div>
    </>
  );
}