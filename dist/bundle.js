// Minimal runtime + lazy vendor loader for Foundry Character Creator
// Purpose: drastically reduce bundle size by lazy-loading heavy libraries only when needed.
// Usage:
//   CharacterCreator.init(); // optional init
//   CharacterCreator.exportPDF(domNode, options).then(...);
//   CharacterCreator.sanitize(htmlString);

(function (global) {
  'use strict';

  var CharacterCreator = (function () {
    // Basic config: CDN URLs for heavy libs
    var VENDORS = {
      jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
      html2canvas: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
      dompurify: 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js'
    };

    var loaded = {}; // url -> Promise

    function loadScript(url, globalVarCheck) {
      if (loaded[url]) return loaded[url];
      loaded[url] = new Promise(function (resolve, reject) {
        // If a globalVarCheck function is provided, and it already returns truthy, resolve immediately.
        if (typeof globalVarCheck === 'function' && globalVarCheck()) {
          return resolve();
        }
        var s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.onload = function () {
          // wait a tick to ensure UMD attached globals
          setTimeout(resolve, 0);
        };
        s.onerror = function (e) {
          reject(new Error('Failed to load script: ' + url));
        };
        document.head.appendChild(s);
      });
      return loaded[url];
    }

    // Helpers to ensure vendor libraries are available
    function ensureJsPDF() {
      // jsPDF UMD exposes window.jspdf (module) with .jsPDF constructor or window.jsPDF
      return loadScript(VENDORS.jspdf, function () {
        return !!(global.jspdf && (global.jspdf.jsPDF || global.jspdf.default)) || !!global.jsPDF;
      }).then(function () {
        // normalize access
        var JSPDF = (global.jspdf && (global.jspdf.jsPDF || global.jspdf.default)) || global.jsPDF;
        if (!JSPDF) throw new Error('jsPDF not available after loading.');
        return JSPDF;
      });
    }

    function ensureHtml2Canvas() {
      return loadScript(VENDORS.html2canvas, function () {
        return !!global.html2canvas;
      }).then(function () {
        if (!global.html2canvas) throw new Error('html2canvas not available after loading.');
        return global.html2canvas;
      });
    }

    function ensureDOMPurify() {
      return loadScript(VENDORS.dompurify, function () {
        return !!global.DOMPurify || !!global.DOMPurify;
      }).then(function () {
        var p = global.DOMPurify || (global.window && global.window.DOMPurify);
        if (!p) throw new Error('DOMPurify not available after loading.');
        return p;
      });
    }

    // Public API

    // init: small initialization, optionally called on module load
    function init(options) {
      options = options || {};
      // Optionally prefetch lightweight vendors in background if user opts in
      if (options.prefetch === true) {
        // only fetch html2canvas (likely needed) if user prefers prefetch
        ensureHtml2Canvas().catch(function () { /* ignore */ });
      }
    }

    // sanitize: returns sanitized HTML string using DOMPurify (lazy-loaded)
    function sanitize(htmlString) {
      if (!htmlString) return Promise.resolve('');
      return ensureDOMPurify().then(function (DOMPurify) {
        return DOMPurify.sanitize(htmlString);
      });
    }

    // exportPDF: capture a DOM node and export to PDF (lazy-loads html2canvas + jsPDF)
    // options: { filename: 'character.pdf', scale: 2 }
    function exportPDF(domNode, options) {
      options = options || {};
      var filename = options.filename || 'document.pdf';
      var scale = options.scale || 2;

      // Load both libraries in parallel
      return Promise.all([ensureHtml2Canvas(), ensureJsPDF()]).then(function (libs) {
        var html2canvas = libs[0];
        var JSPDF = libs[1];

        // html2canvas -> canvas
        return html2canvas(domNode, { scale: scale, useCORS: true, logging: false }).then(function (canvas) {
          // Convert canvas to image
          try {
            var imgData = canvas.toDataURL('image/png');
            // Create pdf. jsPDF v2 uses new jspdf.jsPDF()
            var pdf;
            if (JSPDF && typeof JSPDF === 'function') {
              // some UMDs expose constructor directly
              pdf = new JSPDF({
                unit: 'pt',
                format: [canvas.width, canvas.height]
              });
            } else if (JSPDF && JSPDF.jsPDF) {
              pdf = new JSPDF.jsPDF({
                unit: 'pt',
                format: [canvas.width, canvas.height]
              });
            } else {
              throw new Error('Unsupported jsPDF API');
            }

            // Fill page with image, keeping quality reasonable
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            // Save
            if (typeof pdf.save === 'function') {
              pdf.save(filename);
            } else if (typeof pdf.output === 'function') {
              var data = pdf.output('blob');
              // fallback: create object URL and download
              var link = document.createElement('a');
              link.href = URL.createObjectURL(data);
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              link.remove();
              URL.revokeObjectURL(link.href);
            } else {
              throw new Error('jsPDF lacks save/output APIs');
            }
            return { success: true };
          } catch (err) {
            return Promise.reject(err);
          }
        });
      });
    }

    // captureImage: returns a dataURL captured from a DOM node (uses html2canvas)
    function captureImage(domNode, options) {
      options = options || {};
      options.scale = options.scale || 2;
      return ensureHtml2Canvas().then(function (html2canvas) {
        return html2canvas(domNode, { scale: options.scale, useCORS: true, logging: false }).then(function (canvas) {
          return canvas.toDataURL(options.type || 'image/png', options.quality || 0.92);
        });
      });
    }

    // small util: save/restore form state (replaces heavy inline code that iterated all inputs)
    function saveFormState(formEl) {
      if (!formEl || !formEl.elements) return;
      Array.prototype.slice.call(formEl.elements).forEach(function (el) {
        if (!el.name && !el.id) return;
        var key = el.id || el.name;
        try {
          if (el.type === 'checkbox' || el.type === 'radio') {
            localStorage.setItem(key, el.checked ? '1' : '0');
          } else {
            localStorage.setItem(key, el.value || '');
          }
        } catch (e) { /* ignore storage errors */ }
      });
    }

    function restoreFormState(formEl) {
      if (!formEl || !formEl.elements) return;
      Array.prototype.slice.call(formEl.elements).forEach(function (el) {
        var key = el.id || el.name;
        try {
          var v = localStorage.getItem(key);
          if (v === null) return;
          if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = v === '1';
          } else {
            el.value = v;
          }
        } catch (e) { /* ignore */ }
      });
    }

    // Expose the public API
    return {
      init: init,
      sanitize: sanitize,
      exportPDF: exportPDF,
      captureImage: captureImage,
      saveFormState: saveFormState,
      restoreFormState: restoreFormState,
      // for testing or advanced usage: allow overriding vendor URLs
      _setVendorUrl: function (name, url) {
        if (VENDORS[name]) VENDORS[name] = url;
      }
    };
  })();

  // Expose globally so Foundry and other scripts can call it
  global.CharacterCreator = CharacterCreator;
})(window);
