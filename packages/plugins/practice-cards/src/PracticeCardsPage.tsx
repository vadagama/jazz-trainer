import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExerciseWizard } from './components/ExerciseWizard.js';
import { ExerciseRunner } from './components/ExerciseRunner.js';
import { ExerciseComplete } from './components/ExerciseComplete.js';
import type { ExerciseConfig, PracticeBar } from './generators/types.js';

type Screen = 'wizard' | 'practice' | 'complete';

export default function PracticeCardsPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('wizard');
  const [lastConfig, setLastConfig] = useState<ExerciseConfig | null>(null);
  const [lastBars, setLastBars] = useState<PracticeBar[]>([]);

  const handleStart = useCallback((config: ExerciseConfig, bars: PracticeBar[]) => {
    setLastConfig(config);
    setLastBars(bars);
    setScreen('practice');
  }, []);

  const handleComplete = useCallback(() => {
    setScreen('complete');
  }, []);

  const handleReconfigure = useCallback(() => {
    setScreen('wizard');
  }, []);

  const handleFinish = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  if (screen === 'practice' && lastConfig) {
    return (
      <ExerciseRunner
        bars={lastBars}
        config={lastConfig}
        onComplete={handleComplete}
        onReconfigure={handleReconfigure}
      />
    );
  }

  if (screen === 'complete' && lastConfig) {
    return (
      <ExerciseComplete
        config={lastConfig}
        barsCount={lastBars.length}
        tempo={lastConfig.tempo}
        onRepeat={() => setScreen('practice')}
        onReconfigure={handleReconfigure}
        onFinish={handleFinish}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-center text-2xl font-bold">Карточки</h1>
        <ExerciseWizard onStart={handleStart} initialConfig={lastConfig} />
      </div>
    </div>
  );
}
