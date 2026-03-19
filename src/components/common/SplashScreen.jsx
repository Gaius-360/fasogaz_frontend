// ==========================================
// FICHIER: src/components/SplashScreen.jsx
// ✅ VERSION SANS IMAGE — flamme SVG inline, zéro dépendance réseau/cache
// Ambiance : rouge/noir, flamme animée, particules ember, barre de chargement
// ==========================================
import { useEffect, useState } from 'react';

/**
 * SplashScreen FasoGaz
 *
 * Usage :
 *   function App() {
 *     const [done, setDone] = useState(false);
 *     return done ? <MainApp /> : <SplashScreen onFinish={() => setDone(true)} />;
 *   }
 *
 * Props :
 *   onFinish : () => void  — appelé à la fin de l'animation
 *   duration : number      — durée totale en ms (défaut 2800)
 */
export default function SplashScreen({ onFinish, duration = 2800 }) {
  const [phase, setPhase] = useState('enter'); // enter | hold | exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 800);
    const t2 = setTimeout(() => setPhase('exit'), duration - 600);
    const t3 = setTimeout(() => onFinish?.(), duration);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [duration, onFinish]);

  // Particules générées de façon déterministe — pas de Math.random()
  // pour éviter des re-renders différents à chaque montage
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id:       i,
    size:     2 + ((i * 7 + 3) % 5),
    left:     25 + ((i * 13 + 5) % 50),
    bottom:   28 + ((i * 11 + 2) % 18),
    duration: 2.2 + ((i * 3 + 1) % 28) / 10,
    delay:    ((i * 17 + 7) % 30) / 10,
    color:    i % 2 === 0 ? '#f97316' : '#fbbf24',
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400&display=swap');

        .fg2-splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(170deg, #1a0000 0%, #0a0a0a 60%, #000 100%);
          transition: opacity .55s cubic-bezier(.4,0,.2,1), transform .55s cubic-bezier(.4,0,.2,1);
        }
        .fg2-splash.exit {
          opacity: 0;
          transform: scale(1.04);
          pointer-events: none;
        }

        .fg2-glow {
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(180,0,0,.18) 0%, transparent 65%);
          top: 50%; left: 50%;
          transform: translate(-50%, -60%);
          animation: fg2-pulse 3s ease-in-out infinite;
        }
        @keyframes fg2-pulse {
          0%,100% { opacity: .5; transform: translate(-50%,-60%) scale(1);    }
          50%      { opacity: 1;  transform: translate(-50%,-60%) scale(1.15); }
        }

        .fg2-particles { position: absolute; inset: 0; pointer-events: none; }
        .fg2-p {
          position: absolute;
          border-radius: 50%;
          animation: fg2-rise linear infinite;
          opacity: 0;
        }
        @keyframes fg2-rise {
          0%   { opacity: 0; transform: translateY(0) scale(1);      }
          15%  { opacity: .9; }
          85%  { opacity: .2; }
          100% { opacity: 0; transform: translateY(-380px) scale(.2); }
        }

        .fg2-flame {
          animation: fg2-flicker 2.8s ease-in-out infinite;
        }
        @keyframes fg2-flicker {
          0%,100% { transform: scaleX(1)    scaleY(1);    }
          25%      { transform: scaleX(.97)  scaleY(1.03); }
          50%      { transform: scaleX(1.02) scaleY(.98);  }
          75%      { transform: scaleX(.98)  scaleY(1.02); }
        }

        .fg2-brand {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(56px, 15vw, 74px);
          letter-spacing: .1em;
          line-height: 1;
          color: #fff;
          text-shadow: 0 0 60px rgba(220,38,38,.5), 0 0 20px rgba(220,38,38,.3);
          animation: fg2-up .8s .2s both;
        }
        .fg2-brand span {
          color: #fbbf24;
          text-shadow: 0 0 40px rgba(251,191,36,.4);
        }

        .fg2-tag {
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          font-size: clamp(11px, 3vw, 13px);
          letter-spacing: .28em;
          text-transform: uppercase;
          color: rgba(255,255,255,.4);
          margin-top: 10px;
          animation: fg2-up .8s .4s both;
        }

        @keyframes fg2-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        .fg2-sep {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 32px;
          animation: fg2-up .8s .6s both;
        }
        .fg2-line {
          width: 1px;
          height: 36px;
          background: linear-gradient(to bottom, transparent, rgba(220,38,38,.55), transparent);
        }
        .fg2-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #dc2626;
          margin-top: 6px;
          animation: fg2-dot-pulse 1.5s .7s ease-in-out infinite;
        }
        @keyframes fg2-dot-pulse {
          0%,100% { opacity: 1;  transform: scale(1);  }
          50%      { opacity: .3; transform: scale(.5); }
        }

        .fg2-bar-wrap {
          width: clamp(140px, 40vw, 190px);
          height: 1px;
          background: rgba(255,255,255,.07);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 44px;
          animation: fg2-up .5s .8s both;
        }
        .fg2-bar {
          height: 100%;
          background: linear-gradient(90deg, #7f1d1d, #dc2626, #f97316, #fbbf24);
          border-radius: 99px;
          transform-origin: left;
          transform: scaleX(0);
        }
        @keyframes fg2-load {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        .fg2-bottom {
          position: absolute;
          bottom: 28px;
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: rgba(255,255,255,.14);
          animation: fg2-up 1s 1.2s both;
        }
      `}</style>

      <div className={`fg2-splash${phase === 'exit' ? ' exit' : ''}`}>

        {/* Halo de fond */}
        <div className="fg2-glow" />

        {/* Particules ember */}
        <div className="fg2-particles">
          {particles.map((p) => (
            <div
              key={p.id}
              className="fg2-p"
              style={{
                width:             `${p.size}px`,
                height:            `${p.size}px`,
                left:              `${p.left}%`,
                bottom:            `${p.bottom}%`,
                background:        p.color,
                animationDuration: `${p.duration}s`,
                animationDelay:    `${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Contenu centré */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* ── Flamme SVG — 100% inline, zéro réseau ── */}
          <div style={{ width: 100, height: 110, marginBottom: 36 }}>
            <svg
              className="fg2-flame"
              viewBox="0 0 100 110"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width="100"
              height="110"
            >
              <defs>
                <linearGradient id="fg2f1" x1="50" y1="0" x2="50" y2="110" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="#fbbf24" />
                  <stop offset="35%"  stopColor="#f97316" />
                  <stop offset="70%"  stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>
                <linearGradient id="fg2f2" x1="50" y1="20" x2="50" y2="95" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="#fff"    stopOpacity=".95" />
                  <stop offset="50%"  stopColor="#fef3c7" stopOpacity=".7"  />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity=".3"  />
                </linearGradient>
                <linearGradient id="fg2f3" x1="50" y1="50" x2="50" y2="110" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="#f97316" stopOpacity=".55" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0"   />
                </linearGradient>
              </defs>

              {/* Halo à la base */}
              <ellipse cx="50" cy="105" rx="28" ry="5" fill="url(#fg2f3)" />
              {/* Corps principal */}
              <path
                d="M50 5 C50 5 20 28 18 55 C16 75 28 92 50 100 C72 92 84 75 82 55 C80 28 50 5 50 5Z"
                fill="url(#fg2f1)"
              />
              {/* Couche intermédiaire */}
              <path
                d="M50 5 C50 5 35 22 34 42 C33 55 38 65 50 70 C62 65 67 55 66 42 C65 22 50 5 50 5Z"
                fill="url(#fg2f1)"
                opacity=".55"
              />
              {/* Cœur lumineux */}
              <path
                d="M50 18 C50 18 38 32 37 48 C36 58 42 66 50 69 C58 66 64 58 63 48 C62 32 50 18 50 18Z"
                fill="url(#fg2f2)"
              />
              {/* Point chaud base */}
              <ellipse cx="50" cy="100" rx="10" ry="4" fill="#fbbf24" opacity=".35" />
            </svg>
          </div>

          {/* Nom */}
          <div className="fg2-brand">Faso<span>Gaz</span></div>

          {/* Slogan */}
          <div className="fg2-tag">Votre gaz à portée de clic</div>

          {/* Séparateur */}
          <div className="fg2-sep">
            <div className="fg2-line" />
            <div className="fg2-dot" />
          </div>

          {/* Barre de chargement */}
          <div className="fg2-bar-wrap">
            <div
              className="fg2-bar"
              style={{
                animation: `fg2-load ${duration - 400}ms cubic-bezier(.4,0,.2,1) 0.3s both`,
              }}
            />
          </div>
        </div>

        {/* Mention bas de page */}
        <div className="fg2-bottom">Burkina Faso · 100% local</div>
      </div>
    </>
  );
}