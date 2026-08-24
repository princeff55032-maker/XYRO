"use client";

import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function ChromeMaterial() {
  return (
    <meshPhysicalMaterial
      color="#e4e4e7"
      metalness={0.95}
      roughness={0.15}
      clearcoat={0.8}
      clearcoatRoughness={0.15}
    />
  );
}

function GoldMaterial() {
  return (
    <meshPhysicalMaterial
      color="#e5c378"
      metalness={0.85}
      roughness={0.25}
      clearcoat={0.6}
      clearcoatRoughness={0.2}
    />
  );
}

function NeonMaterial({ color, intensity = 2.2 }: { color: string; intensity?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={intensity}
      roughness={0.35}
      metalness={0.3}
    />
  );
}

/* Dumbbell: handle + plates + end caps, laying on its side */
function Dumbbell({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  tone = "gold",
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  tone?: "gold" | "amber";
}) {
  const neon = tone === "gold" ? "#e5c378" : "#c59b53";
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* handle */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 1.5, 24]} />
        <ChromeMaterial />
      </mesh>
      {/* knurled grips */}
      {[-0.52, 0.52].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.085, 0.085, 0.32, 24]} />
          <meshStandardMaterial color="#27272a" metalness={0.8} roughness={0.6} />
        </mesh>
      ))}

      {/* left plates */}
      {[-0.82, -0.92, -1.02].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42 - i * 0.04, 0.42 - i * 0.04, 0.08, 32]} />
            <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.35} />
          </mesh>
          {/* rim glow ring */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.42 - i * 0.04, 0.012, 16, 32]} />
            <NeonMaterial color={neon} intensity={1.8} />
          </mesh>
        </group>
      ))}

      {/* right plates */}
      {[0.82, 0.92, 1.02].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42 - i * 0.04, 0.42 - i * 0.04, 0.08, 32]} />
            <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.35} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.42 - i * 0.04, 0.012, 16, 32]} />
            <NeonMaterial color={neon} intensity={1.8} />
          </mesh>
        </group>
      ))}

      {/* end caps */}
      {[-1.08, 1.08].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, 0.04, 24]} />
          <GoldMaterial />
        </mesh>
      ))}
    </group>
  );
}

/* Olympic Barbell */
function Barbell({
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* long bar */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 4.4, 24]} />
        <ChromeMaterial />
      </mesh>

      {/* left stack */}
      {[-1.75, -1.86, -1.97].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.55 - i * 0.03, 0.55 - i * 0.03, 0.09, 32]} />
            <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.55 - i * 0.03, 0.014, 16, 32]} />
            <NeonMaterial color="#e5c378" intensity={2.2} />
          </mesh>
        </group>
      ))}

      {/* right stack */}
      {[1.75, 1.86, 1.97].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.55 - i * 0.03, 0.55 - i * 0.03, 0.09, 32]} />
            <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.55 - i * 0.03, 0.014, 16, 32]} />
            <NeonMaterial color="#c59b53" intensity={2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* Floating Bumper Plate Stack */
function PlateStack({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {[0, 0.12, 0.24, 0.36].map((y, i) => {
        const colors = ["#e5c378", "#c59b53", "#faf8f5", "#e5c378"];
        const r = 0.52 - i * 0.04;
        return (
          <group key={y} position={[0, y, 0]}>
            <mesh>
              <cylinderGeometry args={[r, r, 0.09, 32]} />
              <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r, 0.013, 16, 32]} />
              <NeonMaterial color={colors[i]} intensity={2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* Futuristic Data/Metric Wireframe HUD */
function HoloPanel({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[1.6, 1.0]} />
        <meshBasicMaterial color="#e5c378" wireframe transparent opacity={0.35} />
      </mesh>
      {/* inner graph lines */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1.5, 0.9, 0.02)]} />
        <lineBasicMaterial color="#c59b53" transparent opacity={0.65} />
      </lineSegments>
      {/* corner nodes */}
      {[
        [-0.74, 0.46],
        [0.74, 0.46],
        [-0.74, -0.46],
        [0.74, -0.46],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.05]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <NeonMaterial color={i % 2 === 0 ? "#e5c378" : "#c59b53"} intensity={3} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Main scene                                                          */
/* ------------------------------------------------------------------ */

function GymScene() {
  const group = useRef<THREE.Group>(null);
  const scrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      scrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const { pointer } = state;
    // mouse parallax
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, pointer.x * 0.28, 0.045);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -pointer.y * 0.16, 0.045);
    // scroll: sink + spread slightly
    const t = Math.min(scrollY.current / 700, 1);
    g.position.y = THREE.MathUtils.lerp(g.position.y, -t * 1.1, 0.06);
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, 1 - t * 0.12, 0.06));
    void delta;
  });

  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[5, 6, 4]} intensity={55} color="#e5c378" />
      <pointLight position={[-6, -3, 3]} intensity={40} color="#c59b53" />
      <pointLight position={[0, -5, -4]} intensity={25} color="#faf8f5" />
      <directionalLight position={[2, 5, 6]} intensity={1.4} color="#ffffff" />

      <Stars radius={70} depth={40} count={2400} factor={3} saturation={0.4} fade speed={0.6} />
      <Sparkles count={90} scale={[12, 8, 6]} size={2.4} speed={0.35} color="#e5c378" opacity={0.75} />
      <Sparkles count={60} scale={[10, 6, 5]} size={1.8} speed={0.25} color="#c59b53" opacity={0.6} />

      <group ref={group}>
        {/* gold & amber floor rings */}
        <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.5}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.7, 0]}>
            <ringGeometry args={[2.6, 2.72, 64]} />
            <meshBasicMaterial color="#e5c378" transparent opacity={0.35} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.68, 0]}>
            <ringGeometry args={[1.7, 1.76, 64]} />
            <meshBasicMaterial color="#c59b53" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        </Float>

        <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.9}>
          <Dumbbell position={[-2.6, 0.1, 0.4]} rotation={[0.1, 0.5, 0.15]} scale={0.95} tone="gold" />
        </Float>

        <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.7}>
          <Dumbbell position={[2.5, -0.3, -0.2]} rotation={[0.2, -0.6, -0.1]} scale={0.8} tone="amber" />
        </Float>

        <Float speed={1.3} rotationIntensity={0.15} floatIntensity={0.8}>
          <Barbell position={[0, -0.75, -1.6]} rotation={[0.06, 0.2, -0.28]} scale={0.9} />
        </Float>

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.9}>
          <PlateStack position={[3.1, -1.25, 0.9]} rotation={[0, 0.4, 0.05]} />
        </Float>

        <Float speed={1.8} rotationIntensity={0.3} floatIntensity={1.1}>
          <HoloPanel position={[-0.2, 1.05, 1.55]} rotation={[0.05, 0.12, 0.03]} />
        </Float>
      </group>
    </>
  );
}

function SceneFallback() {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 35%, rgba(229,195,120,0.22), transparent 70%), radial-gradient(ellipse 40% 35% at 75% 60%, rgba(197,155,83,0.15), transparent 70%)",
        }}
      />
    </div>
  );
}

export function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.4, 6.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <GymScene />
      </Suspense>
    </Canvas>
  );
}

export { SceneFallback };
