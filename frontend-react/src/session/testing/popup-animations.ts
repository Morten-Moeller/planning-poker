export function installPopupAnimations(): void {
  if (typeof Element.prototype.getAnimations !== 'function') {
    Element.prototype.getAnimations = () => [];
  }
}

class ResizeObserverDouble {
  observe(): void {
    return undefined;
  }

  unobserve(): void {
    return undefined;
  }

  disconnect(): void {
    return undefined;
  }
}

export function installResizeObserver(): void {
  if (typeof globalThis.ResizeObserver !== 'function') {
    globalThis.ResizeObserver = ResizeObserverDouble;
  }
}
