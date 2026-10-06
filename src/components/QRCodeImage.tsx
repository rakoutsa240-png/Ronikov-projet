import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeImageProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeImage: React.FC<QRCodeImageProps> = ({ value, size = 160, className = '' }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!value) return;
    setError(false);
    
    // Format payload for maximum compatibility with standard QR scanners
    QRCode.toDataURL(
      value,
      {
        width: size * 2, // higher resolution for sharp display and scanning
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!err && url) {
          setDataUrl(url);
        } else {
          console.error('Failed to generate real QR code:', err);
          setError(true);
        }
      }
    );
  }, [value, size]);

  if (error) {
    return (
      <div 
        style={{ width: size, height: size }}
        className="bg-neutral-100 text-neutral-800 flex flex-col items-center justify-center p-2 rounded-xl text-center border border-neutral-300"
      >
        <span className="text-[11px] font-mono-code font-bold text-red-600">Erreur QR</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="bg-neutral-100 text-neutral-500 flex items-center justify-center rounded-xl p-2 animate-pulse border border-neutral-200"
      >
        <span className="text-[11px] font-mono-code font-bold">Code QR...</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`Code QR scannable: ${value}`}
      title="Code QR scannable par le pompiste"
      className={`bg-white rounded-xl border border-neutral-200 p-2 shadow-sm object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
