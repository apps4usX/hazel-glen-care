// Loads an access-controlled image (e.g. attendance selfies) by fetching it with
// the admin's Bearer token and rendering the result as an object URL — because a
// plain <img src> can't send an Authorization header.
import { useEffect, useState } from 'react';
import { mediaUrl, tokenStore } from '../lib/api';

export default function AuthImage({ path, alt = '', className = '' }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let objectUrl;
    let active = true;
    (async () => {
      if (!path) return;
      try {
        const res = await fetch(mediaUrl(path), { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
        if (!res.ok) throw new Error('forbidden');
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (active) setUrl(objectUrl);
      } catch { if (active) setErr(true); }
    })();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);

  if (err) return <div className={`${className} grid place-items-center text-[10px] text-[#b23b30] bg-[#FBE7E5]`}>Image unavailable</div>;
  if (!url) return <div className={`${className} bg-[#EDE7DA] animate-pulse`} />;
  return <img src={url} alt={alt} className={className} />;
}
