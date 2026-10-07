import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

/** /presenter starts the scripted demo at step 1; the rail itself lives in DevTools. */
export default function Presenter() {
  useEffect(() => {
    try {
      sessionStorage.setItem('prism.presenter', '0');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('prism:presenter'));
  }, []);
  return <Navigate to="/app/trust" replace />;
}
