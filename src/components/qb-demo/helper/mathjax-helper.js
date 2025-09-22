export const initializeMathJax = () => {
  if (typeof window !== "undefined" && !window.MathJax) {
    window.MathJax = {
      tex: {
        inlineMath: [["$", "$"]],
        displayMath: [["$$", "$$"]],
        processEscapes: true
      },
      startup: {
        ready: () => {
          window.MathJax.startup.defaultReady();
        }
      }
    };

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    script.async = true;
    document.head.appendChild(script);
  }
};

export const processMathJax = () => {
  setTimeout(() => {
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise();
    }
  }, 100);
};