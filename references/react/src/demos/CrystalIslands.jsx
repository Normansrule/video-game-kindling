// references/react/src/demos/CrystalIslands.jsx   (JavaScript twin: samples/3d/04-coin-collector)
// WHAT: A 3D platformer in react-three-fiber (React components that build a three.js scene):
//       floating islands with shadows, a sunset sky and fog, glowing crystals, and a follow camera.
// WHY:  The key react-three-fiber rule for games: per-frame motion goes through refs inside
//       useFrame (mesh.position.set), never through useState. React state changes only on
//       rare events, like collecting a crystal, so React re-renders a handful of times per game.
import { Float, Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useActions } from "../hooks/useActions.js";
import { createPlayer, CRYSTALS, ISLANDS, PLAYER_SIZE, stepPlayer, touchedCrystals } from "../logic/islands.js";

const BINDINGS = {
  left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  forward: ["KeyW", "ArrowUp"], back: ["KeyS", "ArrowDown"],
  jump: ["Space"], turnLeft: ["KeyQ"], turnRight: ["KeyE"], restart: ["KeyR"],
};
const STEP = 1 / 60;
const FOG_COLOR = "#f2a08c";

export default function CrystalIslands() {
  const [remaining, setRemaining] = useState(() => CRYSTALS.map((_, index) => index));
  const [round, setRound] = useState(0);   // bump to restart: a new key remounts the scene
  const found = CRYSTALS.length - remaining.length;
  return (
    <>
      <div className="stage sky">
        <Canvas key={round} shadows camera={{ fov: 50, position: [0, 7, 11] }} dpr={[1, 2]}
          aria-label="Crystal islands: a small orange hero on floating islands at sunset, collecting glowing crystals.">
          {/* No background color: the canvas is see-through and the sunset is a CSS gradient
              behind it (.sky in styles.css). The fog fades far islands into the same color. */}
          <fog attach="fog" args={[FOG_COLOR, 16, 52]} />
          <hemisphereLight args={["#ffe2d0", "#6a4a85", 1.8]} />
          <ambientLight intensity={0.35} color="#ffd8e8" />
          <directionalLight castShadow position={[-12, 18, -8]} intensity={2.2} color="#ffd2b0"
            shadow-mapSize={[2048, 2048]} shadow-camera-left={-25} shadow-camera-right={25}
            shadow-camera-top={25} shadow-camera-bottom={-25} shadow-bias={-0.0005} />
          <Islands />
          {remaining.map((index) => <Crystal key={index} position={CRYSTALS[index]} />)}
          <Sparkles count={120} scale={[40, 14, 40]} position={[0, 5, 0]} size={3} speed={0.3} color="#fff2c0" />
          <Player remaining={remaining} onCollect={(indices) => setRemaining((list) => list.filter((i) => !indices.includes(i)))}
            onRestart={() => { setRemaining(CRYSTALS.map((_, index) => index)); setRound((r) => r + 1); }} />
        </Canvas>
        <div className="hud">
          <span className="score">CRYSTALS {found}/{CRYSTALS.length}</span>
        </div>
        {remaining.length === 0 && (
          <div className="overlay">
            <div>
              <h2>ALL CRYSTALS!</h2>
              <button type="button" onClick={() => { setRemaining(CRYSTALS.map((_, index) => index)); setRound((r) => r + 1); }}>Play again</button>
            </div>
          </div>
        )}
      </div>
      <p className="help">WASD or arrows move, Space jumps, Q/E turn the camera, R restarts. Rules: <code>src/logic/islands.js</code>.</p>
    </>
  );
}

function Islands() {
  return ISLANDS.map((box, index) => (
    <group key={index}>
      {/* Grass slab on top, darker rock underneath. Mesh positions are centers, boxes are corners. */}
      <mesh castShadow receiveShadow position={[box.x + box.width / 2, box.y + box.height / 2, box.z + box.depth / 2]}>
        <boxGeometry args={[box.width, box.height, box.depth]} />
        <meshStandardMaterial color={box.color} roughness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[box.x + box.width / 2, box.y - 1.05, box.z + box.depth / 2]}>
        <boxGeometry args={[box.width - 0.8, 2.1, box.depth - 0.8]} />
        <meshStandardMaterial color="#5c4558" roughness={1} />
      </mesh>
    </group>
  ));
}

function Crystal({ position }) {
  const meshRef = useRef(null);
  useFrame((_, delta) => { if (meshRef.current) meshRef.current.rotation.y += delta * 1.5; });
  return (
    <Float speed={2} floatIntensity={0.6} rotationIntensity={0}>
      <group position={position}>
        <mesh ref={meshRef} castShadow scale={[0.45, 0.6, 0.45]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#9ff0ff" emissive="#46dcff" emissiveIntensity={1.6} roughness={0.2} metalness={0.1} />
        </mesh>
        <pointLight color="#46dcff" intensity={6} distance={4} decay={2} />
      </group>
    </Float>
  );
}

function Player({ remaining, onCollect, onRestart }) {
  const actions = useActions(BINDINGS);
  const bodyRef = useRef(null);
  const state = useMemo(() => ({ player: createPlayer(), yaw: 0.6, accumulator: 0, target: { x: 0, y: 0, z: 0 }, squash: 1 }), []);
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;

  useFrame(({ camera }, delta) => {
    // A fixed-step loop inside useFrame: physics at 60 steps a second on any monitor.
    state.accumulator += Math.min(delta, 0.25);
    while (state.accumulator >= STEP) {
      state.accumulator -= STEP;
      if (actions.wasPressed("restart")) onRestart();
      state.yaw += actions.axis("turnLeft", "turnRight") * 2 * STEP;
      const { jumped } = stepPlayer(state.player, {
        moveX: actions.axis("left", "right"),
        moveZ: actions.axis("back", "forward"),
        jumpPressed: actions.wasPressed("jump"),
        jumpReleased: actions.wasReleased("jump"),
      }, state.yaw, STEP);
      if (jumped) state.squash = 1.3;
      const touched = touchedCrystals(state.player, remainingRef.current);
      if (touched.length > 0) onCollect(touched);   // rare: fine to update React state here
      actions.endStep();
    }
    const player = state.player;
    state.squash += (1 - state.squash) * Math.min(1, delta * 10);
    const body = bodyRef.current;
    body.position.set(player.x, player.y + PLAYER_SIZE.height * state.squash / 2, player.z);
    body.scale.set(1 / Math.sqrt(state.squash), state.squash, 1 / Math.sqrt(state.squash));
    body.rotation.y = player.facing;

    // Damped follow camera (frame-rate independent), orbiting by yaw.
    const smooth = 1 - Math.pow(0.001, delta);
    state.target.x += (player.x - state.target.x) * smooth;
    state.target.y += (player.y + 0.5 - state.target.y) * (1 - Math.pow(0.01, delta));
    state.target.z += (player.z - state.target.z) * smooth;
    camera.position.set(state.target.x + Math.sin(state.yaw) * 10, state.target.y + 6.5, state.target.z + Math.cos(state.yaw) * 10);
    camera.lookAt(state.target.x, state.target.y + 0.8, state.target.z);
  });

  return (
    <group ref={bodyRef}>
      <mesh castShadow>
        <boxGeometry args={[PLAYER_SIZE.width, PLAYER_SIZE.height, PLAYER_SIZE.depth]} />
        <meshStandardMaterial color="#ff8c40" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.1, 0.36]}>
        <boxGeometry args={[0.3, 0.16, 0.08]} />
        <meshStandardMaterial color="#2a2035" />
      </mesh>
    </group>
  );
}
