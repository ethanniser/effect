/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import { AiError } from "./AiError.js"
import type * as AiTool from "./AiTool.js"
import * as InternalCommon from "./internal/common.js"

const constDisableValidation = { disableValidation: true }

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId = Symbol.for("@effect/ai/AiResponse")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * Represents a response received from a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export class AiResponse extends Schema.Class<AiResponse>(
  "@effect/ai/AiResponse"
)({
  /**
   * The parts of the response.
   */
  parts: Schema.Array(Schema.suspend(() => Part))
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId

  /**
   * Returns the generated text content of the response.
   */
  get text(): string {
    let text = ""
    let found = false
    for (const part of this.parts) {
      if (part._tag === "TextPart") {
        text += found ? "\n\n" + part.text : part.text
        found = true
      }
    }
    return text
  }

  /**
   * Returns the finish reason for the response, or `"unknown"` if the finish
   * reason is not known.
   */
  get finishReason(): FinishReason {
    const finishPart = this.parts.find((part) => part._tag === "FinishPart")
    return finishPart?.reason ?? "unknown"
  }

  /**
   * Returns all tool calls contained within the response.
   */
  get toolCalls(): ReadonlyArray<ToolCallPart> {
    return this.parts.filter((part) => part._tag === "ToolCallPart")
  }

  /**
   * Attempts to retrieve provider-specific response metadata.
   */
  getProviderMetadata<I, S>(tag: Context.Tag<I, S>): Option.Option<S> {
    const finishPart = this.parts.find((part) => part._tag === "FinishPart")
    return Option.fromNullable(finishPart?.providerMetadata[tag.key] as S)
  }
}

/**
 * @since 1.0.0
 * @category Models
 */
export const FromJson: Schema.transform<
  Schema.SchemaClass<unknown, string, never>,
  typeof AiResponse
> = Schema.parseJson(AiResponse)

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const StructuredResponseTypeId = Symbol.for("@effect/ai/AiResponse/StructuredResponse")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type StructuredResponseTypeId = typeof StructuredResponseTypeId

/**
 * Represents a response generated by a large language model that includes
 * structured output.
 *
 * @since 1.0.0
 * @category Models
 */
export class WithStructuredOutput<A> extends AiResponse {
  /**
   * @since 1.0.0
   */
  readonly [StructuredResponseTypeId]: StructuredResponseTypeId = StructuredResponseTypeId

  /**
   * The identifier of the tool which generated the structured output.
   */
  readonly id: ToolCallId

  /**
   * The name of the tool which generated the structured output.
   */
  readonly name: string

  /**
   * The structured output generated by the model.
   */
  readonly value: A

  constructor(props: {
    /**
     * The identifier of the tool which generated the structured output.
     */
    readonly id: ToolCallId
    /**
     * The name of the tool which generated the structured output.
     */
    readonly name: string
    /**
     * The structured output generated by the model.
     */
    readonly value: A
    /**
     * The parts of the response.
     */
    readonly parts: ReadonlyArray<Part>
  }, options?: Schema.MakeOptions) {
    super({ parts: props.parts }, options)
    this.id = props.id
    this.name = props.name
    this.value = props.value
  }
}

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const WithToolCallResultsTypeId = Symbol.for("@effect/ai/AiResponse/WithToolCallResults")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type WithToolCallResultsTypeId = typeof WithToolCallResultsTypeId

/**
 * Represents a response generated by a large language model that includes
 * tool call results.
 *
 * @since 1.0.0
 * @category Models
 */
export class WithToolCallResults<Tools extends AiTool.Any> extends AiResponse {
  /**
   * @since 1.0.0
   */
  readonly [WithToolCallResultsTypeId]: WithToolCallResultsTypeId = WithToolCallResultsTypeId

  /**
   * The tool call results, represented as a mapping between the tool call
   * identifier and the result of the tool call handler.
   */
  readonly results: ReadonlyMap<ToolCallId, {
    readonly name: string
    readonly result: AiTool.Success<Tools>
  }>
  /**
   * The encoded tool call results, suitable for incorporation into subsequent
   * requests to the large language model.
   */
  readonly encodedResults: ReadonlyMap<ToolCallId, {
    readonly name: string
    readonly result: unknown
  }>

  constructor(props: {
    /**
     * The tool call results, represented as a mapping between the tool call
     * identifier and the result of the tool call handler.
     */
    readonly results: ReadonlyMap<ToolCallId, {
      readonly name: string
      readonly result: AiTool.Success<Tools>
    }>
    /**
     * The encoded tool call results, suitable for incorporation into subsequent
     * requests to the large language model.
     */
    readonly encodedResults: ReadonlyMap<ToolCallId, {
      readonly name: string
      readonly result: unknown
    }>
    /**
     * The parts of the response.
     */
    readonly parts: ReadonlyArray<Part>
  }, options?: Schema.MakeOptions) {
    super({ parts: props.parts }, options)
    this.results = props.results
    this.encodedResults = props.encodedResults
  }

  getToolCallResult(toolName: AiTool.Name<Tools>): Option.Option<AiTool.Success<Tools>> {
    for (const { name, result } of this.results.values()) {
      if (name === toolName) {
        return Option.some(result)
      }
    }
    return Option.none()
  }
}

// =============================================================================
// Part
// =============================================================================

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const PartTypeId = Symbol.for("@effect/ai/AiResponse/Part")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type PartTypeId = typeof PartTypeId

/**
 * Represents a content source that was used to generate a model response.
 *
 * @since 1.0.0
 * @category Models
 */
export class ContentSourceAnnotation extends Schema.TaggedClass<ContentSourceAnnotation>(
  "@effect/ai/AiResponse/Annotation/ContentSourceAnnotation"
)("ContentSourceAnnotation", {
  /**
   * The identifier for the content source.
   */
  id: Schema.String,
  /**
   * The index of the content source in the list of sources provided in the
   * model request parameters.
   */
  index: Schema.Int,
  /**
   * The provider-specific type of the file annotation.
   *
   * For example, when using Anthropic the type may be `char_location`,
   * `page_location`, or `content_block_location`.
   */
  type: Schema.String,
  /**
   * The content used from the content source in the message generated by the
   * model.
   */
  referencedContent: Schema.String,
  /**
   * The index of the first character of the content referenced by the content
   * source in the message generated by the model.
   */
  startIndex: Schema.Int,
  /**
   * The index of the last character of the content referenced by the content
   * source in the message generated by the model.
   */
  endIndex: Schema.Int
}) {}

/**
 * Represents a file that was used to generate a model response.
 *
 * @since 1.0.0
 * @category Models
 */
export class FileAnnotation extends Schema.TaggedClass<FileAnnotation>(
  "@effect/ai/AiResponse/Annotation/FileAnnotation"
)("FileAnnotation", {
  /**
   * The identifier for the file.
   */
  id: Schema.String,
  /**
   * The provider-specific type of the file annotation.
   *
   * For example, when using OpenAi the type may be `file_citation` or
   * `file_path`.
   */
  type: Schema.String,
  /**
   * The index of the file in the list of files provided in the model request
   * parameters.
   */
  index: Schema.Int
}) {}

/**
 * Represents a web resource that was used to generate a model response.
 *
 * @since 1.0.0
 * @category Models
 */
export class UrlAnnotation extends Schema.TaggedClass<UrlAnnotation>(
  "@effect/ai/AiResponse/Annotation/UrlAnnotation"
)("UrlAnnotation", {
  /**
   * The URL of the web resource.
   */
  url: Schema.String,
  /**
   * The title of the web resource.
   */
  title: Schema.String,
  /**
   * The index of the first character of the content referenced by the web
   * resource in the message generated by the model.
   */
  startIndex: Schema.Int,
  /**
   * The index of the last character of the content referenced by the web
   * resource in the message generated by the model.
   */
  endIndex: Schema.Int
}) {}

/**
 * Represents annotations that were used to support the message generated by
 * a model.
 *
 * @since 1.0.0
 * @category Models
 */
export const Annotation: Schema.Union<[
  typeof ContentSourceAnnotation,
  typeof FileAnnotation,
  typeof UrlAnnotation
]> = Schema.Union(
  ContentSourceAnnotation,
  FileAnnotation,
  UrlAnnotation
)

/**
 * @since 1.0.0
 * @category Models
 */
export type Annotation = typeof Annotation.Type

/**
 * Represents part of the text generated by the model.
 *
 * @since 1.0.0
 * @category Models
 */
export class TextPart extends Schema.TaggedClass<TextPart>(
  "@effect/ai/AiResponse/TextPart"
)("TextPart", {
  /**
   * The text content generated by the model.
   */
  text: Schema.String,
  /**
   * The annotations used to support the text generated by the model.
   */
  annotations: Schema.optionalWith(Schema.Array(Annotation), {
    default: () => []
  })
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents part of the reasoning carried out by the model to generate a
 * response.
 *
 * @since 1.0.0
 * @category Models
 */
export class ReasoningPart extends Schema.TaggedClass<ReasoningPart>(
  "@effect/ai/AiResponse/ReasoningPart"
)("ReasoningPart", {
  /**
   * The reasoning content that the model used to return the output.
   */
  reasoningText: Schema.String,
  /**
   * An optional signature which verifies that the reasoning text was generated
   * by the model.
   */
  signature: Schema.optional(Schema.String)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents part of the reasoning carried out by the model to generate a
 * response which needed to be encrypted by the model provider for safety
 * reasons.
 *
 * @since 1.0.0
 * @category Models
 */
export class RedactedReasoningPart extends Schema.TaggedClass<RedactedReasoningPart>(
  "@effect/ai/AiResponse/RedactedReasoningPart"
)("RedactedReasoningPart", {
  /**
   * The content in the reasoning that was encrypted by the model provider for
   * safety reasons.
   */
  redactedText: Schema.String
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents the identifier generated by a model when a tool call is requested.
 *
 * @since 1.0.0
 * @category Models
 */
export const ToolCallId: Schema.brand<typeof Schema.String, "@effect/ai/ToolCallId"> = InternalCommon.ToolCallId

/**
 * @since 1.0.0
 * @category Models
 */
export type ToolCallId = typeof ToolCallId.Type

/**
 * Represents a request by a model to call a specific tool that it has been
 * provided with.
 *
 * @since 1.0.0
 * @category Models
 */
export class ToolCallPart extends Schema.TaggedClass<ToolCallPart>(
  "@effect/ai/AiResponse/ToolCallPart"
)("ToolCallPart", {
  /**
   * The identifier generated by a model when requesting a tool call.
   */
  id: ToolCallId,
  /**
   * The name of the tool to call.
   */
  name: Schema.String,
  /**
   * The arguments to call the tool with as a JSON-serializable object that
   * matches the tool call input schema.
   */
  params: Schema.Unknown
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId

  /**
   * Converts a raw tool call into a `ToolCallPart` by parsing tool call
   * parameters as a JSON string. If your tool call parameters are already
   * parsed, use `ToolCallPart.fromUnknown`.
   *
   * @since 1.0.0
   */
  static fromJson({ id, name, params }: {
    readonly id: string
    readonly name: string
    readonly params: string
  }): Effect.Effect<ToolCallPart, AiError> {
    return Effect.try({
      try() {
        return new ToolCallPart({
          id: ToolCallId.make(id, constDisableValidation),
          name,
          params: JSON.parse(params)
        }, constDisableValidation)
      },
      catch: (cause) =>
        new AiError({
          module: "AiResponse",
          method: "ToolCall.fromJson",
          description: `Failed to parse parameters from JSON:\n${params}`,
          cause
        })
    })
  }

  /**
   * Converts a raw tool call into a `ToolCallPart` assuming that the tool call
   * parameters have already been parsed. If your tool call parameters have not
   * already been parsed, use `ToolCallPart.fromJson`.
   *
   * @since 1.0.0
   */
  static fromUnknown({ id, name, params }: {
    readonly id: string
    readonly name: string
    readonly params: unknown
  }): ToolCallPart {
    return new ToolCallPart({
      id: ToolCallId.make(id, constDisableValidation),
      name,
      params
    }, constDisableValidation)
  }
}

/**
 * Represents the initial response metadata generated by a model when responding
 * to a request.
 *
 * @since 1.0.0
 * @categor Models
 */
export class MetadataPart extends Schema.TaggedClass<MetadataPart>(
  "@effect/ai/AiResponse/MetadataPart"
)("MetadataPart", {
  /**
   * The unique identifier for the response. Each chunk of the response should
   * have the same identifier.
   */
  id: Schema.optional(Schema.String),
  /**
   * The model that was used to generate the response.
   */
  model: Schema.String,
  /**
   * The Unix timestamp of when the model began generated the response.
   */
  timestamp: Schema.optional(Schema.DateFromNumber)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents the reason why a model finished generation of a response.
 *
 * Possible finish reasons:
 * - `"stop"`: The model generated a stop sequence.
 * - `"length"`: The model exceeded its token budget.
 * - `"content-filter"`: The model generated content which violated a content filter.
 * - `"tool-calls"`: The model triggered a tool call.
 * - `"error"`: The model encountered an error.
 * - `"other"`: The model stopped for a reason not supported by this protocol.
 * - `"unknown"`: The model did not specify a finish reason.
 *
 * @since 1.0.0
 * @category Models
 */
export const FinishReason: Schema.Literal<[
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
  "unknown"
]> = Schema.Literal(
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
  "unknown"
)

/**
 * @since 1.0.0
 * @category Models
 */
export type FinishReason = typeof FinishReason.Type

/**
 * Represents information about the number of tokens used by the model to
 * generate a response.
 *
 * @since 1.0.0
 * @category Models
 */
export class Usage extends Schema.Class<Usage>(
  "@effect/ai/AiResponse/Usage"
)({
  /**
   * The number of tokens sent in the request to the model.
   */
  inputTokens: Schema.Number,
  /**
   * The number of tokens that the model generated for the request.
   */
  outputTokens: Schema.Number,
  /**
   * The total of number of input tokens and output tokens generated by the
   * model.
   */
  totalTokens: Schema.Number,
  /**
   * The number of reasoning tokens that the model used to generate the output
   * for the request.
   */
  reasoningTokens: Schema.Number,
  /**
   * The number of input tokens read from the prompt cache for the request.
   */
  cacheReadInputTokens: Schema.Number,
  /**
   * The number of input tokens written to the prompt cache for the request.
   */
  cacheWriteInputTokens: Schema.Number
}) {}

/**
 * Represents additional provider-specific metadata that was returned by the
 * model. Specific providers will use module augmentation to add their own
 * specific provider metadata.
 *
 * The outer record is keyed by provider name, while the inner record is keyed
 * by the names of the provider-specific metadata properties.
 *
 * For example:
 *
 * ```ts
 * const providerMeta = {
 *   "amazon-bedrock": {
 *     // Provider specific metadata
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ProviderMetadata {}

/**
 * Represents the final part of a response generated by a large language model.
 *
 * Contains useful information such as tokens used as part of the interaction
 * with the model.
 *
 * @since 1.0.0
 * @category Models
 */
export class FinishPart extends Schema.TaggedClass<FinishPart>(
  "@effect/ai/AiResponse/FinishPart"
)("FinishPart", {
  /**
   * The usage information for the response.
   */
  usage: Usage,
  /**
   * The reason the model finished generating a response.
   */
  reason: FinishReason,
  /**
   * Provider-specific metadata associated with the response.
   */
  providerMetadata: Schema.optionalWith(
    Schema.Record({
      key: Schema.String,
      value: Schema.Record({ key: Schema.String, value: Schema.Unknown })
    }),
    { default: () => ({}) }
  )
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents an single part of a response received from a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export const Part: Schema.Union<[
  typeof TextPart,
  typeof ReasoningPart,
  typeof RedactedReasoningPart,
  typeof ToolCallPart,
  typeof MetadataPart,
  typeof FinishPart
]> = Schema.Union(
  TextPart,
  ReasoningPart,
  RedactedReasoningPart,
  ToolCallPart,
  MetadataPart,
  FinishPart
)

/**
 * @since 1.0.0
 * @category Models
 */
export type Part = typeof Part.Type

/**
 * @since 1.0.0
 * @category Guards
 */
export const is = (u: unknown): u is AiResponse => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category Guards
 */
export const isPart = (u: unknown): u is Part => Predicate.hasProperty(u, PartTypeId)

/**
 * @since 1.0.0
 * @category Guards
 */
export const isStructured = (u: unknown): u is WithStructuredOutput<any> =>
  Predicate.hasProperty(u, StructuredResponseTypeId)

/**
 * @since 1.0.0
 * @category Guards
 */
export const hasToolCallResults = (u: unknown): u is WithToolCallResults<any> =>
  Predicate.hasProperty(u, WithToolCallResultsTypeId)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const empty: AiResponse = new AiResponse(
  { parts: [] },
  constDisableValidation
)

/**
 * Combines two responses into a single response.
 *
 * @since 1.0.0
 * @category Combination
 */
export const merge: {
  (other: AiResponse): (self: AiResponse) => AiResponse
  (self: AiResponse, other: AiResponse): AiResponse
} = dual<
  (other: AiResponse) => (self: AiResponse) => AiResponse,
  (self: AiResponse, other: AiResponse) => AiResponse
>(2, (self, other) => {
  const newParts = mergeParts(self, other)
  if (hasToolCallResults(self) && hasToolCallResults(other)) {
    return new WithToolCallResults({
      results: new Map([...self.results, ...other.results]) as any,
      encodedResults: new Map([...self.encodedResults, ...other.encodedResults]),
      parts: newParts
    }, constDisableValidation)
  } else if (hasToolCallResults(self)) {
    return new WithToolCallResults({
      results: self.results as any,
      encodedResults: self.encodedResults,
      parts: newParts
    }, constDisableValidation)
  } else if (hasToolCallResults(other)) {
    return new WithToolCallResults({
      results: other.results as any,
      encodedResults: other.encodedResults,
      parts: newParts
    }, constDisableValidation)
  } else if (isStructured(self) && isStructured(other)) {
    return new WithStructuredOutput({
      id: self.id,
      name: self.name,
      value: other.value,
      parts: newParts
    }, constDisableValidation)
  } else if (isStructured(self)) {
    return new WithStructuredOutput({
      id: self.id,
      name: self.name,
      value: self.value,
      parts: newParts
    }, constDisableValidation)
  } else if (isStructured(other)) {
    return new WithStructuredOutput({
      id: other.id,
      name: other.name,
      value: other.value,
      parts: newParts
    }, constDisableValidation)
  }
  return new AiResponse({ parts: newParts }, constDisableValidation)
})

const mergeParts = (self: AiResponse, other: AiResponse): ReadonlyArray<Part> => {
  if (other.parts.length === 0) {
    return self.parts
  }
  if (self.parts.length === 0) {
    return other.parts
  }

  const result: Array<Part> = []
  let accumulatedText = ""

  const flushText = () => {
    if (accumulatedText.length > 0) {
      result.push(new TextPart({ text: accumulatedText }, constDisableValidation))
      accumulatedText = ""
    }
  }

  for (const part of self.parts) {
    if (part._tag === "TextPart") {
      accumulatedText += part.text
    } else {
      flushText()
      result.push(part)
    }
  }

  for (const part of other.parts) {
    if (part._tag === "TextPart") {
      accumulatedText += part.text
    } else {
      flushText()
      result.push(part)
    }
  }

  flushText()

  return result
}

/**
 * Adds the specified tool calls to the provided `AiResponse`.
 *
 * **NOTE**: With this method, the tool call parameters will be parsed as a
 * JSON string. If your tool call parameters are already parsed, use
 * `AiResponse.withToolCallsUnknown`.
 *
 * @since 1.0.0
 * @category Combination
 */
export const withToolCallsJson: {
  (
    toolCalls: Iterable<{
      readonly id: string
      readonly name: string
      readonly params: string
    }>
  ): (self: AiResponse) => Effect.Effect<AiResponse, AiError>
  (
    self: AiResponse,
    toolCalls: Iterable<{
      readonly id: string
      readonly name: string
      readonly params: string
    }>
  ): Effect.Effect<AiResponse, AiError>
} = dual<
  (
    toolCalls: Iterable<{
      readonly id: string
      readonly name: string
      readonly params: string
    }>
  ) => (self: AiResponse) => Effect.Effect<AiResponse, AiError>,
  (
    self: AiResponse,
    toolCalls: Iterable<{
      readonly id: string
      readonly name: string
      readonly params: string
    }>
  ) => Effect.Effect<AiResponse, AiError>
>(2, (self, toolCalls) =>
  Effect.forEach(toolCalls, (toolCall) => ToolCallPart.fromJson(toolCall)).pipe(
    Effect.map((parts) =>
      new AiResponse({
        parts: [...self.parts, ...parts]
      }, constDisableValidation)
    )
  ))
