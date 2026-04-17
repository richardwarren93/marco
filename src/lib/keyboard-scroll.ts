/**
 * Scroll a focused input above the mobile keyboard using visualViewport API.
 * Measures the actual visible viewport (excluding keyboard) so the input sits
 * comfortably above the keyboard instead of relying on browser auto-scroll.
 */
export function scrollIntoViewAboveKeyboard(el: HTMLElement, offsetTop = 80) {
  // Wait for keyboard animation to complete
  setTimeout(() => {
    try {
      const vv = window.visualViewport;
      const visibleTop = vv?.offsetTop ?? 0;
      const visibleHeight = vv?.height ?? window.innerHeight;
      const rect = el.getBoundingClientRect();
      // Target Y: input should be at visibleTop + offsetTop within viewport
      const currentY = rect.top;
      const targetY = visibleTop + offsetTop;
      const scrollBy = currentY - targetY;
      if (Math.abs(scrollBy) > 10) {
        window.scrollBy({ top: scrollBy, behavior: "smooth" });
      }
      // Verification pass — if still hidden by keyboard, force scroll to top
      setTimeout(() => {
        const r2 = el.getBoundingClientRect();
        if (r2.bottom > visibleHeight + visibleTop) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 400);
    } catch {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 350);
}
