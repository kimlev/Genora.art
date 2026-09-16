import { HEAVY_CHAT_SLOTS, IMAGE_GENERATION_SLOTS, INTEGRATOR_CHAT_SLOTS, VIDEO_CHAT_SLOTS } from "@/lib/chat-request-policy";

/** Ограничение одновременных запросов в одном процессе Node. */

export class SlotGate {
  private used = 0;
  private waiting = 0;
  private readonly limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  get busy(): number {
    return this.used;
  }

  tryAcquire(): (() => void) | null {
    if (this.used >= this.limit) return null;
    this.used += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.used -= 1;
    };
  }

  async acquire(waitMs: number, maxWaiting = Number.POSITIVE_INFINITY): Promise<(() => void) | null> {
    if (this.used >= this.limit && this.waiting >= maxWaiting) return null;
    this.waiting += 1;
    try {
      const deadline = Date.now() + Math.max(0, waitMs);
      while (true) {
        const release = this.tryAcquire();
        if (release) return release;
        if (Date.now() >= deadline) return null;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } finally {
      this.waiting -= 1;
    }
  }
}

export const heavyChatSlots = new SlotGate(HEAVY_CHAT_SLOTS);
export const integratorChatSlots = new SlotGate(INTEGRATOR_CHAT_SLOTS);
export const imageGenerationSlots = new SlotGate(IMAGE_GENERATION_SLOTS);
export const musicGenerationSlots = new SlotGate(IMAGE_GENERATION_SLOTS);
export const videoGenerationSlots = new SlotGate(IMAGE_GENERATION_SLOTS);
export const videoChatSlots = new SlotGate(VIDEO_CHAT_SLOTS);
