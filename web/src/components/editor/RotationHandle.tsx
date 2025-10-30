/**
 * RotationHandle Component
 * Visual rotation handles displayed on selected map features
 * Provides visual feedback and drag-to-rotate interaction
 */

"use client";
import { useEffect, useState, useRef } from "react";
import { RotateCw } from "lucide-react";

interface RotationHandleProps {
  /** Center point of the feature in screen coordinates */
  centerX: number;
  centerY: number;
  /** Current rotation in degrees */
  rotation: number;
  /** Handle radius from center in pixels */
  radius?: number;
  /** Callback when rotation changes */
  onRotate?: (degrees: number) => void;
  /** Whether rotation snap is enabled */
  snapEnabled?: boolean;
  /** Snap increment in degrees */
  snapDegrees?: number;
  /** Whether the handle is visible */
  visible?: boolean;
}

export function RotationHandle({
  centerX,
  centerY,
  rotation,
  radius = 80,
  onRotate,
  snapEnabled = true,
  snapDegrees = 5,
  visible = true,
}: RotationHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(rotation);
  const dragStartAngleRef = useRef(0);
  const rotationStartRef = useRef(0);

  useEffect(() => {
    setCurrentRotation(rotation);
  }, [rotation]);

  const calculateAngle = (clientX: number, clientY: number): number => {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    // Convert to degrees, offset by 90° to start from top
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    // Normalize to 0-360
    return ((angle % 360) + 360) % 360;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartAngleRef.current = calculateAngle(e.clientX, e.clientY);
    rotationStartRef.current = currentRotation;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentAngle = calculateAngle(e.clientX, e.clientY);
      let delta = currentAngle - dragStartAngleRef.current;
      
      // Handle wraparound
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      let newRotation = rotationStartRef.current + delta;
      
      // Apply snap if enabled
      if (snapEnabled && snapDegrees > 0) {
        newRotation = Math.round(newRotation / snapDegrees) * snapDegrees;
      }
      
      // Normalize to 0-360
      newRotation = ((newRotation % 360) + 360) % 360;
      
      setCurrentRotation(newRotation);
      
      if (onRotate) {
        onRotate(newRotation);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, centerX, centerY, onRotate, snapEnabled, snapDegrees]);

  if (!visible) return null;

  // Calculate handle position
  const handleAngle = (currentRotation - 90) * (Math.PI / 180); // Convert to radians, offset by 90°
  const handleX = centerX + Math.cos(handleAngle) * radius;
  const handleY = centerY + Math.sin(handleAngle) * radius;

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Rotation line from center to handle */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <line
          x1={centerX}
          y1={centerY}
          x2={handleX}
          y2={handleY}
          stroke={isDragging ? '#3b82f6' : '#64748b'}
          strokeWidth="2"
          strokeDasharray={isDragging ? '0' : '5,5'}
          opacity={isDragging ? 0.8 : 0.5}
        />
        
        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r="4"
          fill={isDragging ? '#3b82f6' : '#64748b'}
          opacity={0.6}
        />
      </svg>

      {/* Rotation handle (draggable) */}
      <div
        className={`absolute pointer-events-auto cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{
          left: handleX - 16,
          top: handleY - 16,
          width: '32px',
          height: '32px',
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          className={`w-full h-full rounded-full flex items-center justify-center transition-all ${
            isDragging
              ? 'bg-blue-600 shadow-lg scale-110'
              : 'bg-slate-700 hover:bg-slate-600 shadow-md'
          } border-2 border-white/20`}
        >
          <RotateCw
            className={`w-4 h-4 transition-colors ${
              isDragging ? 'text-white' : 'text-white/80'
            }`}
          />
        </div>
      </div>

      {/* Rotation angle indicator */}
      {isDragging && (
        <div
          className="absolute pointer-events-none bg-slate-900/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-white/20 shadow-lg"
          style={{
            left: centerX - 30,
            top: centerY - radius - 40,
          }}
        >
          {Math.round(currentRotation)}°
          {snapEnabled && snapDegrees > 0 && (
            <span className="text-xs text-blue-400 ml-1">({snapDegrees}°)</span>
          )}
        </div>
      )}

      {/* Circle outline showing rotation radius */}
      {isDragging && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity={0.3}
          />
        </svg>
      )}

      {/* Keyboard hint */}
      {!isDragging && (
        <div
          className="absolute pointer-events-none bg-slate-900/80 text-white/60 px-2 py-1 rounded text-xs border border-white/10"
          style={{
            left: handleX + 20,
            top: handleY - 10,
          }}
        >
          Drag or press R
        </div>
      )}
    </div>
  );
}
