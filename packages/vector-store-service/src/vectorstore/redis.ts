import { RedisVectorStore } from '@langchain/community/vectorstores/redis'
import { Context, Logger } from 'koishi'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/lib/services/chat'
import { createLogger } from 'koishi-plugin-chatluna/lib/utils/logger'
import { Config } from '..'

let logger: Logger

export async function apply(
    ctx: Context,
    config: Config,
    plugin: ChatLunaPlugin
) {
    logger = createLogger(ctx, 'chatluna-vector-store-service')

    await plugin.registerVectorStore('redis', async (params) => {
        const embeddings = params.embeddings

        const client = await createClient(config.redisUrl)

        await client.connect()

        return await RedisVectorStore.fromTexts(
            ['sample'],
            [' '],
            embeddings,

            {
                // FIXME: set redis
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                redisClient: client as any,
                indexName: params.key ?? 'chatluna'
            }
        )
    })
}

async function createClient(url: string) {
    const redis = await importRedis()

    return redis.createClient({
        url
    })
}

async function importRedis() {
    try {
        const any = await import('redis')

        return any
    } catch (err) {
        logger.error(err)
        throw new Error(
            'Please install redis as a dependency with, e.g. `npm install -S redis`'
        )
    }
}
