import { afterEach, describe, expect, test } from 'bun:test'
import { useChatStore } from '../web/src/stores/chat.ts'

afterEach(() => {
  useChatStore.setState({ chats: {}, activeChatId: null })
})

describe('chat store document status', () => {
  test('tracks parsing and replaces pending entry with final document status', () => {
    const store = useChatStore.getState()
    store.initChat('chat-1')

    useChatStore.getState().setDocumentStatus('chat-1', 'pending', 'report.pdf', 'parsing')
    let chat = useChatStore.getState().chats['chat-1']
    expect(chat?.documentStatuses['report.pdf:pending']?.status).toBe('parsing')
    expect(chat?.timelineItems).toHaveLength(1)
    expect(chat?.timelineItems[0]).toMatchObject({
      kind: 'document_status',
      documentKey: 'report.pdf:pending',
      filename: 'report.pdf',
      status: 'parsing',
    })

    useChatStore.getState().setDocumentStatus('chat-1', 'doc_123', 'report.pdf', 'parsed')
    chat = useChatStore.getState().chats['chat-1']
    expect(chat?.documentStatuses['report.pdf:pending']).toBeUndefined()
    expect(chat?.documentStatuses['doc_123']).toEqual({
      filename: 'report.pdf',
      status: 'parsed',
      error: undefined,
    })
    expect(chat?.timelineItems).toHaveLength(1)
    expect(chat?.timelineItems[0]).toMatchObject({
      kind: 'document_status',
      documentKey: 'doc_123',
      filename: 'report.pdf',
      status: 'parsed',
    })
  })

  test('preserves live tool and assistant output order in timeline', () => {
    const store = useChatStore.getState()
    store.initChat('chat-1')

    store.addUserMessage('chat-1', {
      id: 'user-1',
      role: 'user',
      content: 'Summarize this file',
      timestamp: '2026-03-19T10:00:00.000Z',
    })
    store.addToolUse('chat-1', {
      id: 'tool-1',
      name: 'Read',
      input: '{"file_path":"/tmp/a.txt"}',
      status: 'running',
    })
    store.appendStreamText('chat-1', 'First answer part.')
    store.addToolUse('chat-1', {
      id: 'tool-2',
      name: 'Grep',
      input: '{"pattern":"revenue"}',
      status: 'running',
    })
    store.appendStreamText('chat-1', 'Second answer part.')

    const chat = useChatStore.getState().chats['chat-1']
    expect(chat?.timelineItems.map((item) => item.kind)).toEqual([
      'message',
      'tool_use',
      'assistant_stream',
      'tool_use',
      'assistant_stream',
    ])

    expect(chat?.timelineItems[1]).toMatchObject({
      kind: 'tool_use',
      name: 'Read',
      status: 'done',
    })
    expect(chat?.timelineItems[2]).toMatchObject({
      kind: 'assistant_stream',
      content: 'First answer part.',
    })
    expect(chat?.timelineItems[3]).toMatchObject({
      kind: 'tool_use',
      name: 'Grep',
      status: 'done',
    })
    expect(chat?.timelineItems[4]).toMatchObject({
      kind: 'assistant_stream',
      content: 'Second answer part.',
    })
  })

  test('setMessages preserves the live timeline tail while a chat is still processing', () => {
    const store = useChatStore.getState()
    store.initChat('chat-1')
    store.addUserMessage('chat-1', {
      id: 'user-1',
      role: 'user',
      content: 'hello',
      timestamp: '2026-03-19T10:00:00.000Z',
    })
    store.setProcessing('chat-1', true)
    store.addToolUse('chat-1', {
      id: 'tool-1',
      name: 'Read',
      input: '{"file_path":"a.md"}',
      status: 'running',
    })
    store.appendStreamText('chat-1', 'partial answer')

    store.setMessages('chat-1', [
      {
        id: 'user-1',
        role: 'user',
        content: 'hello',
        timestamp: '2026-03-19T10:00:00.000Z',
      },
    ])

    const chat = useChatStore.getState().chats['chat-1']
    expect(chat?.timelineItems.map((item) => item.kind)).toEqual([
      'message',
      'tool_use',
      'assistant_stream',
    ])
    expect(chat?.timelineItems[1]).toMatchObject({
      kind: 'tool_use',
      name: 'Read',
      status: 'done',
    })
    expect(chat?.timelineItems[2]).toMatchObject({
      kind: 'assistant_stream',
      content: 'partial answer',
    })
  })

  test('setMessages keeps the current local user turn when server history is stale', () => {
    const store = useChatStore.getState()
    store.initChat('chat-1')
    store.addUserMessage('chat-1', {
      id: 'old-user',
      role: 'user',
      content: 'previous question',
      timestamp: '2026-03-19T09:58:00.000Z',
    })
    store.addUserMessage('chat-1', {
      id: 'old-assistant',
      role: 'assistant',
      content: 'previous answer',
      timestamp: '2026-03-19T09:59:00.000Z',
    })
    store.addUserMessage('chat-1', {
      id: 'current-user',
      role: 'user',
      content: 'current question',
      timestamp: '2026-03-19T10:00:00.000Z',
    })
    store.setProcessing('chat-1', true)
    store.appendStreamText('chat-1', 'partial answer')

    store.setMessages('chat-1', [
      {
        id: 'old-user',
        role: 'user',
        content: 'previous question',
        timestamp: '2026-03-19T09:58:00.000Z',
      },
      {
        id: 'old-assistant',
        role: 'assistant',
        content: 'previous answer',
        timestamp: '2026-03-19T09:59:00.000Z',
      },
    ])

    const chat = useChatStore.getState().chats['chat-1']
    expect(chat?.timelineItems.map((item) => item.kind)).toEqual([
      'message',
      'message',
      'message',
      'assistant_stream',
    ])
    expect(chat?.timelineItems[2]).toMatchObject({
      kind: 'message',
      role: 'user',
      content: 'current question',
    })
    expect(chat?.timelineItems[3]).toMatchObject({
      kind: 'assistant_stream',
      content: 'partial answer',
    })
  })

  test('completeMessage folds the live turn into a final assistant message', () => {
    const store = useChatStore.getState()
    store.initChat('chat-1')
    store.addUserMessage('chat-1', {
      id: 'user-1',
      role: 'user',
      content: 'hello',
      timestamp: '2026-03-19T10:00:00.000Z',
    })
    store.setDocumentStatus('chat-1', 'doc-1', 'report.pdf', 'parsed')
    store.addToolUse('chat-1', {
      id: 'tool-1',
      name: 'Read',
      input: '{"file_path":"report.pdf"}',
      status: 'running',
    })
    store.appendStreamText('chat-1', 'partial answer')

    store.completeMessage('chat-1', 'final answer', [
      { id: 'tool-1', name: 'Read', input: '{"file_path":"report.pdf"}', status: 'done' },
    ], 'session-1', 'turn-1')

    const chat = useChatStore.getState().chats['chat-1']
    expect(chat?.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: 'final answer',
      sessionId: 'session-1',
      turnId: 'turn-1',
      toolUse: [{ name: 'Read', status: 'done' }],
    })
    expect(chat?.timelineItems.map((item) => item.kind)).toEqual([
      'message',
      'document_status',
      'message',
    ])
    expect(chat?.timelineItems[2]).toMatchObject({
      kind: 'message',
      role: 'assistant',
      content: 'final answer',
      toolUse: [{ name: 'Read', status: 'done' }],
    })
  })
})
