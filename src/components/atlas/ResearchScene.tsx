import { Suspense, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { CatmullRomCurve3, Group, MathUtils, Vector3 } from "three";

export type BackgroundInput = { x: number; y: number; scroll: number; pulse: number };
type SceneProps = { mode: string; paused: boolean; input: RefObject<BackgroundInput>; colors: { ink: string; faint: string; paper: string } };

// A stylised emblem, rather than an anatomical animal: one serpent, one
// unwinged staff. The single coil must not read as a double DNA helix.
function AsclepiusRod({ colors }: Pick<SceneProps, "colors">) {
  const curve = useMemo(() => new CatmullRomCurve3(Array.from({ length: 97 }, (_, i) => {
    const t = i / 96;
    const angle = t * Math.PI * 6;
    const radius = 0.52 + Math.max(0, (t - 0.9) / 0.1) * 0.5;
    return new Vector3(Math.cos(angle) * radius, (t - 0.5) * 10.8, Math.sin(angle) * radius);
  })), []);
  return <>
    <mesh>
      <capsuleGeometry args={[0.12, 12.6, 6, 12]} />
      <meshStandardMaterial color={colors.faint} roughness={0.9} metalness={0.05} />
    </mesh>
    <mesh>
      <tubeGeometry args={[curve, 192, 0.105, 10, false]} />
      <meshStandardMaterial color={colors.ink} roughness={0.6} metalness={0.18} />
    </mesh>
    <group position={[1.02, 5.4, 0]} rotation={[0, 0, -0.18]}>
      <mesh scale={[0.32, 0.14, 0.19]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={colors.ink} roughness={0.6} metalness={0.18} />
      </mesh>
      <mesh position={[0.12, 0.06, 0.16]}>
        <sphereGeometry args={[0.027, 8, 6]} />
        <meshStandardMaterial color={colors.paper} roughness={0.9} />
      </mesh>
    </group>
  </>;
}

function Pathways({ colors }: Pick<SceneProps, "colors">) {
  const paths = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const y = (i - 3) * 1.8;
    return new CatmullRomCurve3([
      new Vector3(-1.8, y - 2, -0.6), new Vector3(-0.7, y - 0.4, 0.4),
      new Vector3(0.2, y, -0.3), new Vector3(1.6, y + 0.7, 0.8),
      new Vector3(2.3, y + 2, 0),
    ]);
  }), []);
  return <>{paths.map((curve, i) => <group key={i}>
    <mesh><tubeGeometry args={[curve, 36, 0.025, 5, false]} /><meshStandardMaterial color={i % 2 ? colors.faint : colors.ink} roughness={0.65} /></mesh>
    {[0.15, 0.5, 0.85].map(t => <mesh key={t} position={curve.getPoint(t)}><octahedronGeometry args={[0.08]} /><meshStandardMaterial color={colors.ink} roughness={0.5} metalness={0.2} /></mesh>)}
  </group>)}</>;
}

function ResearchForms({ mode, paused, input, colors }: SceneProps) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const time = useRef(0);
  const { viewport } = useThree();
  // Initialise once. JSX transform props would overwrite the animated pose
  // whenever pause, visibility, or the current page changes.
  useLayoutEffect(() => {
    [left.current, right.current].forEach((group, i) => {
      if (!group) return;
      const sign = i === 0 ? -1 : 1;
      group.position.set(sign * viewport.width * 0.38, 0, -1 - i);
      group.rotation.set(i === 0 ? 0.15 : -0.1, sign * 0.4, sign * 0.18);
      group.scale.setScalar(Math.min(0.9, viewport.height / 17, viewport.width / 12));
    });
  }, []);
  useFrame((_, rawDelta) => {
    if (paused) return;
    const dt = Math.min(rawDelta, 0.05);
    time.current += dt;
    const smooth = 1 - Math.exp(-3 * dt);
    const { x, y, scroll, pulse } = input.current;
    input.current.pulse *= Math.exp(-4 * dt);
    const search = mode === "/";
    [left.current, right.current].forEach((group, i) => {
      if (!group) return;
      const sign = i === 0 ? -1 : 1;
      group.position.x = MathUtils.lerp(group.position.x, sign * viewport.width * 0.38 + (search ? x * 0.25 : 0), smooth);
      group.position.y = MathUtils.lerp(group.position.y, Math.sin(time.current * 0.16 + i) * 0.15 + scroll * sign * 0.6 + (search ? y * 0.2 : 0), smooth);
      group.rotation.y = MathUtils.lerp(group.rotation.y, sign * 0.4 + Math.sin(time.current * 0.12) * 0.18 + scroll * sign * 0.35 + (search ? x * 0.2 + pulse * 0.12 : 0), smooth);
      group.rotation.z = MathUtils.lerp(group.rotation.z, sign * 0.18 + scroll * sign * 0.08, smooth);
      const scale = Math.min(0.9, viewport.height / 17, viewport.width / 12);
      group.scale.setScalar(MathUtils.lerp(group.scale.x, scale, smooth));
    });
  });
  return <>
    <group ref={left}>
      <AsclepiusRod colors={colors} />
    </group>
    <group ref={right}>
      <Pathways colors={colors} />
    </group>
  </>;
}

export default function ResearchScene(props: SceneProps) {
  return <Canvas dpr={1} camera={{ position: [0, 0, 20], fov: 42 }} frameloop={props.paused ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={0.9} />
    <directionalLight position={[3, 6, 8]} intensity={1.6} color={props.colors.paper} />
    <Suspense fallback={null}><Environment resolution={32}>
      <Lightformer intensity={1.5} position={[0, 4, 5]} scale={[10, 10, 1]} color={props.colors.paper} />
    </Environment></Suspense>
    <ResearchForms {...props} />
  </Canvas>;
}