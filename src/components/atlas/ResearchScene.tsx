import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { CatmullRomCurve3, Group, MathUtils, Vector3 } from "three";

export type BackgroundInput = { x: number; y: number; scroll: number; pulse: number };
type SceneProps = { mode: string; paused: boolean; input: RefObject<BackgroundInput>; colors: { ink: string; faint: string; paper: string } };

function Strand({ phase, color }: { phase: number; color: string }) {
  const curve = useMemo(() => new CatmullRomCurve3(Array.from({ length: 97 }, (_, i) => {
    const y = (i / 96 - 0.5) * 14;
    const angle = i / 96 * Math.PI * 5 + phase;
    return new Vector3(Math.cos(angle) * 1.1, y, Math.sin(angle) * 1.1);
  })), [phase]);
  return <mesh><tubeGeometry args={[curve, 160, 0.035, 6, false]} /><meshStandardMaterial color={color} roughness={0.55} metalness={0.15} /></mesh>;
}

function Helix({ colors }: Pick<SceneProps, "colors">) {
  return <>
    <Strand phase={0} color={colors.ink} />
    <Strand phase={Math.PI} color={colors.faint} />
    {Array.from({ length: 27 }, (_, i) => {
      const y = (i / 26 - 0.5) * 14;
      const angle = i / 26 * Math.PI * 5;
      return <mesh key={i} position={[0, y, 0]} rotation={[0, -angle, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 2.2, 5]} />
        <meshStandardMaterial color={i % 3 === 0 ? colors.ink : colors.faint} roughness={0.85} />
      </mesh>;
    })}
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
  useFrame((_, rawDelta) => {
    if (paused) return;
    const dt = Math.min(rawDelta, 0.05);
    time.current += dt;
    const smooth = 1 - Math.exp(-3 * dt);
    const { x, y, scroll, pulse } = input.current;
    const search = mode === "/";
    [left.current, right.current].forEach((group, i) => {
      if (!group) return;
      const sign = i === 0 ? -1 : 1;
      group.position.x = MathUtils.lerp(group.position.x, sign * viewport.width * 0.43 + (search ? x * 0.4 : 0), smooth);
      group.position.y = MathUtils.lerp(group.position.y, Math.sin(time.current * 0.16 + i) * 0.15 + scroll * sign * 1.5 + (search ? y * 0.3 : 0), smooth);
      group.rotation.y = MathUtils.lerp(group.rotation.y, time.current * sign * 0.025 + scroll * sign * 1.2 + (search ? x * 0.4 + pulse * 0.25 : 0), smooth);
      group.rotation.z = MathUtils.lerp(group.rotation.z, sign * 0.25 + scroll * sign * 0.16, smooth);
      const scale = viewport.width < 10 ? 0.65 : 0.9;
      group.scale.setScalar(scale);
    });
  });
  const network = mode === "/explore" || mode === "/next-step";
  return <>
    <group ref={left} position={[-viewport.width * 0.43, 0, -1]} rotation={[0.15, 0.4, -0.25]} scale={viewport.width < 10 ? 0.65 : 0.9}>
      {network ? <Pathways colors={colors} /> : <Helix colors={colors} />}
    </group>
    <group ref={right} position={[viewport.width * 0.43, 0, -2]} rotation={[-0.1, -0.5, 0.25]} scale={viewport.width < 10 ? 0.65 : 0.9}>
      {mode === "/" || mode === "/next-step" ? <Helix colors={colors} /> : <Pathways colors={colors} />}
    </group>
  </>;
}

export default function ResearchScene(props: SceneProps) {
  return <Canvas dpr={1} camera={{ position: [0, 0, 20], fov: 42 }} frameloop={props.paused ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={0.9} />
    <directionalLight position={[3, 6, 8]} intensity={1.6} color={props.colors.paper} />
    <Environment resolution={32}>
      <Lightformer intensity={1.5} position={[0, 4, 5]} scale={[10, 10, 1]} color={props.colors.paper} />
    </Environment>
    <ResearchForms {...props} />
  </Canvas>;
}