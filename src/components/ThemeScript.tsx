import Script from "next/script";

export function ThemeScript() {
  return (
    <Script id="rp-theme" strategy="beforeInteractive">
      {`(function(){try{var t=localStorage.getItem("rp-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`}
    </Script>
  );
}
