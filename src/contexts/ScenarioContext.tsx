'use client';
import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Scenario, Vehicle, SavedScenario, DrawerState } from '@/types';
import { calculateLeasePayment, calculateLoanPayment } from '@/lib/calculations';
import { getRatesForTier } from '@/lib/data';
import { useDebouncedCallback } from 'use-debounce';

const defaultScenario: Scenario = {
  zipCode: '90210',
  creditScoreTier: 'Excellent (720-850)',
  downPayment: 5000,
  tradeInValue: 0,
  monthlyBudget: 550,
  financeTerm: 60,
  leaseTerm: 36,
  annualMileage: 12000,
};

interface ScenarioContextValue {
  scenario: Scenario;
  updateScenario: (updates: Partial<Scenario>) => void;
  isOnboarded: boolean;
  setOnboardingOpen: (open: boolean) => void;
  activeVehicle: Vehicle | null;
  setActiveVehicle: (vehicle: Vehicle | null) => void;
  savedScenarios: SavedScenario[];
  saveCurrentScenario: () => void;
  removeScenario: (index: number) => void;
  drawerState: DrawerState;
  setDrawerState: (state: DrawerState) => void;
}

export const ScenarioContext = createContext<ScenarioContextValue | undefined>(
  undefined
);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<Scenario>(defaultScenario);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, type: null });

  useEffect(() => {
    try {
      const savedData = localStorage.getItem('financeNavigatorScenario');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setScenario(parsed.scenario || defaultScenario);
        setSavedScenarios(parsed.savedScenarios || []);
        setIsOnboarded(true); // User is considered onboarded if there's saved data.
      } else {
        setIsOnboarded(false); // No data, needs onboarding.
      }
    } catch (error) {
        console.error("Failed to load from localStorage", error);
        setIsOnboarded(false);
    }
  }, []);

  type PersistedState = { scenario: Scenario; savedScenarios: SavedScenario[] };

  const persistState = useCallback((newState: PersistedState) => {
    try {
        localStorage.setItem('financeNavigatorScenario', JSON.stringify(newState));
    } catch (error) {
        console.error("Failed to save to localStorage", error);
    }
  }, []);

  const debouncedPersist = useDebouncedCallback(
    (newScenario: Scenario, newSavedScenarios: SavedScenario[]) => {
      persistState({ scenario: newScenario, savedScenarios: newSavedScenarios });
    },
    500,
  );

  const updateScenario = (updates: Partial<Scenario>) => {
    setScenario((prev: Scenario) => {
        const newScenario = { ...prev, ...updates };
        // Debounce the localStorage persistence
        debouncedPersist(newScenario, savedScenarios);
        return newScenario;
    });
  };

  const setOnboardingOpen = (open: boolean) => {
    setIsOnboarded(!open);
    if (!open) {
        // If closing the modal, we assume they've completed it, so persist immediately.
        persistState({ scenario, savedScenarios });
    }
  };

  const saveCurrentScenario = () => {
    if (!activeVehicle || savedScenarios.length >= 3) return;

    const rates = getRatesForTier(scenario.creditScoreTier);
    const financePayment = calculateLoanPayment(activeVehicle.msrp - scenario.downPayment, rates.financeApr, scenario.financeTerm);
    
    const newSavedScenario: SavedScenario = {
      scenario: { ...scenario },
      vehicle: activeVehicle,
      monthlyPayment: financePayment, 
    };

    setSavedScenarios((prev: SavedScenario[]) => {
        const newSaved = [...prev, newSavedScenario];
        persistState({ scenario, savedScenarios: newSaved });
        return newSaved;
    });
  };

  const removeScenario = (index: number) => {
    setSavedScenarios((prev: SavedScenario[]) => {
        const newSaved = prev.filter((_, i) => i !== index);
        persistState({ scenario, savedScenarios: newSaved });
        return newSaved;
    });
  };


  return (
    <ScenarioContext.Provider
      value={{
        scenario,
        updateScenario,
        isOnboarded,
        setOnboardingOpen,
        activeVehicle,
        setActiveVehicle,
        savedScenarios,
        saveCurrentScenario,
        removeScenario,
        drawerState,
        setDrawerState
      }}
    >
      {children}
    </ScenarioContext.Provider>
  );
}
