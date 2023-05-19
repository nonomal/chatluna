import { EmbeddingsParams } from 'langchain/embeddings/base';
import { CreateVectorStoreRetrieverParams, EmbeddingsProvider, ModelProvider, VectorStoreRetrieverProvider } from '../model/base';
import { VectorStore } from 'langchain/vectorstores/base';
import { inMemoryVectorStoreRetrieverProvider } from '../model/in_memory';
import { ObjectTool } from '../chain/base';
import { StructuredTool, Tool } from 'langchain/tools';
import { FakeEmbeddings } from 'langchain/embeddings/fake';

/**
 * A factory class for managing chat objects, such as models, embeddings, and vector stores.
 */
export class Factory {
    private static _modelProviders: Record<string, ModelProvider> = {}
    private static _embeddingProviders: Record<string, EmbeddingsProvider> = {}
    private static _vectorStoreRetrieverProviders: Record<string, VectorStoreRetrieverProvider> = {}
    private static _tools: Record<string, StructuredTool | Tool> = {}
    private static _recommendProviders: Record<string, string[]> = {}

    /**
     * Register a model provider.
     * @param provider The model provider to register.
     * @returns The registered model provider.
    */
    static registerModelProvider(provider: ModelProvider) {
        Factory._modelProviders[provider.name] = provider
        return async () => {
            await provider.dispose()
            delete Factory._modelProviders[provider.name]
        }
    }

    /**
     * Register an embeddings provider.
     * @param provider The embeddings provider to register.
     * @returns The registered embeddings provider.
     **/
    static registerEmbeddingsProvider(provider: EmbeddingsProvider) {
        Factory._embeddingProviders[provider.name] = provider
        return async () => {
            await provider.dispose()
            delete Factory._embeddingProviders[provider.name]
        }
    }

    /** 
     * Register a vector store retriever provider.
     * @param provider The vector store retriever provider to register.
     * @returns The registered vector store retriever provider.
     * */
    static registerVectorStoreRetrieverProvider(provider: VectorStoreRetrieverProvider) {
        Factory._vectorStoreRetrieverProviders[provider.name] = provider
        return async () => {
            await provider.dispose()
            delete Factory._vectorStoreRetrieverProviders[provider.name]
        }
    }

    /**
     * Register a tool
     * @param tool The tool to register.
     * @returns The registered tool.
     */
    static registerTool(name: string, tool: StructuredTool | Tool) {
        Factory._tools[name] = tool
        return async () => {
            delete Factory._tools[name]
        }
    }

    static set recommendEmbeddings(list: string[]) {
        Factory._recommendProviders['embeddings'] = list
    }

    static set recommendVectorStoreRetrievers(list: string[]) {
        Factory._recommendProviders['vectorStoreRetrievers'] = list
    }

    static get recommendEmbeddings() {
        return Factory._recommendProviders['embeddings'] ?? ['openai', 'huggingface']
    }

    static get recommendVectorStoreRetrievers() {
        return Factory._recommendProviders['vectorStoreRetrievers'] ?? ['milvus', 'chroma', 'pinecone']
    }

    /**
     * 
     * @param modelName modelName, must use the format providerName/modelName
     * @param params 
     * @returns 
     */
    static async createModel(mixedModelName: string, params: Record<string, any>) {
        const [providerName, modelName] = mixedModelName.split('/')
        for (const provider of Object.values(Factory._modelProviders)) {
            if (provider.name === providerName && (await provider.isSupported(modelName))) {
                return provider.createModel(modelName, params)
            }
        }
        throw new Error(`No provider found for model ${modelName}`)
    }

    static async createEmbeddings(mixedModelName: string, params: EmbeddingsParams) {
        const [providerName, modelName] = mixedModelName.split('/')
        for (const provider of Object.values(Factory._embeddingProviders)) {
            if (provider.name === providerName && provider.isSupported(modelName)) {
                return provider.createEmbeddings(modelName, params)
            }
        }
        throw new Error(`No provider found for embeddings ${modelName}`)
    }

    static async getDefaultEmbeddings(params: Record<string, any> = {}) {
        const providers = Object.values(Factory._embeddingProviders)

        // local -> remote
        const recommendProviders = [...this.recommendEmbeddings]
        while (recommendProviders.length > 0) {
            const currentProvider = recommendProviders.shift()

            try {
                const availableProvider = providers[currentProvider]

                if (!availableProvider) {
                    continue
                }

                return await availableProvider.createEmbeddings(params.modelName, params)
            } catch (error) {
                console.log(`Failed to create embeddings ${currentProvider}, try next one`)
            }
        }

        // try return the first one

        if (providers.length > 1 || !providers[0]) {
            console.error(`Cannot select a embeddings, rolling back to the fake embeddings`)
            return new FakeEmbeddings()
        }

        return providers[0].createEmbeddings(params.modelName, params)

    }

    static async getDefaltVectorStoreRetriever(params: CreateVectorStoreRetrieverParams = {}) {

        if (!params.embeddings) {
            params.embeddings = await Factory.getDefaultEmbeddings(params)
        }

        const providers = Object.values(Factory._vectorStoreRetrieverProviders)

        // local -> remote
        const recommendProviders = [...this.recommendVectorStoreRetrievers]
        while (recommendProviders.length > 0) {
            const currentProvider = recommendProviders.shift()
            try {
                const availableProvider = providers[currentProvider]

                if (!availableProvider) {
                    continue
                }

                return await availableProvider.createVectorStoreRetriever(params)
            } catch (error) {
                console.log(`Failed to create vector store retriever ${currentProvider}, try next one`)
            }
        }

        // try return the first one

        if (providers.length > 1 || !providers[0]) {
            console.log(`Cannot select a vector store retriever, rolling back to the memory vector store retriever`)

            return inMemoryVectorStoreRetrieverProvider.createVectorStoreRetriever(params)
        }

        const firstProvider = providers[0]

        return firstProvider.createVectorStoreRetriever(params)
    }



    static async createVectorStoreRetriever(mixedModelName: string, params: CreateVectorStoreRetrieverParams) {

        if (!params.embeddings) {
            params.embeddings = await Factory.getDefaultEmbeddings(params)
        }

        const [providerName, modelName] = mixedModelName.split('/')
        for (const provider of Object.values(Factory._vectorStoreRetrieverProviders)) {
            if (provider.name === providerName) {
                return provider.createVectorStoreRetriever(params)
            }
        }
        throw new Error(`No provider found for vector store retriever ${modelName}`)
    }

    static selectTools(filter: (name: string, tool?: StructuredTool | Tool) => boolean) {
        const results: (StructuredTool | Tool)[] = []
        for (const [name, tool] of Object.entries(Factory._tools)) {
            if (filter(name, tool)) {
                results.push(tool)
            }
        }
        return results
    }

    static async selectModelProviders(filter: (name: string, provider?: ModelProvider) => Promise<boolean>) {
        const results: ModelProvider[] = []
        for (const [name, provider] of Object.entries(Factory._modelProviders)) {
            if (await filter(name, provider)) {
                results.push(provider)
            }
        }
        return results
    }
}