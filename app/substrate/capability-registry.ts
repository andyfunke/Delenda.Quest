export type CapabilityCell<
  TOperation extends string = string,
  TSubject extends string = string,
  THandler extends string = string,
> = {
  operation: TOperation;
  subject: TSubject;
  handler: THandler;
  consequential?: boolean;
  description?: string;
};

const capabilityKey = (operation: string, subject: string) =>
  `${operation}\u0000${subject}`;

/**
 * A closed, executable operation × subject registry.
 *
 * The registry intentionally has no wildcard cells. A caller must prove that
 * the exact semantic pair it accepted has a handler; an unsupported pair may
 * never widen into a nearby capability.
 */
export class CapabilityRegistry<
  TOperation extends string,
  TSubject extends string,
  THandler extends string,
> {
  readonly cells: readonly CapabilityCell<
    TOperation,
    TSubject,
    THandler
  >[];
  private readonly byKey: ReadonlyMap<
    string,
    CapabilityCell<TOperation, TSubject, THandler>
  >;

  constructor(
    cells: readonly CapabilityCell<TOperation, TSubject, THandler>[],
  ) {
    const byKey = new Map<
      string,
      CapabilityCell<TOperation, TSubject, THandler>
    >();
    for (const cell of cells) {
      const key = capabilityKey(cell.operation, cell.subject);
      if (byKey.has(key))
        throw new Error(
          `Duplicate capability cell ${cell.operation} × ${cell.subject}.`,
        );
      byKey.set(key, Object.freeze({ ...cell }));
    }
    this.cells = Object.freeze([...byKey.values()]);
    this.byKey = byKey;
  }

  resolve(
    operation: TOperation,
    subject: TSubject,
  ): CapabilityCell<TOperation, TSubject, THandler> | null {
    return this.byKey.get(capabilityKey(operation, subject)) ?? null;
  }

  supports(operation: TOperation, subject: TSubject) {
    return this.byKey.has(capabilityKey(operation, subject));
  }
}

export const createCapabilityRegistry = <
  TOperation extends string,
  TSubject extends string,
  THandler extends string,
>(
  cells: readonly CapabilityCell<TOperation, TSubject, THandler>[],
) => new CapabilityRegistry(cells);
