export class JitterBuffer<T> {
  private readonly targetFrames: number
  private readonly storage = new Map<number, T>()
  private expectedSeq: number | null = null

  constructor(targetFrames = 4) {
    this.targetFrames = targetFrames
  }

  insert(seq: number, payload: T) {
    if (this.expectedSeq === null) {
      this.expectedSeq = seq
    }

    this.storage.set(seq, payload)
  }

  pop(): T | null {
    if (this.expectedSeq === null) {
      return null
    }

    if (this.storage.size < this.targetFrames) {
      return null
    }

    const payload = this.storage.get(this.expectedSeq)
    this.storage.delete(this.expectedSeq)
    this.expectedSeq += 1

    return payload ?? null
  }

  clear() {
    this.storage.clear()
    this.expectedSeq = null
  }
}
