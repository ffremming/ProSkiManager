import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";

type EnvironmentProps = {
  shadows?: boolean;
  weather?: "clear" | "snow" | "fog";
  timeOfDay?: "noon" | "sunrise" | "dusk";
};

export function Environment({ shadows = true, weather = "clear", timeOfDay = "noon" }: EnvironmentProps) {
  const { scene } = useThree();

  const preset = useMemo(() => {
    if (timeOfDay === "sunrise")
      return { bg: "#0c0f1d", fog: "#0d1524", fogDensity: 0.011, sunPos: [45, 90, 35] as [number, number, number], sunIntensity: 1.0 };
    if (timeOfDay === "dusk")
      return { bg: "#0a0d18", fog: "#0c1221", fogDensity: 0.013, sunPos: [20, 80, -25] as [number, number, number], sunIntensity: 0.9 };
    return { bg: "#0c1220", fog: "#0c1422", fogDensity: 0.01, sunPos: [60, 120, 40] as [number, number, number], sunIntensity: 1.35 };
  }, [timeOfDay]);

  useEffect(() => {
    const fogDensity = weather === "fog" ? preset.fogDensity * 1.8 : preset.fogDensity;
    scene.background = new THREE.Color(preset.bg);
    scene.fog = new THREE.FogExp2(weather === "fog" ? preset.fog : preset.fog, fogDensity);
  }, [scene, preset, weather]);

  const hemiTop = weather === "snow" ? "#d6e2f3" : "#cbd5e1";
  const hemiBottom = weather === "fog" ? "#0a0f1c" : "#0b1220";

  return (
    <>
      <hemisphereLight args={[hemiTop, hemiBottom, 0.35]} />
      <directionalLight
        position={preset.sunPos}
        intensity={preset.sunIntensity}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={240}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <directionalLight position={[-40, 80, -30]} intensity={0.25} />
    </>
  );
}
