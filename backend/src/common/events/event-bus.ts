import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from './domain-events';

type Handler = (event: DomainEvent) => Promise<void> | void;

/**
 * Minimal in-process event bus. Side effects (notifications) subscribe here and
 * run asynchronously so they never block the HTTP request, and a failing
 * handler can't break the publisher.
 *
 * In production this is the seam where BullMQ/Redis would be introduced (see
 * docs/02 §2.3 and docs/08 §8.3): publish() would enqueue, and handlers would
 * become queue consumers. The public API stays the same.
 */
@Injectable()
export class DomainEventBus {
  private readonly logger = new Logger(DomainEventBus.name);
  private readonly handlers: Handler[] = [];

  subscribe(handler: Handler): void {
    this.handlers.push(handler);
  }

  publish(event: DomainEvent): void {
    // Fire-and-forget on the next tick; isolate handler failures.
    setImmediate(() => {
      for (const handler of this.handlers) {
        Promise.resolve()
          .then(() => handler(event))
          .catch((err) =>
            this.logger.error(`Handler failed for ${event.key}: ${String(err)}`),
          );
      }
    });
  }
}
