import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import { Context } from 'vm'
import { Config } from '.'
import { SearchManager } from './provide'
// import start
import { apply as bing_api } from './providers/bing_api'
import { apply as bing_web } from './providers/bing_web'
import { apply as duckduckgo_lite } from './providers/duckduckgo_lite'
import { apply as google_web } from './providers/google_web'
import { apply as serper } from './providers/serper'
import { apply as tavily } from './providers/tavily'
import { apply as wikipedia } from './providers/wikipedia' // import end

export async function providerPlugin(
    ctx: Context,
    config: Config,
    plugin: ChatLunaPlugin,
    manager: SearchManager
) {
    type Plugin = (
        ctx: Context,
        config: Config,
        plugin: ChatLunaPlugin,
        manager: SearchManager
    ) => PromiseLike<void> | void

    const middlewares: Plugin[] =
        // middleware start
        [
            bing_api,
            bing_web,
            duckduckgo_lite,
            google_web,
            serper,
            tavily,
            wikipedia
        ] // middleware end

    for (const middleware of middlewares) {
        await middleware(ctx, config, plugin, manager)
    }
}
