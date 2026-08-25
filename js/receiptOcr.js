(() => {
  'use strict';
  let loader;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (loader) return loader;
    loader = new Promise((resolve,reject) => {
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload=()=>resolve(window.Tesseract);
      script.onerror=()=>reject(new Error('OCR-Bibliothek konnte nicht geladen werden. Prüfe die Internetverbindung.'));
      document.head.appendChild(script);
    });
    return loader;
  }
  async function recognize(file, onProgress=()=>{}) {
    if (!file) throw new Error('Bitte zuerst ein Bonfoto auswählen.');
    if (!navigator.onLine) throw new Error('Für die erstmalige OCR-Nutzung ist eine Internetverbindung erforderlich. Alternativ kannst du den Bontext manuell einfügen.');
    const Tesseract = await loadTesseract();
    const result = await Tesseract.recognize(file, 'deu', { logger:m => { if (m.status === 'recognizing text') onProgress(Math.round((m.progress || 0)*100)); } });
    return result?.data?.text || '';
  }
  window.SKReceiptOCR = { recognize };
})();
