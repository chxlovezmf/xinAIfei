const ORBS = [
  { top: '18%', left: '58%', width: 300, height: 300, variant: 'ambient-orb-a' },
  { top: '46%', left: '-14%', width: 260, height: 260, variant: 'ambient-orb-b' },
];

const PARTICLES = [
  { top: '12%', left: '20%', size: 3, delay: '0s', duration: '7s' },
  { top: '24%', left: '80%', size: 2, delay: '1.2s', duration: '9s' },
  { top: '38%', left: '12%', size: 2.5, delay: '2.4s', duration: '8s' },
  { top: '52%', left: '88%', size: 3, delay: '0.8s', duration: '10s' },
  { top: '66%', left: '24%', size: 2, delay: '3.1s', duration: '7.5s' },
  { top: '74%', left: '70%', size: 2.5, delay: '1.8s', duration: '9.5s' },
  { top: '88%', left: '42%', size: 3, delay: '2.9s', duration: '8.5s' },
  { top: '8%', left: '48%', size: 2, delay: '4s', duration: '11s' },
  { top: '46%', left: '52%', size: 2, delay: '0.4s', duration: '6.5s' },
  { top: '82%', left: '88%', size: 2.5, delay: '2.2s', duration: '10.5s' },
];

export default function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {ORBS.map((o, i) => (
        <div
          key={i}
          className={`ambient-orb ${o.variant}`}
          style={{
            top: o.top,
            left: o.left,
            width: o.width,
            height: o.height,
          }}
        />
      ))}
      {PARTICLES.map((p, i) => (
        <div
          key={'p' + i}
          className="ambient-particle"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
