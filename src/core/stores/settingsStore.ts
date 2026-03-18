import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeightUnit = 'kg' | 'lbs';

interface SettingsState {
  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;
  toggleWeightUnit: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      weightUnit: 'kg',
      setWeightUnit: (unit) => set({ weightUnit: unit }),
      toggleWeightUnit: () =>
        set((state) => ({ weightUnit: state.weightUnit === 'kg' ? 'lbs' : 'kg' })),
    }),
    {
      name: 'ts-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
