/**
 * @since 1.0.0
 */
import * as VariantSchema from "@effect/experimental/VariantSchema"
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type { Brand } from "effect/Brand"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Record from "effect/Record"

const {
  Class,
  Field,
  FieldExcept,
  FieldOnly,
  Struct
} = VariantSchema.make({
  variants: ["select", "insert", "update", "json", "jsonCreate", "jsonUpdate"],
  defaultVariant: "select"
})

/**
 * @since 1.0.0
 * @category models
 */
export type VariantsDatabase = "select" | "insert" | "update"

/**
 * @since 1.0.0
 * @category models
 */
export type VariantsJson = "json" | "jsonCreate" | "jsonUpdate"

export {
  /**
   * A base class used for creating domain model schemas.
   *
   * It supports common variants for database and JSON apis.
   *
   * @since 1.0.0
   * @category constructors
   * @example
   * import { Schema } from "@effect/schema"
   * import { Model } from "@effect/sql"
   *
   * export const GroupId = Schema.Number.pipe(Schema.brand("GroupId"))
   *
   * export class Group extends Model.Class<Group>("Group")({
   *   id: Model.Generated(GroupId),
   *   name: Schema.NonEmptyTrimmedString,
   *   createdAt: Model.DateTimeInsertFromDate,
   *   updatedAt: Model.DateTimeUpdateFromDate
   * }) {}
   *
   * // schema used for selects
   * Group
   *
   * // schema used for inserts
   * Group.insert
   *
   * // schema used for updates
   * Group.update
   *
   * // schema used for json api
   * Group.json
   * Group.jsonCreate
   * Group.jsonUpdate
   *
   * // you can also turn them into classes
   * class GroupJson extends Schema.Class<GroupJson>("GroupJson")(Group.json) {
   *   get upperName() {
   *     return this.name.toUpperCase()
   *   }
   * }
   */
  Class,
  /**
   * @since 1.0.0
   * @category constructors
   */
  Field,
  /**
   * @since 1.0.0
   * @category constructors
   */
  FieldExcept,
  /**
   * @since 1.0.0
   * @category constructors
   */
  FieldOnly,
  /**
   * @since 1.0.0
   * @category constructors
   */
  Struct
}

/**
 * @since 1.0.0
 * @category accessors
 */
export const fields: <A extends VariantSchema.Struct<any>>(self: A) => A[VariantSchema.TypeId] = VariantSchema.fields

/**
 * @since 1.0.0
 * @category overrideable
 */
export const Override: <A>(value: A) => A & Brand<"Override"> = VariantSchema.Override

/**
 * @since 1.0.0
 * @category models
 */
export interface Generated<S extends Schema.Schema.All | Schema.PropertySignature.All> extends
  VariantSchema.Field<{
    readonly select: S
    readonly update: S
    readonly json: S
  }>
{}

/**
 * A field that represents a column that is generated by the database.
 *
 * It is available for selection and update, but not for insertion.
 *
 * @since 1.0.0
 * @category schemas
 */
export const Generated = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
  schema: S
): Generated<S> =>
  Field({
    select: schema,
    update: schema,
    json: schema
  })

/**
 * @since 1.0.0
 * @category models
 */
export interface GeneratedByApp<S extends Schema.Schema.All | Schema.PropertySignature.All>
  extends
    VariantSchema.Field<{
      readonly select: S
      readonly insert: S
      readonly update: S
      readonly json: S
    }>
{}

/**
 * A field that represents a column that is generated by the application.
 *
 * It is required by the database, but not by the JSON variants.
 *
 * @since 1.0.0
 * @category schemas
 */
export const GeneratedByApp = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
  schema: S
): GeneratedByApp<S> =>
  Field({
    select: schema,
    insert: schema,
    update: schema,
    json: schema
  })

/**
 * @since 1.0.0
 * @category models
 */
export interface Sensitive<S extends Schema.Schema.All | Schema.PropertySignature.All> extends
  VariantSchema.Field<{
    readonly select: S
    readonly insert: S
    readonly update: S
  }>
{}

/**
 * A field that represents a sensitive value that should not be exposed in the
 * JSON variants.
 *
 * @since 1.0.0
 * @category schemas
 */
export const Sensitive = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
  schema: S
): Sensitive<S> =>
  Field({
    select: schema,
    insert: schema,
    update: schema
  })

/**
 * Convert a field to one that is optional for all variants.
 *
 * For the database variants, it will accept `null`able values.
 * For the JSON variants, it will also accept missing keys.
 *
 * @since 1.0.0
 * @category optional
 */
export const FieldOption = <Field extends VariantSchema.Field<any> | Schema.Schema.Any>(
  self: Field
): VariantSchema.Field<
  Field extends Schema.Schema.Any ? {
      readonly select: Schema.OptionFromNullOr<Field>
      readonly insert: Schema.OptionFromNullOr<Field>
      readonly update: Schema.OptionFromNullOr<Field>
      readonly json: Schema.optionalWith<Field, { as: "Option" }>
      readonly jsonCreate: Schema.optionalWith<Field, { as: "Option"; nullable: true }>
      readonly jsonUpdate: Schema.optionalWith<Field, { as: "Option"; nullable: true }>
    }
    : Field extends VariantSchema.Field<infer S> ? {
        readonly [K in keyof S]: S[K] extends Schema.Schema.Any
          ? K extends VariantsDatabase ? Schema.OptionFromNullOr<S[K]> :
          Schema.optionalWith<S[K], { as: "Option"; nullable: true }>
          : never
      } :
    {}
> => {
  if (Schema.isSchema(self)) {
    return Field({
      select: Schema.OptionFromNullOr(self),
      insert: Schema.OptionFromNullOr(self),
      update: Schema.OptionFromNullOr(self),
      json: Schema.optionalWith(self, { as: "Option" }),
      jsonCreate: Schema.optionalWith(self, { as: "Option", nullable: true }),
      jsonUpdate: Schema.optionalWith(self, { as: "Option", nullable: true })
    }) as any
  }
  return VariantSchema.Field(Record.map(self.schemas, (schema, variant) => {
    switch (variant) {
      case "select":
      case "insert":
      case "update":
        return Schema.OptionFromNullOr(schema as any)
      case "json":
        return Schema.optionalWith(schema as any, { as: "Option" })
      default:
        return Schema.optionalWith(schema as any, { as: "Option", nullable: true })
    }
  }) as any)
}

/**
 * @since 1.0.0
 * @category models
 */
export interface DateTimeFromDate extends
  Schema.transform<
    typeof Schema.ValidDateFromSelf,
    typeof Schema.DateTimeUtcFromSelf
  >
{}

/**
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeFromDate: DateTimeFromDate = Schema.transform(
  Schema.ValidDateFromSelf,
  Schema.DateTimeUtcFromSelf,
  {
    decode: DateTime.unsafeFromDate,
    encode: DateTime.toDateUtc
  }
)

/**
 * @since 1.0.0
 * @category models
 */
export interface Date extends Schema.transformOrFail<typeof Schema.String, typeof Schema.DateTimeUtcFromSelf> {}

/**
 * A schema for a `DateTime.Utc` that is serialized as a date string in the
 * format `YYYY-MM-DD`.
 *
 * @since 1.0.0
 * @category schemas
 */
export const Date = Schema.transformOrFail(
  Schema.String,
  Schema.DateTimeUtcFromSelf,
  {
    decode: (s, _, ast) =>
      DateTime.make(s).pipe(
        Option.map(DateTime.removeTime),
        Option.match({
          onNone: () => ParseResult.fail(new ParseResult.Type(ast, s)),
          onSome: (dt) => ParseResult.succeed(dt)
        })
      ),
    encode: (dt) => ParseResult.succeed(DateTime.formatIsoDate(dt))
  }
)

/**
 * @since 1.0.0
 * @category schemas
 */
export const DateWithNow = VariantSchema.Overrideable(Date, Schema.DateTimeUtcFromSelf, {
  generate: Option.match({
    onNone: () => Effect.map(DateTime.now, DateTime.removeTime),
    onSome: (dt) => Effect.succeed(DateTime.removeTime(dt))
  })
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeWithNow = VariantSchema.Overrideable(Schema.String, Schema.DateTimeUtcFromSelf, {
  generate: Option.match({
    onNone: () => Effect.map(DateTime.now, DateTime.formatIso),
    onSome: (dt) => Effect.succeed(DateTime.formatIso(dt))
  })
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeFromDateWithNow = VariantSchema.Overrideable(Schema.DateFromSelf, Schema.DateTimeUtcFromSelf, {
  generate: Option.match({
    onNone: () => Effect.map(DateTime.now, DateTime.toDateUtc),
    onSome: (dt) => Effect.succeed(DateTime.toDateUtc(dt))
  })
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeFromNumberWithNow = VariantSchema.Overrideable(Schema.Number, Schema.DateTimeUtcFromSelf, {
  generate: Option.match({
    onNone: () => Effect.map(DateTime.now, DateTime.toEpochMillis),
    onSome: (dt) => Effect.succeed(DateTime.toEpochMillis(dt))
  })
})

/**
 * @since 1.0.0
 * @category models
 */
export interface DateTimeInsert extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtc
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, string>
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * A field that represents a date-time value that is inserted as the current
 * `DateTime.Utc`. It is serialized as a string for the database.
 *
 * It is omitted from updates and is available for selection.
 *
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeInsert: DateTimeInsert = Field({
  select: Schema.DateTimeUtc,
  insert: DateTimeWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category models
 */
export interface DateTimeInsertFromDate extends
  VariantSchema.Field<{
    readonly select: DateTimeFromDate
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * A field that represents a date-time value that is inserted as the current
 * `DateTime.Utc`. It is serialized as a `Date` for the database.
 *
 * It is omitted from updates and is available for selection.
 *
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeInsertFromDate: DateTimeInsertFromDate = Field({
  select: DateTimeFromDate,
  insert: DateTimeFromDateWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category models
 */
export interface DateTimeInsertFromNumber extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtcFromNumber
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, number>
    readonly json: typeof Schema.DateTimeUtcFromNumber
  }>
{}

/**
 * A field that represents a date-time value that is inserted as the current
 * `DateTime.Utc`. It is serialized as a `number`.
 *
 * It is omitted from updates and is available for selection.
 *
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeInsertFromNumber: DateTimeInsertFromNumber = Field({
  select: Schema.DateTimeUtcFromNumber,
  insert: DateTimeFromNumberWithNow,
  json: Schema.DateTimeUtcFromNumber
})

/**
 * @since 1.0.0
 * @category models
 */
export interface DateTimeUpdate extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtc
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, string>
    readonly update: VariantSchema.Overrideable<DateTime.Utc, string>
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * A field that represents a date-time value that is updated as the current
 * `DateTime.Utc`. It is serialized as a string for the database.
 *
 * It is set to the current `DateTime.Utc` on updates and inserts and is
 * available for selection.
 *
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeUpdate: DateTimeUpdate = Field({
  select: Schema.DateTimeUtc,
  insert: DateTimeWithNow,
  update: DateTimeWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category models
 */
export interface DateTimeUpdateFromDate extends
  VariantSchema.Field<{
    readonly select: DateTimeFromDate
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>
    readonly update: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>
    readonly json: typeof Schema.DateTimeUtc
  }>
{}

/**
 * A field that represents a date-time value that is updated as the current
 * `DateTime.Utc`. It is serialized as a `Date` for the database.
 *
 * It is set to the current `DateTime.Utc` on updates and inserts and is
 * available for selection.
 *
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeUpdateFromDate: DateTimeUpdateFromDate = Field({
  select: DateTimeFromDate,
  insert: DateTimeFromDateWithNow,
  update: DateTimeFromDateWithNow,
  json: Schema.DateTimeUtc
})

/**
 * @since 1.0.0
 * @category models
 */
export interface DateTimeUpdateFromNumber extends
  VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtcFromNumber
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, number>
    readonly update: VariantSchema.Overrideable<DateTime.Utc, number>
    readonly json: typeof Schema.DateTimeUtcFromNumber
  }>
{}

/**
 * A field that represents a date-time value that is updated as the current
 * `DateTime.Utc`. It is serialized as a `number`.
 *
 * It is set to the current `DateTime.Utc` on updates and inserts and is
 * available for selection.
 *
 * @since 1.0.0
 * @category schemas
 */
export const DateTimeUpdateFromNumber: DateTimeUpdateFromNumber = Field({
  select: Schema.DateTimeUtcFromNumber,
  insert: DateTimeFromNumberWithNow,
  update: DateTimeFromNumberWithNow,
  json: Schema.DateTimeUtcFromNumber
})

/**
 * @since 1.0.0
 * @category models
 */
export interface JsonFromString<S extends Schema.Schema.All | Schema.PropertySignature.All>
  extends
    VariantSchema.Field<{
      readonly select: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>
      readonly insert: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>
      readonly update: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>
      readonly json: S
      readonly jsonCreate: S
      readonly jsonUpdate: S
    }>
{}

/**
 * A field that represents a JSON value stored as text in the database.
 *
 * The "json" variants will use the object schema directly.
 *
 * @since 1.0.0
 * @category schemas
 */
export const JsonFromString = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
  schema: S
): JsonFromString<S> => {
  const parsed = Schema.parseJson(schema as any)
  return Field({
    select: parsed,
    insert: parsed,
    update: parsed,
    json: schema,
    jsonCreate: schema,
    jsonUpdate: schema
  }) as any
}
