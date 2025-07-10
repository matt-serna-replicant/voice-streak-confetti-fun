import React, { useEffect, useState } from 'react';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
}

export function Confetti() {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    const colors = [
      'hsl(233, 82%, 60%)', // Primary blue
      'hsl(189, 95%, 52%)', // Secondary cyan
      'hsl(142, 76%, 36%)', // Success green
      'hsl(45, 93%, 47%)',  // Golden yellow
      'hsl(330, 81%, 60%)', // Pink
      'hsl(271, 81%, 56%)', // Purple
    ];

    const newParticles: ConfettiParticle[] = [];
    
    // Create 30 particles
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 500, // Random delay up to 500ms
      });
    }

    setParticles(newParticles);

    // Clean up after animation
    const timeout = setTimeout(() => {
      setParticles([]);
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="confetti-particle absolute w-3 h-3 rounded-full"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}