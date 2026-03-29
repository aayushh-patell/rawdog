(async function () {
  const PRESENTATIONAL_ATTRIBUTES = [
    "style",
    "bgcolor",
    "color",
    "face",
    "size",
    "align",
    "width",
    "height",
    "background"
  ];

  const MEDIA_TAGS = new Set([
    "IMG",
    "PICTURE",
    "SVG",
    "IFRAME",
    "EMBED",
    "OBJECT",
    "CANVAS",
    "VIDEO",
    "SOURCE",
    "TRACK"
  ]);

  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const RAWDOG_STYLE_ATTRIBUTE = "data-rawdog-preserve";

  const processed = new WeakSet();
  const items = await chrome.storage.sync.get({ enabled: true });

  if (!items.enabled) {
    return;
  }

  function ensureComicSans(root) {
    if (!root || !("querySelector" in root)) {
      return;
    }

    let style = root.querySelector(`style[${RAWDOG_STYLE_ATTRIBUTE}="comic-sans"]`);
    if (style) {
      return;
    }

    style = document.createElement("style");
    style.setAttribute(RAWDOG_STYLE_ATTRIBUTE, "comic-sans");
    style.textContent = [
      "html, body, input, textarea, button, select, option, table,",
      "thead, tbody, tfoot, tr, td, th, p, div, span, li, a,",
      "blockquote, pre, code, h1, h2, h3, h4, h5, h6, label, legend {",
      "  font-family: 'Comic Sans MS', 'Comic Sans', cursive !important;",
      "}"
    ].join("\n");

    const parent = root.head || root.documentElement || root;
    parent.appendChild(style);
  }

  function playSadTrombone() {
    if (window.top !== window) {
      return;
    }

    const audio = new Audio(chrome.runtime.getURL("assets/sounds/sad-trombone.mp3"));
    audio.volume = 0.35;
    audio.play().catch(() => {
      // Autoplay is best-effort here; the strip still runs even if audio is blocked.
    });
  }

  function stripAttributes(element) {
    for (const name of PRESENTATIONAL_ATTRIBUTES) {
      if (element.hasAttribute(name)) {
        element.removeAttribute(name);
      }
    }
  }

  function removeStylesheetNode(element) {
    if (element.tagName === "STYLE") {
      if (element.getAttribute(RAWDOG_STYLE_ATTRIBUTE) === "comic-sans") {
        return false;
      }
      element.remove();
      return true;
    }

    if (element.tagName === "LINK") {
      const rel = (element.getAttribute("rel") || "").toLowerCase();
      if (rel.split(/\s+/).includes("stylesheet")) {
        element.remove();
        return true;
      }
    }

    return false;
  }

  function replaceMedia(element) {
    if (element.namespaceURI === SVG_NAMESPACE) {
      const owner = element.ownerSVGElement || element;
      const label = owner.getAttribute("aria-label")
        || owner.getAttribute("title")
        || "icon";
      owner.replaceWith(document.createTextNode("[" + label + "]"));
      return true;
    }

    if (!MEDIA_TAGS.has(element.tagName)) {
      return false;
    }

    const label = element.getAttribute("alt")
      || element.getAttribute("aria-label")
      || element.getAttribute("title")
      || element.tagName.toLowerCase();
    const text = document.createTextNode("[" + label + "]");
    element.replaceWith(text);
    return true;
  }

  function sanitizeElement(element) {
    if (!(element instanceof Element) || processed.has(element)) {
      return;
    }

    processed.add(element);

    if (removeStylesheetNode(element) || replaceMedia(element)) {
      return;
    }

    stripAttributes(element);
  }

  function sanitizeTree(root) {
    if (!root) {
      return;
    }

    ensureComicSans(root instanceof Document ? root : root.ownerDocument || document);

    if (root instanceof Element) {
      sanitizeElement(root);
    }

    const elements = root.querySelectorAll ? root.querySelectorAll("*") : [];
    for (const element of elements) {
      sanitizeElement(element);

      if (element.shadowRoot) {
        ensureComicSans(element.shadowRoot);
        sanitizeTree(element.shadowRoot);
      }
    }
  }

  function sanitizeDocument() {
    if (document.documentElement) {
      sanitizeTree(document.documentElement);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof Element) {
        processed.delete(mutation.target);
        sanitizeTree(mutation.target);
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (node instanceof Element || node instanceof DocumentFragment) {
          sanitizeTree(node);
        }
      }
    }
  });

  observer.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["style", "rel", "bgcolor", "color", "face", "size", "align", "width", "height", "background"]
  });

  playSadTrombone();
  sanitizeDocument();

  document.addEventListener("readystatechange", sanitizeDocument, { passive: true });
})();
