import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// The browser's own QR reader (Chrome and Edge on Android, Chrome on computers).
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const getDetector = (): BarcodeDetectorConstructor | undefined =>
  (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

interface QrScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
}

// Films with the back camera until a QR code is read, then hands its content over.
export const QrScanner: React.FC<QrScannerProps> = ({ onResult, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Detector = getDetector();
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setError("Ce navigateur ne sait pas lire les QR codes. Utilisez Chrome sur Android, ou saisissez le code.");
      return;
    }
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    const detector = new Detector({ formats: ['qr_code'] });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        await video.play().catch(() => {});
        timer = setInterval(async () => {
          if (video.readyState < 2) return;
          try {
            const [code] = await detector.detect(video);
            if (code?.rawValue && !stopped) {
              stopped = true;
              onResult(code.rawValue);
            }
          } catch {
            // A frame that cannot be read: try the next one.
          }
        }, 300);
      })
      .catch(() => setError("Accès à la caméra refusé. Autorisez la caméra pour ce site, ou saisissez le code."));

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-neutral-700 bg-black aspect-square max-w-xs mx-auto">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-8 border-2 border-amber-400/80 rounded-xl pointer-events-none" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la caméra"
          className="absolute top-2 right-2 p-1.5 bg-black/80 border border-neutral-600 rounded-lg text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className={`text-xs text-center font-sans ${error ? 'text-rose-300 font-bold' : 'text-neutral-400'}`}>
        {error ?? 'Placez le QR code du client dans le cadre.'}
      </p>
    </div>
  );
};
