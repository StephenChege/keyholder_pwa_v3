import React, { useEffect, useRef } from 'react';

export default function FeedbackCircle({ value, max, type, darkMode }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 10;
    const normalizedValue = value / max;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background circle
    ctx.fillStyle = darkMode ? '#1e293b' : '#e2e8f0';
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.fill();

    // Determine colors based on type and proximity
    let fillColor;
    if (type === 'brightness') {
      // Yellow/amber gradient based on brightness
      const hue = 45; // yellow-amber
      const lightness = 30 + (normalizedValue * 40); // 30% to 70%
      fillColor = `hsl(${hue}, 100%, ${lightness}%)`;
    } else {
      // Red/rose gradient based on volume
      const hue = 0; // red
      const saturation = 50 + (normalizedValue * 50); // 50% to 100%
      const lightness = 40 + (normalizedValue * 10); // 40% to 50%
      fillColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    // Active circle
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * normalizedValue, 0, Math.PI * 2);
    ctx.fill();

    // Center text
    ctx.fillStyle = darkMode ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${value}%`, centerX, centerY);

    // Label
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = darkMode ? '#94a3b8' : '#475569';
    ctx.fillText(type === 'brightness' ? 'Brightness' : 'Volume', centerX, centerY + 24);
  }, [value, max, type, darkMode]);

  return (
    <div className="flex justify-center mb-4">
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        className="rounded-full"
      />
    </div>
  );
}
