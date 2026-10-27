// Early error listener, inlined at the top of the page as plain ES5 so it also catches
// failures of the app bundle itself (old phones, in-app browsers, chunks that fail to load).
// Sends at most three reports per page to /api/client-error.
export const ERROR_SCRIPT = `(function(){var n=0;
function send(d){if(n>=3)return;n++;try{d.url=location.href;var b=JSON.stringify(d);
if(navigator.sendBeacon){navigator.sendBeacon('/api/client-error',b);}
else{var x=new XMLHttpRequest();x.open('POST','/api/client-error');x.send(b);}}catch(e){}}
window.addEventListener('error',function(e){try{var t=e.target;
if(t&&t!==window&&(t.tagName==='SCRIPT'||t.tagName==='LINK')){send({kind:'resource',message:'load failed',source:t.src||t.href});return;}
send({kind:'error',message:String(e.message||''),source:(e.filename||'')+':'+(e.lineno||0)+':'+(e.colno||0),stack:e.error&&e.error.stack?String(e.error.stack):undefined});
}catch(x){}},true);
window.addEventListener('unhandledrejection',function(e){try{var r=e.reason;send({kind:'rejection',message:String(r&&r.message||r),stack:r&&r.stack?String(r.stack):undefined});}catch(x){}});
window.__taliReport=send;})();`;

/** Reports an error caught by React (error boundary) through the same channel. */
export function reportClientError(error: Error & { digest?: string }) {
  const report = (window as Window & { __taliReport?: (d: object) => void }).__taliReport;
  const data = { kind: 'boundary', message: error.message, digest: error.digest, stack: error.stack };
  if (report) report(data);
  else fetch('/api/client-error', { method: 'POST', body: JSON.stringify({ ...data, url: location.href }), keepalive: true }).catch(() => {});
}
