'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  value: string;
  size?: number;
  /** Уровень коррекции: M хватает и для экрана, и для печати. */
  level?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
}

/**
 * QR-код. Рисуется в SVG, а не в canvas: так он остаётся чётким при любом
 * масштабе и не мылится на экранах с высокой плотностью точек.
 */
export function QrCode({ value, size = 180, level = 'M', className = '' }: Props) {
  const [markup, setMarkup] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: level,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((svg) => {
        if (!cancelled) {
          setMarkup(svg.replace('<svg', '<svg width="100%" height="100%"'));
        }
      })
      .catch(() => setMarkup(''));

    return () => {
      cancelled = true;
    };
  }, [value, level]);

  return (
    <div
      className={`bg-white p-3 ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
