import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useChat, type Message, type ToolUseItem } from './useChat'
import { getChats, getAgents, deleteChat as deleteChatApi } from '../api/client'
import type { ChatItem } from '../lib/chat-utils'

type Agent = { id: string; name: string }

interface ChatContextType {
  // useChat 暴露的所有状态
  chatId: string | null
  messages: Message[]
  streamingText: string
  isProcessing: boolean
  pendingToolUse: ToolUseItem[]
  chatStatus: 'submitted' | 'streaming' | 'ready' | 'error'
  send: (prompt: string) => Promise<void>
  loadChat: (chatId: string) => Promise<void>
  newChat: () => void
  stop: () => void

  // 会话列表
  chatList: ChatItem[]
  refreshChats: () => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  deleteChat: (chatId: string) => Promise<void>

  // Agent 选择
  agentId: string
  setAgentId: (id: string) => void
  agents: Agent[]
}

const ChatContext = createContext<ChatContextType | null>(null)

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [agentId, setAgentId] = useState('default')
  const [agents, setAgents] = useState<Agent[]>([])
  const [chatList, setChatList] = useState<ChatItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const chat = useChat(agentId)

  // 加载 agents
  useEffect(() => {
    getAgents()
      .then(list => setAgents(list.map(a => ({ id: a.id, name: a.name }))))
      .catch(() => {})
  }, [])

  // 加载聊天列表
  const refreshChats = useCallback(() => {
    getChats().then(setChatList).catch(() => {})
  }, [])

  useEffect(() => { refreshChats() }, [chat.chatId, refreshChats])

  const deleteChat = useCallback(async (chatIdToDelete: string) => {
    await deleteChatApi(chatIdToDelete)
    if (chat.chatId === chatIdToDelete) chat.newChat()
    refreshChats()
  }, [chat, refreshChats])

  return (
    <ChatContext.Provider value={{
      ...chat,
      chatList,
      refreshChats,
      searchQuery,
      setSearchQuery,
      deleteChat,
      agentId,
      setAgentId,
      agents,
    }}>
      {children}
    </ChatContext.Provider>
  )
}
