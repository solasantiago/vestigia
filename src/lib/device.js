// ¿Es un teléfono? Se decide por el lado más corto de la pantalla (no de la ventana), así no cambia
// al rotar ni con el teclado abierto. El iPad 9 mide 810 de lado corto: nunca entra en modo teléfono.
export const IS_PHONE =
  typeof window !== 'undefined' && Math.min(window.screen?.width ?? Infinity, window.screen?.height ?? Infinity) < 600;
