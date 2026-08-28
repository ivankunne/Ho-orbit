import { useState, useCallback, useEffect } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { X, ZoomIn, Check } from 'lucide-react';
import { Button } from '@components/ui/button';

const OUTPUT_SIZE = 800; // fixed square export — every cover is rendered as a square (object-cover) app-wide

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedFile(imageSrc: string, area: Area, fileName: string, mimeType: string): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas wordt niet ondersteund.');
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  const type = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Bijsnijden mislukt.')); return; }
      resolve(new File([blob], fileName, { type }));
    }, type, 0.92);
  });
}

// Crop/zoom/pan step shown between "pick a file" and "actually upload it" —
// every cover image in the app is rendered as a square via object-cover, so
// this always exports a fixed square regardless of the source image's shape.
export default function ImageCropModal({
  file, title = 'Cover aanpassen', onCancel, onConfirm,
}: { file: File; title?: string; onCancel: () => void; onConfirm: (croppedFile: File) => void }) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => URL.revokeObjectURL(imageSrc), [imageSrc]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => setCroppedArea(areaPixels), []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const croppedFile = await getCroppedFile(imageSrc, croppedArea, file.name, file.type);
      onConfirm(croppedFile);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onCancel} />
      <div
        className="relative bg-[#1e1833] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-sm overflow-hidden z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <p className="text-sm font-semibold text-white">{title}</p>
          <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Annuleer">
            <X size={18} />
          </button>
        </div>

        <div className="relative w-full aspect-square bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <ZoomIn size={16} className="text-slate-400 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-full accent-violet-500"
              aria-label="Zoom"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>Annuleer</Button>
            <Button type="button" className="flex-1" onClick={handleConfirm} disabled={saving || !croppedArea}>
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={16} /> Gebruiken</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
