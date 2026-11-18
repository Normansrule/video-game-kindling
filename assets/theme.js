// assets/theme.js
// WHAT: A light/dark toggle button for every docs, viz and lesson page.
// WHY:  Pages follow the system theme by default; some readers want to choose.
//       The choice is remembered in localStorage when the browser allows it.
// USE:  <script src="../assets/theme.js" defer></script>  (a classic script, not a module)

(function () {
  const root = document.documentElement;
  // Inside a lesson's <iframe>, hide this page's own navigation and toggle (see site.css).
  if (window.self !== window.top) root.classList.add("embedded");

  function readSaved() {
    try {
      return localStorage.getItem("kindling:theme");
    } catch (error) {
      return null;
    }
  }

  function save(theme) {
    try {
      localStorage.setItem("kindling:theme", theme);
    } catch (error) {
      // Storage blocked: the toggle still works for this visit.
    }
  }

  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  const saved = readSaved();
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;

  function addButton() {
    const button = document.createElement("button");
    button.className = "theme-toggle";
    button.type = "button";
    function label() {
      const next = currentTheme() === "dark" ? "light" : "dark";
      button.textContent = next === "dark" ? "Dark theme" : "Light theme";
      button.setAttribute("aria-label", "Switch to " + next + " theme");
    }
    button.addEventListener("click", function () {
      const next = currentTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      save(next);
      label();
      // Canvas visualizations listen for this to redraw with the new colors.
      window.dispatchEvent(new Event("kindling-theme-change"));
      // Lessons embed visualizations in iframes (same site): switch them too.
      document.querySelectorAll("iframe").forEach(function (frame) {
        try {
          frame.contentDocument.documentElement.dataset.theme = next;
          frame.contentWindow.dispatchEvent(new Event("kindling-theme-change"));
        } catch (error) {
          // A frame from another site: leave it alone.
        }
      });
    });
    label();
    // Kindling 2 pages have a top bar (.k-nav): put the toggle there. Older pages: corner of the page.
    const bar = document.querySelector(".k-nav");
    if (bar) bar.appendChild(button);
    else document.body.appendChild(button);
  }

  if (document.body) addButton();
  else document.addEventListener("DOMContentLoaded", addButton);
})();
