import { Context } from 'koishi'
import { Config } from '../../../config'

export function apply(ctx: Context, config: Config) {
    if (!config.longMemory) {
        return undefined
    }
}