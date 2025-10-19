'use client';

import { useContext } from 'react';
import { ScenarioContext } from '@/contexts/ScenarioContext';

export const useScenario = () => {
  const context = useContext(ScenarioContext);
  if (context === undefined) {
    throw new Error('useScenario must be used within a ScenarioProvider');
  }
  return context;
};
