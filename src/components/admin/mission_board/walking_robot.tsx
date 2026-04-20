"use client";

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";

export type RobotActionTarget = "wander" | "SPAWN" | "OPEN" | "PENDING_REVIEW" | "CLOSED";

export interface IRobotAction {
  type: "PICKUP" | "DROP";
  targetZone: RobotActionTarget;
  blockId: number;
  onComplete?: () => void;
}

export interface IRobotRef {
  queueAction: (action: IRobotAction) => void;
  setZonePosition: (zone: RobotActionTarget, pos: { x: number, y: number }) => void;
}

const WalkingRobot = forwardRef<IRobotRef>((props, ref) => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [facingRight, setFacingRight] = useState(true);
  const [isCarrying, setIsCarrying] = useState(false);

  const phaseRef = useRef(0);

  // Info: (20260420 - Luphia) Joints angles mapped to React state
  const [joints, setJoints] = useState({
    leftHip: 0, leftKnee: 0, leftAnkle: 0,
    rightHip: 0, rightKnee: 0, rightAnkle: 0,
    leftShoulder: 0, leftElbow: 0, leftWrist: 0,
    rightShoulder: 0, rightElbow: 0, rightWrist: 0,
    head: 0, torso: 0, fingers: 0
  });

  const posRef = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 500 });

  const zonePositionsRef = useRef<Record<string, { x: number, y: number }>>({
    "SPAWN": { x: 50, y: 50 },
    "OPEN": { x: 300, y: 150 },
    "PENDING_REVIEW": { x: 600, y: 150 },
    "CLOSED": { x: 900, y: 150 }
  });

  const commandQueueRef = useRef<IRobotAction[]>([]);
  const currentActionRef = useRef<IRobotAction | null>(null);

  // Info: (20260420 - Luphia) Wander logic state
  const wanderTargetRef = useRef({ x: 0, y: 0 });
  const idleRef = useRef(false);
  const isCarryingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    queueAction: (action) => {
      commandQueueRef.current.push(action);
    },
    setZonePosition: (zone, pos) => {
      zonePositionsRef.current[zone] = pos;
    }
  }));

  useEffect(() => {
    // Info: (20260420 - Luphia) Initial random position
    posRef.current = {
      x: Math.random() * (window.innerWidth - 100) + 50,
      y: Math.random() * (window.innerHeight - 100) + 50
    };
    wanderTargetRef.current = { ...posRef.current };

    let animationFrame: number;
    let lastTime = performance.now();

    const walkSpeed = 300; // Info: (20260420 - Luphia) Fast walking when working
    const wanderSpeed = 100;
    const cycleSpeed = 10;

    const update = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Info: (20260420 - Luphia) Determine where the robot should go
      let targetX = wanderTargetRef.current.x;
      let targetY = wanderTargetRef.current.y;
      let isWorking = false;

      // Info: (20260420 - Luphia) Handle Command Queue
      if (currentActionRef.current === null && commandQueueRef.current.length > 0) {
        currentActionRef.current = commandQueueRef.current.shift()!;
      }

      if (currentActionRef.current) {
        isWorking = true;
        idleRef.current = false;
        const targetZone = currentActionRef.current.targetZone;
        const zonePos = zonePositionsRef.current[targetZone];
        if (zonePos) {
          targetX = Math.max(50, Math.min(window.innerWidth - 50, zonePos.x));
          targetY = Math.max(50, Math.min(window.innerHeight - 50, zonePos.y)) + 80; // Info: (20260420 - Luphia) slightly below header
        }
      }

      const dx = targetX - posRef.current.x;
      const dy = targetY - posRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        if (isWorking && currentActionRef.current) {
          // Info: (20260420 - Luphia) Arrived at work destination
          const act = currentActionRef.current;

          if (act.type === "PICKUP") {
            isCarryingRef.current = true;
            setIsCarrying(true);
          } else if (act.type === "DROP") {
            isCarryingRef.current = false;
            setIsCarrying(false);
          }

          if (act.onComplete) {
            act.onComplete();
          }
          currentActionRef.current = null; // Info: (20260420 - Luphia) Free up to take next task immediately
        } else if (!idleRef.current) {
          // Info: (20260420 - Luphia) Arrived at wander destination
          idleRef.current = true;
          setTimeout(() => {
            if (!currentActionRef.current) {
              wanderTargetRef.current = {
                x: Math.random() * (window.innerWidth - 200) + 100,
                y: Math.random() * (window.innerHeight - 200) + 100
              };
            }
            idleRef.current = false;
          }, Math.random() * 3000 + 1000);
        }
      }

      let moving = false;
      if (dist > 5 && (!idleRef.current || isWorking)) {
        moving = true;
        const speed = isWorking ? walkSpeed : wanderSpeed;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        posRef.current.x += vx * dt;
        posRef.current.y += vy * dt;

        if (vx > 0) setFacingRight(true);
        if (vx < 0) setFacingRight(false);
      }

      setPosition({ x: posRef.current.x, y: posRef.current.y });

      // Info: (20260420 - Luphia) Animate joints
      if (moving) {
        phaseRef.current += cycleSpeed * dt * (isWorking ? 1.5 : 1);
      } else {
        const closestZero = Math.round(phaseRef.current / (Math.PI * 2)) * Math.PI * 2;
        phaseRef.current += (closestZero - phaseRef.current) * dt * 5;
      }

      const p = phaseRef.current;
      const pSin = Math.sin(p);
      const pCos = Math.cos(p);

      const carrying = isCarryingRef.current;

      setJoints({
        leftHip: pSin * 40,
        leftKnee: Math.max(0, -pSin * 45 + 10),
        leftAnkle: pSin * 10 - 5,

        rightHip: -pSin * 40,
        rightKnee: Math.max(0, pSin * 45 + 10),
        rightAnkle: -pSin * 10 - 5,

        leftShoulder: carrying ? -30 : -pSin * 30, // Info: (20260420 - Luphia) Locked forward when carrying
        leftElbow: carrying ? -60 : -Math.abs(pCos) * 30 - 10,
        leftWrist: carrying ? 0 : pSin * 15,

        rightShoulder: carrying ? -20 : pSin * 30,
        rightElbow: carrying ? -65 : -Math.abs(pSin) * 30 - 10,
        rightWrist: carrying ? 0 : -pSin * 15,

        head: Math.sin(p * 2) * 4,
        torso: Math.sin(p * 2) * 3,
        fingers: carrying ? 80 : Math.sin(time / 500) * 8 // Info: (20260420 - Luphia) Fingers curled tight when carrying
      });

      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-100 overflow-hidden">
      <svg className="w-full h-full drop-shadow-lg transition-transform duration-300">
        <g transform={`translate(${position.x}, ${position.y}) scale(${facingRight ? 1 : -1}, 1)`}>

          <g transform={`rotate(${joints.torso})`}>
            {/* Info: (20260420 - Luphia) RIGHT ARM (Background) */}
            <g transform={`translate(0, 5) rotate(${joints.rightShoulder})`}>
              <rect x="-5" y="0" width="10" height="30" rx="5" fill="#9ca3af" />
              <g transform={`translate(0, 26) rotate(${joints.rightElbow})`}>
                <rect x="-4" y="0" width="8" height="25" rx="4" fill="#cbd5e1" />
                <g transform={`translate(0, 23) rotate(${joints.rightWrist})`}>
                  <circle cx="0" cy="0" r="5" fill="#f8fafc" />
                  <path d="M-3,1 Q-10,8 -3,15" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" transform={`rotate(${joints.fingers * 0.5})`} />
                  <path d="M3,1 Q10,8 3,15" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" transform={`rotate(${-joints.fingers * 0.5})`} />
                </g>
              </g>
            </g>

            {/* Info: (20260420 - Luphia) RIGHT LEG */}
            <g transform={`translate(0, 45) rotate(${joints.rightHip})`}>
              <rect x="-6" y="0" width="12" height="35" rx="6" fill="#64748b" />
              <g transform={`translate(0, 30) rotate(${joints.rightKnee})`}>
                <rect x="-5" y="0" width="10" height="35" rx="5" fill="#94a3b8" />
                <g transform={`translate(0, 32) rotate(${joints.rightAnkle})`}>
                  <rect x="-6" y="0" width="22" height="9" rx="4" fill="#334155" />
                </g>
              </g>
            </g>

            {/* Info: (20260420 - Luphia) TORSO */}
            <rect x="-15" y="0" width="30" height="50" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
            <path d="M -8 15 L 8 15" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <path d="M -8 22 L 8 22" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="35" r="4" fill="#f97316" className={isCarrying ? "animate-spin" : "animate-pulse"} />

            {/* Info: (20260420 - Luphia) CARRIED BLOCK (When carrying) */}
            {isCarrying && (
              <g transform="translate(15, 20)">
                <rect x="0" y="-15" width="24" height="24" rx="4" fill="#6366f1" stroke="#4f46e5" strokeWidth="2" className="animate-pulse shadow-lg" />
                <path d="M 6,-5 L 18,-5" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round" />
                <path d="M 6,0 L 14,0" stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}

            {/* Info: (20260420 - Luphia) HEAD */}
            <g transform={`translate(0, -2) rotate(${joints.head})`}>
              <path d="M 0,-25 L 0,-36" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="0" cy="-38" r="3" fill="#f97316" className="animate-ping shadow-orange-500" />
              <circle cx="0" cy="-38" r="3" fill="#f97316" />
              <rect x="-14" y="-28" width="28" height="26" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
              <rect x="-10" y="-18" width="24" height="8" rx="4" fill="#1e293b" />
              <circle cx="4" cy="-14" r="2.5" fill="#f97316" />
              <circle cx="-2" cy="-14" r="2.5" fill="#f97316" />
            </g>

            {/* Info: (20260420 - Luphia) LEFT LEG (Foreground) */}
            <g transform={`translate(0, 45) rotate(${joints.leftHip})`}>
              <rect x="-6" y="0" width="12" height="35" rx="6" fill="#475569" />
              <g transform={`translate(0, 30) rotate(${joints.leftKnee})`}>
                <rect x="-5" y="0" width="10" height="35" rx="5" fill="#64748b" />
                <g transform={`translate(0, 32) rotate(${joints.leftAnkle})`}>
                  <rect x="-6" y="0" width="22" height="9" rx="4" fill="#0f172a" />
                </g>
              </g>
            </g>

            {/* Info: (20260420 - Luphia) LEFT ARM (Foreground) */}
            <g transform={`translate(0, 5) rotate(${joints.leftShoulder})`}>
              <rect x="-5" y="0" width="10" height="30" rx="5" fill="#64748b" />
              <g transform={`translate(0, 26) rotate(${joints.leftElbow})`}>
                <rect x="-4" y="0" width="8" height="25" rx="4" fill="#94a3b8" />
                <g transform={`translate(0, 23) rotate(${joints.leftWrist})`}>
                  <circle cx="0" cy="0" r="5" fill="#cbd5e1" />
                  <path d="M-3,1 Q-10,8 -3,15" stroke="#64748b" strokeWidth="3" fill="none" strokeLinecap="round" transform={`rotate(${joints.fingers * 0.5})`} />
                  <path d="M3,1 Q10,8 3,15" stroke="#64748b" strokeWidth="3" fill="none" strokeLinecap="round" transform={`rotate(${-joints.fingers * 0.5})`} />
                </g>
              </g>
            </g>

          </g>
        </g>
      </svg>
    </div>
  );
});

WalkingRobot.displayName = "WalkingRobot";
export default WalkingRobot;
