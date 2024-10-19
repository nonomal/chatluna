import type { BaseLanguageModelInterface } from '@langchain/core/language_models/base'
import {
    BaseMessage,
    getBufferString,
    SystemMessage
} from '@langchain/core/messages'
import { BasePromptTemplate, PromptTemplate } from '@langchain/core/prompts'
import {
    InputValues,
    MemoryVariables,
    OutputValues
} from '@langchain/core/memory'
import { BaseChatMemory, BaseChatMemoryInput } from './chat_memory.js'

/**
 * Interface for the input parameters of the ConversationSummaryMemory
 * class.
 */
export interface ConversationSummaryMemoryInput
    extends BaseConversationSummaryMemoryInput {}

/**
 * Interface for the input parameters of the BaseConversationSummaryMemory
 * class.
 */
export interface BaseConversationSummaryMemoryInput
    extends BaseChatMemoryInput {
    llm: BaseLanguageModelInterface
    memoryKey?: string
    humanPrefix?: string
    aiPrefix?: string
    prompt?: BasePromptTemplate
    summaryChatMessageClass?: new (content: string) => BaseMessage
}

/**
 * Abstract class that provides a structure for storing and managing the
 * memory of a conversation. It includes methods for predicting a new
 * summary for the conversation given the existing messages and summary.
 */
export abstract class BaseConversationSummaryMemory extends BaseChatMemory {
    memoryKey = 'history'

    humanPrefix = 'Human'

    aiPrefix = 'AI'

    llm: BaseLanguageModelInterface

    prompt: BasePromptTemplate = SUMMARY_PROMPT

    summaryChatMessageClass: new (content: string) => BaseMessage =
        SystemMessage

    constructor(fields: BaseConversationSummaryMemoryInput) {
        const {
            returnMessages,
            inputKey,
            outputKey,
            chatHistory,
            humanPrefix,
            aiPrefix,
            llm,
            prompt,
            summaryChatMessageClass
        } = fields

        super({ returnMessages, inputKey, outputKey, chatHistory })

        this.memoryKey = fields?.memoryKey ?? this.memoryKey
        this.humanPrefix = humanPrefix ?? this.humanPrefix
        this.aiPrefix = aiPrefix ?? this.aiPrefix
        this.llm = llm
        this.prompt = prompt ?? this.prompt
        this.summaryChatMessageClass =
            summaryChatMessageClass ?? this.summaryChatMessageClass
    }

    /**
     * Predicts a new summary for the conversation given the existing messages
     * and summary.
     * @param messages Existing messages in the conversation.
     * @param existingSummary Current summary of the conversation.
     * @returns A promise that resolves to a new summary string.
     */
    async predictNewSummary(
        messages: BaseMessage[],
        existingSummary: string
    ): Promise<string> {
        const newLines = getBufferString(
            messages,
            this.humanPrefix,
            this.aiPrefix
        )
        const chain = this.prompt.pipe(this.llm)
        const message = await chain
            .invoke({
                summary: existingSummary,
                new_lines: newLines
            })
            .then((res) => res as BaseMessage)
        return message.content as string
    }
}

/**
 * Class that provides a concrete implementation of the conversation
 * memory. It includes methods for loading memory variables, saving
 * context, and clearing the memory.
 * @example
 * ```typescript
 * const memory = new ConversationSummaryMemory({
 *   memoryKey: "chat_history",
 *   llm: new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 }),
 * });
 *
 * const model = new ChatOpenAI();
 * const prompt =
 *   PromptTemplate.fromTemplate(`The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.
 *
 * Current conversation:
 * {chat_history}
 * Human: {input}
 * AI:`);
 * const chain = new LLMChain({ llm: model, prompt, memory });
 *
 * const res1 = await chain.call({ input: "Hi! I'm Jim." });
 * console.log({ res1, memory: await memory.loadMemoryVariables({}) });
 *
 * const res2 = await chain.call({ input: "What's my name?" });
 * console.log({ res2, memory: await memory.loadMemoryVariables({}) });
 *
 * ```
 */
export class ConversationSummaryMemory extends BaseConversationSummaryMemory {
    buffer = ''

    constructor(fields: ConversationSummaryMemoryInput) {
        super(fields)
    }

    get memoryKeys() {
        return [this.memoryKey]
    }

    /**
     * Loads the memory variables for the conversation memory.
     * @returns A promise that resolves to an object containing the memory variables.
     */
    async loadMemoryVariables(_: InputValues): Promise<MemoryVariables> {
        if (this.returnMessages) {
            const result = {
                [this.memoryKey]: [
                    // eslint-disable-next-line new-cap
                    new this.summaryChatMessageClass(this.buffer)
                ]
            }
            return result
        }
        const result = { [this.memoryKey]: this.buffer }
        return result
    }

    /**
     * Saves the context of the conversation memory.
     * @param inputValues Input values for the conversation.
     * @param outputValues Output values from the conversation.
     * @returns A promise that resolves when the context has been saved.
     */
    async saveContext(
        inputValues: InputValues,
        outputValues: OutputValues
    ): Promise<void> {
        await super.saveContext(inputValues, outputValues)
        const messages = await this.chatHistory.getMessages()
        this.buffer = await this.predictNewSummary(
            messages.slice(-2),
            this.buffer
        )
    }

    /**
     * Clears the conversation memory.
     * @returns A promise that resolves when the memory has been cleared.
     */
    async clear() {
        await super.clear()
        this.buffer = ''
    }
}

const _DEFAULT_SUMMARIZER_TEMPLATE = `Progressively summarize the lines of conversation provided, adding onto the previous summary returning a new summary.

EXAMPLE
Current summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good.

New lines of conversation:
Human: Why do you think artificial intelligence is a force for good?
AI: Because artificial intelligence will help humans reach their full potential.

New summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good because it will help humans reach their full potential.
END OF EXAMPLE

Current summary:
{summary}

New lines of conversation:
{new_lines}

New summary:`

// eslint-disable-next-line spaced-comment
const SUMMARY_PROMPT = /*#__PURE__*/ new PromptTemplate({
    inputVariables: ['summary', 'new_lines'],
    template: _DEFAULT_SUMMARIZER_TEMPLATE
})