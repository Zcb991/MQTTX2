import { Service } from 'typedi'
import { InjectRepository } from 'typeorm-typedi-extensions'
import MessageEntity from '../models/MessageEntity'
import { Repository } from 'typeorm'
import { log } from 'console'

@Service()
export default class MessageService {
  constructor(
    @InjectRepository(MessageEntity)
    private messageRepository: Repository<MessageEntity>,
    // @InjectRepository({})
    // private messageCntRepository: Repository<T>,
  ) {}

  public static modelToEntity(model: MessageModel, connectionId: string | undefined): MessageEntity {
    return {
      ...model,
      connectionId,
      payloadFormatIndicator: model.properties?.payloadFormatIndicator,
      messageExpiryInterval: model.properties?.messageExpiryInterval,
      topicAlias: model.properties?.topicAlias,
      responseTopic: model.properties?.responseTopic,
      correlationData: model.properties?.correlationData,
      subscriptionIdentifier: model.properties?.subscriptionIdentifier,
      contentType: model.properties?.contentType,
      userProperties: JSON.stringify(model.properties?.userProperties),
    } as MessageEntity
  }

  public static entityToModel(entity: MessageEntity): MessageModel {
    return {
      ...entity,
      properties: {
        ...entity,
        userProperties: entity.userProperties ? JSON.parse(entity.userProperties) : undefined,
      },
    } as MessageModel
  }

  public static handleTopics(topics: string[]): string {
    // topics: ['topic1', 'topic2', 'topic3']
    return topics.join(',')
  }

  public async get(
    connectionId: string,
    options: {
      page?: number
      limit?: number
      msgType?: MessageType
      topics?: string[]
      searchParams?: { searchTopic?: string; payload?: string }
    } = {},
  ): Promise<MessagePaginationModel> {
    const defaultOpts = { page: 1, limit: 20, msgType: 'all' }
    const { page, limit, msgType } = { ...defaultOpts, ...options }
    let { topics } = { ...defaultOpts, ...options }

    // 处理请求到的参数
    console.log('处理请求到的参数2')
    console.log('connectionId:', connectionId)  // 10804cfc-0aab-420f-ade8-88889a9fade5
    console.log('options:', options)
    console.log('other:', page, limit, msgType, topics)  // 1, 20, all, ""

    // 总数、已发送数、已接收数
    const total = await this.messageRepository.count({ connectionId })
    const publishedTotal = await this.messageRepository.count({ connectionId, out: true })
    const receivedTotal = await this.messageRepository.count({ connectionId, out: false })

    // TODO: 根据topic分组，统计每个分组内的数量
    let cntQuery = this.messageRepository
      .createQueryBuilder('cnt')
      .select("cnt.topic as topic")
      .addSelect("count(*) as topicCnt")
      .where('cnt.connectionId = :connection', { connection: connectionId })
      .groupBy("cnt.topic")

    let query = this.messageRepository
      .createQueryBuilder('msg')
      .where('msg.connectionId = :connection', { connection: connectionId })

    // msgType: all publish received
    msgType !== 'all' && query.andWhere('msg.out = :out', { out: msgType === 'publish' })
    msgType !== 'all' && cntQuery.andWhere('cnt.out = :out', { out: msgType === 'publish' })

    // 某个topic被点击的时候
    console.log('get message')
    if (topics !== undefined && topics.length !== 0) {
      // 这里源码是按照主题名，进行精确搜索
      // 这里可以用in操作符进行改写，即topic in ('topic1', 'topic2')
      console.log('ttt2')
      // const joinTopics = "'" + topics.join("', '") + "'"
      // const sql = "msg.topic IN (" + joinTopics + ")"
      // query.andWhere(sql)
      query.andWhere("msg.topic IN (:...topics)", { topics })
      cntQuery.andWhere("cnt.topic IN (:...topics)", { topics })
    }

    // query
    // .orderBy('msg.createAt', 'DESC')
    // .getMany()

    // if (topic && topic !== '#') {
    //   topic = topic.replace(/[\\%_]/g, '\\$&')
    //   if (topic.startsWith('$share/')) topic = topic.split('/').slice(2).join('/')
    //   if (topic.includes('#')) topic = topic.replace('/#', '%')
    //   if (topic.includes('+')) topic = topic.replace('+', '%')
    //   query.andWhere('msg.topic LIKE :topic', { topic })
    // }

    if (options.searchParams) {
      const { searchTopic, payload } = options.searchParams
      if (searchTopic) {
        // 按Ctrl + F，搜索topic的时候，这里采用模糊查询
        console.log('searchTopic:', searchTopic)
        query.andWhere('msg.topic LIKE :searchTopic', { searchTopic: `%${searchTopic}%` })
        cntQuery.andWhere('cnt.topic LIKE :searchTopic', { searchTopic: `%${searchTopic}%` })
      }
      if (payload) {
        console.log('payload:', payload)
        query.andWhere('msg.payload LIKE :payload', { payload: `%${payload}%` })
        cntQuery.andWhere('cnt.payload LIKE :payload', { payload: `%${payload}%` })
      }
    }

    // getRawMany() 直接返回数据库原始结果，不会尝试将结果映射为实体类的实例
    let cntQueryRes = await cntQuery
      .getRawMany()
      // .getMany()

    // 转换cntQueryRes，即：[{"topic": "topic1","topicCnt": 1},"topic": "topic2","topicCnt": 1}] => {"topic1": 1, "topic2": 1, "topic22": 2, "topic3": 7}
    cntQueryRes = cntQueryRes.reduce((accumulator, obj) => {
      accumulator[obj.topic] = obj.topicCnt;
      return accumulator;
    }, {})

    console.log('cntQueryRes', cntQueryRes)

    const res = await query
      .orderBy('msg.createAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    const list = res.reverse().map((m) => MessageService.entityToModel(m))

    console.log('list:', list)

    return {
      list,
      total,
      publishedTotal,
      receivedTotal,
      limit,
      page,
      topicCnt: cntQueryRes
    }
  }

  public async loadMore(
    connectionId: string,
    createAt: string,
    mode: 'before' | 'after' = 'before',
    options: {
      limit?: number
      msgType?: MessageType
      topics?: string[]
      searchParams?: { searchTopic?: string; payload?: string }
    } = {},
  ) {
    const defaultOpts = { limit: 20, msgType: 'all' }
    const { limit, msgType } = { ...defaultOpts, ...options }
    let { topics } = { ...defaultOpts, ...options }

    let query = await this.messageRepository
      .createQueryBuilder('msg')
      .where('msg.connectionId = :connection', { connection: connectionId })

    msgType !== 'all' && query.andWhere('msg.out = :out', { out: msgType === 'publish' })

    console.log('load more message')

    // 源码
    // if (topic && topic !== '#') {
    //   topic = topic.replace(/[\\%_]/g, '\\$&')
    //   if (topic.startsWith('$share/')) topic = topic.split('/').slice(2).join('/')
    //   if (topic.includes('#')) topic = topic.replace('/#', '%')
    //   if (topic.includes('+')) topic = topic.replace('+', '%')
    //   query.andWhere('msg.topic LIKE :topic', { topic })
    // }

    if (topics !== undefined && topics.length !== 0) {
      // 这里源码是按照主题名，进行精确搜索
      // 这里可以用in操作符进行改写，即topic in ('topic1', 'topic2')
      // TODO:
      console.log('ttt2')
      // const joinTopics = "'" + topics.join("', '") + "'"
      // const sql = "msg.topic IN (" + joinTopics + ")"
      // query.andWhere(sql)
      query.andWhere("msg.topic IN (:...topics)", { topics })
    }

    if (options.searchParams) {
      const { searchTopic, payload } = options.searchParams
      if (searchTopic) {
        query.andWhere('msg.topic LIKE :topic', { searchTopic: `%${searchTopic}%` })
      }
      if (payload) {
        query.andWhere('msg.payload LIKE :payload', { payload: `%${payload}%` })
      }
    }

    const res = await query
      .andWhere('msg.createAt ' + (mode === 'before' ? '<' : '>') + ' :createAt', { createAt })
      .orderBy('msg.createAt', mode === 'before' ? 'DESC' : 'ASC')
      .take(limit + 1)
      .getMany()

    mode === 'before' && res.reverse()

    const moreMsg = res.length > limit && mode
    moreMsg && res.pop()

    const list = res.map((m) => MessageService.entityToModel(m))

    return { list, moreMsg }
  }

  public async pushToConnection(
    message: MessageModel | MessageModel[],
    connectionId: string,
  ): Promise<MessageModel | MessageModel[] | undefined> {
    if (!Array.isArray(message)) {
      return await this.messageRepository.save(MessageService.modelToEntity({ ...message }, connectionId))
    } else {
      const res = message.map((m) => MessageService.modelToEntity(m, connectionId))
      return await this.messageRepository.save(res)
    }
  }

  public async delete(id: string): Promise<MessageModel | undefined> {
    const query = await this.messageRepository.findOne(id)
    if (!query || !query.id) {
      return
    }
    await this.messageRepository.delete(query.id)
    return query
  }

  public async cleanInConnection(connectionId: string) {
    await this.messageRepository
      .createQueryBuilder()
      .delete()
      .where('connectionId = :connectionId', { connectionId })
      .execute()
  }

  public async cleanAll(): Promise<void> {
    await this.messageRepository.clear()
  }
}
