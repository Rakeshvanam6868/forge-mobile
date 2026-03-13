import { renderHook } from '@testing-library/react-hooks';
import { useWeight } from '../useWeight';
import { useSettingsStore } from '../../stores/settingsStore';

// Mock zustand store
jest.mock('../../stores/settingsStore', () => ({
  useSettingsStore: jest.fn(),
}));

describe('Unit Conversion Logic (KG / LBS)', () => {
  it('should format kg correctly when unit is kg', () => {
    (useSettingsStore as any).mockReturnValue({ weightUnit: 'kg' });
    const { result } = renderHook(() => useWeight());

    expect(result.current.formatWithUnit(100)).toBe('100 kg');
    expect(result.current.formatWithUnit(72.5)).toBe('72.5 kg');
  });

  it('should convert and format kg to lbs accurately', () => {
    (useSettingsStore as any).mockReturnValue({ weightUnit: 'lbs' });
    const { result } = renderHook(() => useWeight());

    // 100 kg * 2.20462 = 220.462... Rounding in hook is Math.round(v * 10) / 10
    expect(result.current.formatWithUnit(100)).toBe('220.5 lbs');
    expect(result.current.formatWithUnit(50)).toBe('110.2 lbs');
  });

  it('should convert and format lbs to kg accurately', () => {
    (useSettingsStore as any).mockReturnValue({ weightUnit: 'kg' });
    const { result } = renderHook(() => useWeight());

    // 220.5 lbs / 2.20462 = 100.01...
    expect(result.current.formatWithUnit(220.5, 'lbs')).toBe('100 kg');
  });

  it('should return "--" for null values', () => {
    (useSettingsStore as any).mockReturnValue({ weightUnit: 'kg' });
    const { result } = renderHook(() => useWeight());

    expect(result.current.formatWithUnit(null)).toBe('--');
  });

  it('should handle zero correctly', () => {
    (useSettingsStore as any).mockReturnValue({ weightUnit: 'lbs' });
    const { result } = renderHook(() => useWeight());

    expect(result.current.formatWithUnit(0)).toBe('0 lbs');
  });
});
