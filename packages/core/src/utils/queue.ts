import { sleep } from 'koishi'
import { ObjectLock } from './lock'
import { createLogger } from './logger'

const logger = createLogger()

export class RequestIdQueue {
    private _queue: Record<string, string[]> = {}

    private _lock = new ObjectLock()

    public async add(key: string, requestId: string) {
        await this._lock.lock()
        if (!this._queue[key]) {
            this._queue[key] = []
        }

        this._queue[key].push(requestId)
        await this._lock.unlock()
    }

    public async remove(key: string, requestId: string) {
        await this._lock.lock()
        if (!this._queue[key]) {
            return
        }

        const index = this._queue[key].indexOf(requestId)

        if (index !== -1) {
            this._queue[key].splice(index, 1)
        }
        await this._lock.unlock()
    }

    public async wait(key: string, requestId: string, maxConcurrent: number) {
        await this._lock.lock()

        if (!this._queue[key]) {
            await this.add(key, requestId)
        }

        await this._lock.unlock()

        while (true) {
            const index = this._queue[key].indexOf(requestId)

            if (index === -1) {
                return
            }

            if (index < maxConcurrent) {
                return
            }

            await sleep(100)
        }
    }


    public async getQueueLength(key: string) {
        await this._lock.lock()
        const length =  this._queue[key]?.length ?? 0
        await this._lock.unlock()
        return length
    }
}