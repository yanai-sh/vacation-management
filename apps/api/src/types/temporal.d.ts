/** Minimal Temporal typings for Node 26 (TS lib lag). */
declare namespace Temporal {
  class Instant {
    static from(item: string): Instant
    toZonedDateTimeISO(timeZone: string): { toPlainDate(): { toString(): string } }
  }

  namespace Now {
    function instant(): Instant
    function timeZoneId(): string
  }
}
