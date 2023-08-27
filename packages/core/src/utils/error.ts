import { createLogger } from './logger'

export let ERROR_FORMAT_TEMPLATE = "插件出现错误，错误码为 %s。请联系 ChatHub 开发者解决此问题。"

const logger = createLogger()

export class ChatHubError extends Error {
    constructor(public errorCode: ChatHubErrorCode = ChatHubErrorCode.UNKNOWN_ERROR, public originError?: Error) {
        super(ERROR_FORMAT_TEMPLATE.replace("%s", errorCode.toString()))
        this.name = 'ChatHubError';
        logger.error("=".repeat(20) + "ChatHubError:" + errorCode + "=".repeat(20))
        if (originError) {
            logger.error(originError)
            if ((originError as any).cause) {
                logger.error((originError as any).cause)
            }
        }
    }

    public toString() {
        return this.message
    }

}

export enum ChatHubErrorCode {
    NETWORK_ERROR = 1,
    UNSUPPORTED_PROXY_PROTOCOL = 2,
    API_KEY_UNAVAILABLE = 100,
    API_REQUEST_RESOLVE_CAPTCHA = 101,
    API_REQUEST_TIMEOUT = 102,
    API_REQUEST_FAILED = 103,
    MODEL_ADAPTER_NOT_FOUND = 300,
    MODEL_NOT_FOUND = 301,
    PREST_NOT_FOUND = 302,
    MODEL_INIT_ERROR = 303,
    EMBEDDINGS_INIT_ERROR = 304,
    VECTOR_STORE_INIT_ERROR = 305,
    CHAT_HISTORY_INIT_ERROR = 306,
    MEMBER_NOT_IN_ROOM = 400,
    ROOM_NOT_JOINED = 401,
    ROOM_NOT_FOUND_MASTER = 402,
    ROOM_TEMPLATE_INVALID = 403,
    THE_NAME_FIND_IN_MULTIPLE_ROOMS = 404,
    ROOM_NOT_FOUND = 405,
    UNKNOWN_ERROR = 999,
}