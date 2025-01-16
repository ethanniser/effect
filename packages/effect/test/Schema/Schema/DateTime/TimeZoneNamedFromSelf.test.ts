import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("TimeZoneNamedFromSelf", () => {
  const schema = S.TimeZoneNamedFromSelf

  it("property tests", () => {
    Util.roundtrip(schema)
  })
})