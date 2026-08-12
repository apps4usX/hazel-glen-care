// Clock-in/out capture: live camera selfie + GPS, returns { lat, lng, photo }.
// Camera needs a secure context — works on https and on localhost.
import { useEffect, useRef, useState } from 'react';
import Button from './ui/Button';

export default function SelfieCapture({ title = 'Clock in', onCancel, onConfirm }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [coords, setCoords] = useState(null);
  const [geoErr, setGeoErr] = useState('');
  const [camErr, setCamErr] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // start camera
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      } catch (e) { setCamErr('Camera unavailable — you can still use the file option.'); }
    })();
    // grab location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }),
        () => setGeoErr('Location denied — attendance will save without GPS.'),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else setGeoErr('Location not supported on this device.');
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  function snap() {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement('canvas');
    const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * 480) || 360;
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(v, 0, 0, w, h);
    setPhoto(c.toDataURL('image/jpeg', 0.7));
  }
  function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setPhoto(r.result); r.readAsDataURL(f);
  }
  async function confirm() {
    setBusy(true);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    await onConfirm({ lat: coords?.lat, lng: coords?.lng, photo, consent });
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-40 p-4" onClick={onCancel}>
      <div className="bg-white w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h3>
          <button onClick={onCancel} className="text-[#61707A]">✕</button>
        </div>

        <div className="rounded-xl overflow-hidden bg-black aspect-[4/3] grid place-items-center">
          {photo
            ? <img src={photo} alt="selfie" className="w-full h-full object-cover" />
            : <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />}
        </div>
        {camErr && <p className="text-xs text-[#b23b30] mt-2">{camErr}</p>}

        <div className="flex gap-2 mt-3">
          {!photo
            ? <Button variant="navy" className="flex-1" onClick={snap} disabled={!!camErr}>Take selfie</Button>
            : <Button variant="ghost" className="flex-1" onClick={() => setPhoto(null)}>Retake</Button>}
          <label className="flex-1">
            <span className="inline-flex w-full items-center justify-center gap-2 font-semibold rounded-xl px-4 py-2.5 text-sm border-2 border-[#1F3D5C] text-[#1F3D5C] cursor-pointer hover:bg-[#1F3D5C] hover:text-white">Use photo</span>
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
          </label>
        </div>

        <div className="mt-3 text-xs text-[#61707A]">
          {coords ? <span>📍 Location captured ({coords.lat}, {coords.lng})</span> : <span>{geoErr || 'Getting location…'}</span>}
        </div>

        <label className="mt-3 flex items-start gap-2 text-xs text-[#61707A] cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[#3E9C8E]" />
          <span>I agree to Hazel Glen Care capturing this photo and my location to verify my attendance, and to it being stored for payroll and compliance (POPIA).</span>
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" loading={busy} disabled={!photo || (!!photo && !consent)} onClick={confirm}>Confirm {title.toLowerCase()}</Button>
        </div>
      </div>
    </div>
  );
}
