'use client';
import { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
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

const createScenarioId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeSavedScenarios = (raw: unknown[]): SavedScenario[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;

      const record = entry as Partial<SavedScenario> & {
        scenario?: Scenario;
        vehicle?: Vehicle;
        monthlyPayment?: number;
        totalCost?: number;
        dueAtSigning?: number;
        termMonths?: number;
        planType?: 'finance' | 'lease';
        savedAt?: string;
        id?: string;
      };

      if (!record.vehicle || !record.scenario) {
        return null;
      }

      const planType = record.planType === 'lease' ? 'lease' : 'finance';
      const monthlyPayment = typeof record.monthlyPayment === 'number' ? record.monthlyPayment : 0;
      const leaseTerm = record.scenario.leaseTerm ?? defaultScenario.leaseTerm;
      const financeTerm = record.scenario.financeTerm ?? defaultScenario.financeTerm;
      const termMonths = typeof record.termMonths === 'number'
        ? record.termMonths
        : planType === 'lease'
          ? leaseTerm
          : financeTerm;

      const calculatedTotal = monthlyPayment * termMonths;
      const totalCost = typeof record.totalCost === 'number' ? record.totalCost : calculatedTotal;
      const dueAtSigning = typeof record.dueAtSigning === 'number'
        ? record.dueAtSigning
        : (record.scenario.downPayment ?? defaultScenario.downPayment) + (record.scenario.tradeInValue ?? 0) + monthlyPayment;

      return {
        id: record.id ?? `legacy-${index}-${createScenarioId()}`,
        planType,
        scenario: record.scenario,
        vehicle: record.vehicle,
        monthlyPayment,
        dueAtSigning,
        totalCost,
        termMonths,
        savedAt: record.savedAt ?? new Date().toISOString(),
      } satisfies SavedScenario;
    })
    .filter((value): value is SavedScenario => Boolean(value));
};

interface ScenarioContextValue {
  scenario: Scenario;
  updateScenario: (updates: Partial<Scenario>) => void;
  isOnboarded: boolean;
  setOnboardingOpen: (open: boolean) => void;
  activeVehicle: Vehicle | null;
  setActiveVehicle: (vehicle: Vehicle | null) => void;
  savedScenarios: SavedScenario[];
  saveScenarioOption: (option: 'finance' | 'lease') => SavedScenario | null;
  applySavedScenario: (id: string) => SavedScenario | null;
  removeSavedScenario: (id: string) => void;
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
        setSavedScenarios(normalizeSavedScenarios(parsed.savedScenarios || []));
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
      console.error('Failed to save to localStorage', error);
    }
  }, []);

  const debouncedPersist = useDebouncedCallback(
    (newScenario: Scenario, newSavedScenarios: SavedScenario[]) => {
      persistState({ scenario: newScenario, savedScenarios: newSavedScenarios });
    },
    500,
  );

  const updateScenario = useCallback(
    (updates: Partial<Scenario>) => {
      setScenario((prev: Scenario) => {
        const newScenario = { ...prev, ...updates };
        debouncedPersist(newScenario, savedScenarios);
        return newScenario;
      });
    },
    [debouncedPersist, savedScenarios],
  );

  const setOnboardingOpen = useCallback(
    (open: boolean) => {
      setIsOnboarded(!open);
      if (!open) {
        persistState({ scenario, savedScenarios });
      }
    },
    [persistState, scenario, savedScenarios],
  );

  const saveScenarioOption = useCallback((option: 'finance' | 'lease'): SavedScenario | null => {
    if (!activeVehicle) return null;

    const rates = getRatesForTier(scenario.creditScoreTier);

    const { monthlyPayment, termMonths, dueAtSigning, totalCost } = (() => {
      if (option === 'lease') {
        const payment = calculateLeasePayment(
          activeVehicle.msrp,
          activeVehicle.residualValue,
          scenario.leaseTerm,
          rates.moneyFactor,
        );
        const term = scenario.leaseTerm;
        return {
          monthlyPayment: payment,
          termMonths: term,
          dueAtSigning: scenario.downPayment + scenario.tradeInValue + payment,
          totalCost: payment * term + scenario.downPayment - scenario.tradeInValue,
        };
      }

      const financePrincipal = Math.max(
        activeVehicle.msrp - scenario.downPayment - scenario.tradeInValue,
        0,
      );
      const payment = calculateLoanPayment(
        financePrincipal,
        rates.financeApr,
        scenario.financeTerm,
      );
      const term = scenario.financeTerm;
      return {
        monthlyPayment: payment,
        termMonths: term,
        dueAtSigning: scenario.downPayment + scenario.tradeInValue + payment,
        totalCost: payment * term + scenario.downPayment - scenario.tradeInValue,
      };
    })();

    const savedScenario: SavedScenario = {
      id: createScenarioId(),
      planType: option,
      scenario: { ...scenario },
      vehicle: activeVehicle,
      monthlyPayment,
      dueAtSigning,
      totalCost,
      termMonths,
      savedAt: new Date().toISOString(),
    };

    setSavedScenarios((prev: SavedScenario[]) => {
      const filtered = prev.filter(
        (item) => !(item.planType === option && item.vehicle.id === activeVehicle.id),
      );
      const updated = [...filtered, savedScenario].slice(-6);
      persistState({ scenario, savedScenarios: updated });
      return updated;
    });

    return savedScenario;
  }, [activeVehicle, persistState, scenario]);

  const applySavedScenario = useCallback(
    (id: string): SavedScenario | null => {
      const match = savedScenarios.find((item) => item.id === id);
      if (!match) {
        return null;
      }

      setScenario(match.scenario);
      setActiveVehicle(match.vehicle);
      setIsOnboarded(true);
      persistState({ scenario: match.scenario, savedScenarios });
      return match;
    },
    [persistState, savedScenarios, setActiveVehicle, setIsOnboarded],
  );

  const removeSavedScenario = useCallback(
    (id: string) => {
      setSavedScenarios((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        persistState({ scenario, savedScenarios: updated });
        return updated;
      });
    },
    [persistState, scenario],
  );

  const contextValue = useMemo(
    () => ({
      scenario,
      updateScenario,
      isOnboarded,
      setOnboardingOpen,
      activeVehicle,
      setActiveVehicle,
      savedScenarios,
      saveScenarioOption,
      applySavedScenario,
      removeSavedScenario,
      drawerState,
      setDrawerState,
    }),
    [
      scenario,
      updateScenario,
      isOnboarded,
      setOnboardingOpen,
      activeVehicle,
      savedScenarios,
      saveScenarioOption,
      applySavedScenario,
      removeSavedScenario,
      drawerState,
      setDrawerState,
    ],
  );

  return <ScenarioContext.Provider value={contextValue}>{children}</ScenarioContext.Provider>;
}
