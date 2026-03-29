(function () {
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
    "CANVAS",
    "VIDEO",
    "SOURCE",
    "TRACK"
  ]);

  const processed = new WeakSet();

  function stripAttributes(element) {
    for (const name of PRESENTATIONAL_ATTRIBUTES) {
      if (element.hasAttribute(name)) {
        element.removeAttribute(name);
      }
    }
  }

  function removeStylesheetNode(element) {
    if (element.tagName === "STYLE") {
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

  function sanitizeNode(node) {
    if (!(node instanceof Element) || processed.has(node)) {
      return;
    }

    processed.add(node);

    if (removeStylesheetNode(node) || replaceMedia(node)) {
      return;
    }

    stripAttributes(node);

    const descendants = node.querySelectorAll("*");
    for (const element of descendants) {
      if (removeStylesheetNode(element) || replaceMedia(element)) {
        continue;
      }

      stripAttributes(element);
      processed.add(element);
    }
  }

  function sanitizeDocument() {
    if (document.documentElement) {
      sanitizeNode(document.documentElement);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof Element) {
        processed.delete(mutation.target);
        sanitizeNode(mutation.target);
        continue;
      }

      for (const node of mutation.addedNodes) {
        sanitizeNode(node);
      }
    }
  });

  observer.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["style", "rel", "bgcolor", "color", "face", "size", "align", "width", "height", "background"]
  });

  sanitizeDocument();

  document.addEventListener("readystatechange", sanitizeDocument, { passive: true });
})();
