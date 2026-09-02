'use client';

import { useEffect, useRef } from 'react';
import { Chart as ChartJs, registerables, type ChartConfiguration, type ChartType } from 'chart.js';
import { cssVar, useThemeKey } from '@/lib/theme';

ChartJs.register(...registerables);

interface Props<T extends ChartType> {
  config: () => ChartConfiguration<T>;
  height?: number;
  className?: string;
}

export function Chart<T extends ChartType>({ config, height = 260, className = '' }: Props<T>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const chart = useRef<ChartJs | null>(null);
  // Читаем тему и акцент: при их смене график перерисуется новой палитрой.
  const themeKey = useThemeKey();

  useEffect(() => {
    if (!canvas.current) {
      return;
    }
    chart.current?.destroy();

    // Общие для всех графиков цвета берём из темы, чтобы подписи не терялись
    // на светлом фоне и не слепили на тёмном.
    ChartJs.defaults.color = cssVar('--ng-muted');
    ChartJs.defaults.borderColor = cssVar('--ng-line');
    ChartJs.defaults.font.family = "'Open Sans', system-ui, sans-serif";

    chart.current = new ChartJs(canvas.current, config() as ChartConfiguration);
    return () => {
      chart.current?.destroy();
      chart.current = null;
    };
  }, [config, themeKey]);

  return (
    <div className={className} style={{ height }}>
      <canvas ref={canvas} />
    </div>
  );
}
