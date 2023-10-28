import { PlatformModelAndEmbeddingsClient } from '@dingyi222666/koishi-plugin-chathub/lib/llm-core/platform/client'
import { ClientConfig } from '@dingyi222666/koishi-plugin-chathub/lib/llm-core/platform/config'
import {
    ChatHubBaseEmbeddings,
    ChatHubChatModel
} from '@dingyi222666/koishi-plugin-chathub/lib/llm-core/platform/model'
import {
    ModelInfo,
    ModelType
} from '@dingyi222666/koishi-plugin-chathub/lib/llm-core/platform/types'
import { Context } from 'koishi'
import { Config } from '.'
import {
    ChatHubError,
    ChatHubErrorCode
} from '@dingyi222666/koishi-plugin-chathub/lib/utils/error'
import { QWenRequester } from './requester'

export class QWenClient extends PlatformModelAndEmbeddingsClient<ClientConfig> {
    platform = 'qwen'

    private _requester: QWenRequester

    private _models: Record<string, ModelInfo>

    constructor(
        ctx: Context,
        private _config: Config,
        clientConfig: ClientConfig
    ) {
        super(ctx, clientConfig)

        this._requester = new QWenRequester(clientConfig, _config)
    }

    async init(): Promise<void> {
        const models = await this.getModels()

        this._models = {}

        for (const model of models) {
            this._models[model.name] = model
        }
    }

    async getModels(): Promise<ModelInfo[]> {
        if (this._models) {
            return Object.values(this._models)
        }

        try {
            // TODO: embeddings
            const rawModels = ['qwen-turbo', 'qwen-plus']

            return rawModels.map((model) => {
                return {
                    name: model,
                    type: model.includes('qwen')
                        ? ModelType.llm
                        : ModelType.embeddings,
                    maxTokens: 8000,
                    supportChatMode: model.includes('qwen')
                        ? (_) => true
                        : undefined
                }
            })
        } catch (e) {
            throw new ChatHubError(ChatHubErrorCode.MODEL_INIT_ERROR, e)
        }
    }

    protected _createModel(
        model: string
    ): ChatHubChatModel | ChatHubBaseEmbeddings {
        const info = this._models[model]

        if (info == null) {
            throw new ChatHubError(ChatHubErrorCode.MODEL_NOT_FOUND)
        }

        if (info.type === ModelType.llm) {
            return new ChatHubChatModel({
                requester: this._requester,
                model,
                modelMaxContextSize: info.maxTokens,
                maxTokens: this._config.maxTokens,
                timeout: this._config.timeout,
                temperature: this._config.temperature,
                maxRetries: this._config.maxRetries,
                llmType: 'qwen'
            })
        }

        /* return new ChatHubEmbeddings({
            client: this._requester,
            maxRetries: this._config.maxRetries
        }) */
    }
}