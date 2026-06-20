import { Composition } from 'remotion';
import { ShareVibeExplainer } from './ShareVibeExplainer';

export const SHAREVIBE_EXPLAINER_FPS = 30;
export const SHAREVIBE_EXPLAINER_SECONDS = 85;
export const SHAREVIBE_EXPLAINER_WIDTH = 1920;
export const SHAREVIBE_EXPLAINER_HEIGHT = 1080;

export const RemotionRoot = () => (
  <Composition
    id="ShareVibeExplainer"
    component={ShareVibeExplainer}
    durationInFrames={SHAREVIBE_EXPLAINER_SECONDS * SHAREVIBE_EXPLAINER_FPS}
    fps={SHAREVIBE_EXPLAINER_FPS}
    width={SHAREVIBE_EXPLAINER_WIDTH}
    height={SHAREVIBE_EXPLAINER_HEIGHT}
  />
);
