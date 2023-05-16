import { Context } from 'koishi';
import { Config } from '../config';
import { ChatChain } from '../chain';
import { createLogger } from '@dingyi222666/chathub-llm-core/lib/utils/logger';
import { Factory } from '@dingyi222666/chathub-llm-core/lib/chat/factory';
import { ModelProvider } from '@dingyi222666/chathub-llm-core/lib/model/base';

const logger = createLogger("@dingyi222666/chathub/middlewares/list_all_model")


export function apply(ctx: Context, config: Config, chain: ChatChain) {
    chain.middleware("list_all_model", async (session, context) => {

        const { command } = context

        if (command !== "listModel") return true

        const buffer = ["以下是目前可用的模型列表"]

        const modelProviders = await Factory.selectModelProviders(async () => true)

        for (const provider of modelProviders) {

            const models = await provider.listModels()

            for (const model of models) {
                buffer.push(provider.name + '/' + model)
            }
        }

        buffer.push("\n你可以使用 chathub.setModel <model> 来设置默认使用的模型")

        context.message = buffer.join("\n")

        return false
    }).after("lifecycle-handle_command")
}

declare module '../chain' {
    interface ChainMiddlewareName {
        "list_all_model": never
    }
}