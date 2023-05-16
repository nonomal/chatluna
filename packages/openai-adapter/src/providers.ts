import OpenAIPlugin from '.';
import { CreateParams, ModelProvider } from '@dingyi222666/chathub-llm-core/lib/model/base'
import { Api } from './api';
import { OpenAIChatModel } from './models';
import { BaseChatModel } from 'langchain/chat_models/base';



export class OpenAIModelProvider extends ModelProvider {

    private _models: string[] | null = null

    private _API: Api | null = null

    name = "OpenAIMModelProvider"
    description?: string = "OpenAI model provider, provide gpt3.5/gpt4 model"

    constructor(private readonly config: OpenAIPlugin.Config) {
        super()
        this._API = new Api(config)
    }

    async listModels(): Promise<string[]> {
        if (this._models) {
            return this._models
        }

        this._models = await this._API.listModels()

        return this._models
    }

    async isSupported(modelName: string): Promise<boolean> {
        return (await this.listModels()).includes(modelName)
    }

    async recommendModel(): Promise<string> {
        return (await this.listModels()).find((value) => value.includes("gpt3.5"))
    }


    async createModel(modelName: string, params: CreateParams): Promise<BaseChatModel> {
        const hasModel = (await this.listModels()).includes(modelName)

        if (!hasModel) {
            throw new Error(`Can't find model ${modelName}`)
        }

        return new OpenAIChatModel(modelName, this.config)
    }

    getExtraInfo(): Record<string, any> {
        return this.config
    }
}