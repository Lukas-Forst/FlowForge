import type { ReactElement } from "react";
import { useMemo } from "react";
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import type { PostFxPulse } from "../../game/types";
import { pulseStrength } from "./qualityController";

interface PostFXProps {
  pulse: PostFxPulse | null;
  quality?: "full" | "lite";
}

export function PostFX({ pulse, quality = "full" }: PostFXProps): ReactElement {
  const strength = pulseStrength(pulse);
  const chromaOffset = useMemo<[number, number]>(() => [0.0005 + strength * 0.004, 0.001 + strength * 0.006], [strength]);

  return (
    <EffectComposer multisampling={4}>
      <Bloom intensity={Math.min(0.6, 0.45 + strength * 0.8)} luminanceThreshold={0.35} luminanceSmoothing={0.25} />
      {quality === "full" ? (
        <>
          <Vignette eskil={false} offset={0.15} darkness={0.42} />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={chromaOffset} />
        </>
      ) : (
        <></>
      )}
    </EffectComposer>
  );
}
