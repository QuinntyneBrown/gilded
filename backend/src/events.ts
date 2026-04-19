export interface CoupleDissolved {
  type: 'CoupleDissolved';
  coupleId: string;
  userIds: [string, string];
  at: Date;
}

export type DomainEvent = CoupleDissolved;

export class EventBus {
  private readonly handlers = new Map<string, ((event: DomainEvent) => void)[]>();
  private readonly history: DomainEvent[] = [];

  emit(event: DomainEvent): void {
    this.history.push(event);
    for (const h of this.handlers.get(event.type) ?? []) h(event);
  }

  on(type: DomainEvent['type'], handler: (event: DomainEvent) => void): void {
    const hs = this.handlers.get(type) ?? [];
    hs.push(handler);
    this.handlers.set(type, hs);
  }

  all(): DomainEvent[] {
    return [...this.history];
  }
}
