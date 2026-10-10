import type { PaymentMethod, Reservation } from './types';

// A payment receipt the client can keep or send on WhatsApp. It is a picture, so it opens on any phone.
// It never shows the full ticket code: whoever has the code can take the fuel.

const PAYMENT_NAMES: Record<PaymentMethod, string> = {
  MIXX_BY_YAS: 'Mixx by Yas',
  TMONEY: 'Mixx by Yas',
  MOOV_MONEY: 'Moov Money (Flooz)',
  FLOOZ: 'Moov Money (Flooz)',
  CARD: 'Carte bancaire',
};

const fcfa = (n: number) => `${n.toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const maskCode = (code: string) => code.replace(/^(RNK-)(\w+)(-\w+)$/, (_m, a, b, c) => `${a}${'•'.repeat(b.length)}${c}`);
export const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '').slice(-8);
  return digits.length === 8 ? `+228 ${digits.slice(0, 2)} •• •• ${digits.slice(6)}` : phone;
};

export function receiptStatus(r: Reservation): string {
  switch (r.status) {
    case 'VALIDATED':
      return r.validatedAt ? `Servi le ${dateTime(r.validatedAt)}` : 'Servi à la pompe';
    case 'CANCELLED':
      return 'Annulé';
    case 'EXPIRED':
      return 'Expiré (non servi)';
    default:
      return `À servir avant ${new Date(r.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

// The lines of the receipt, label then value; empty label = section break.
export function receiptLines(r: Reservation): [string, string][] {
  const fuelAmount = r.liters * r.pricePerLiter;
  return [
    ['Date', dateTime(r.createdAt)],
    ['Référence', r.id.slice(0, 8).toUpperCase()],
    ['Ticket', maskCode(r.code)],
    ['', ''],
    ['Station', r.stationName],
    ['Adresse', r.stationAddress],
    ['Carburant', r.fuelLabel],
    ['Quantité', `${r.liters} L × ${fcfa(r.pricePerLiter)}`],
    ['', ''],
    ['Carburant', fcfa(fuelAmount)],
    ['Frais de service', r.serviceFeeXOF > 0 ? fcfa(r.serviceFeeXOF) : 'Offerts'],
    ['Total payé', fcfa(r.totalAmountXOF)],
    ['Paiement', PAYMENT_NAMES[r.paymentMethod]],
    ['Payé depuis', maskPhone(r.phonePayment)],
    ['Client', r.userName],
    ['Statut', receiptStatus(r)],
  ];
}

// Splits a long value so it fits the receipt width.
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawReceipt(r: Reservation): Promise<Blob> {
  const W = 720;
  const pad = 48;
  const valueX = 290;
  const font = (weight: number, size: number) => `${weight} ${size}px 'Figtree', Arial, sans-serif`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // First pass measures the height, the second draws.
  const layout = (draw: boolean) => {
    let y = 0;
    if (draw) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00553c';
      ctx.fillRect(0, 0, W, 150);
      ctx.fillStyle = '#ffc81e';
      ctx.fillRect(0, 150, W, 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = font(800, 44);
      ctx.fillText('Pleino', pad, 78);
      ctx.font = font(600, 24);
      ctx.fillText('Reçu de paiement carburant', pad, 118);
    }
    y = 200;
    for (const [label, value] of receiptLines(r)) {
      if (!label) {
        if (draw) {
          ctx.strokeStyle = '#d4d4d4';
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(pad, y - 14);
          ctx.lineTo(W - pad, y - 14);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        y += 22;
        continue;
      }
      const isTotal = label === 'Total payé';
      ctx.font = font(isTotal ? 800 : 600, isTotal ? 30 : 24);
      const lines = wrap(ctx, value, W - pad - valueX);
      if (draw) {
        ctx.fillStyle = '#525252';
        ctx.font = font(500, 22);
        ctx.fillText(label, pad, y);
        ctx.fillStyle = '#000000';
        ctx.font = font(isTotal ? 800 : 600, isTotal ? 30 : 24);
        lines.forEach((line, i) => ctx.fillText(line, valueX, y + i * 32));
      }
      y += lines.length * 32 + (isTotal ? 18 : 14);
    }
    y += 20;
    ctx.font = font(500, 19);
    const note = wrap(ctx, 'Ce reçu ne permet pas de se servir : le code complet reste dans l’application Pleino. ronikov.onrender.com', W - 2 * pad);
    if (draw) {
      ctx.fillStyle = '#737373';
      note.forEach((line, i) => ctx.fillText(line, pad, y + i * 28));
    }
    return y + note.length * 28 + 30;
  };

  if (document.fonts?.ready) await document.fonts.ready;
  canvas.width = W;
  canvas.height = 2000;
  const height = layout(false);
  canvas.height = height; // resizing clears the canvas and its settings
  layout(true);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
}

// Opens the phone's share menu (WhatsApp, SMS...) or, on a computer, downloads the picture.
export async function shareReceipt(r: Reservation): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await drawReceipt(r);
  const name = `recu-pleino-${r.id.slice(0, 8)}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Reçu Pleino', text: `Reçu Pleino : ${r.liters} L de ${r.fuelLabel} à ${r.stationName}` });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
