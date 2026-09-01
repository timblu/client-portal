export const themeBootstrapScript = `(function(){try{var t=localStorage.getItem("rp-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

/** Legacy Next layout hook — theme bootstrap now lives in index.html. */
export function ThemeScript() {
  return null;
}
