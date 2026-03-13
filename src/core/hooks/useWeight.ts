import { useSettingsStore, WeightUnit } from '../stores/settingsStore';

const KG_TO_LBS = 2.20462;

export function useWeight() {
  const { weightUnit } = useSettingsStore();

  const convert = (value: number | null, fromUnit: WeightUnit = 'kg'): number | null => {
    if (value === null) return null;
    if (fromUnit === weightUnit) return value;
    
    if (fromUnit === 'kg' && weightUnit === 'lbs') {
      return value * KG_TO_LBS;
    } else {
      return value / KG_TO_LBS;
    }
  };

  const formatWithUnit = (value: number | null, fromUnit: WeightUnit = 'kg'): string => {
    const converted = convert(value, fromUnit);
    if (converted === null) return '--';
    return `${Math.round(converted * 10) / 10} ${weightUnit}`;
  };

  return {
    weightUnit,
    convert,
    formatWithUnit,
  };
}
