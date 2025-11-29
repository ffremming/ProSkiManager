import { RaceInput } from "./types";

type GearModifiers = { gripMod: number; glideMod: number };

export function resolveGear(input: RaceInput): GearModifiers {
  const ski = input.equipment?.items.find((i) => i.id === input.prep?.skiChoice);
  const wax = input.equipment?.items.find((i) => i.id === input.prep?.waxChoice);
  const grip = ski?.grip ?? 70;
  const glide = ski?.glide ?? 70;
  const waxGrip = wax?.grip ?? 70;
  const waxGlide = wax?.glide ?? 70;

  const gripMod = (140 - (grip + waxGrip)) / 500; // better grip => lower penalty
  const glideMod = 0.9 + ((glide + waxGlide) / 200) * 0.2; // 0.9..1.1
  return { gripMod, glideMod };
}

export type { GearModifiers };
