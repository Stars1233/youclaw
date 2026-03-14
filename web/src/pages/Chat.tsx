import { useState } from 'react'
import { Sparkles, Plus, MoreHorizontal, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { useChatContext } from '@/hooks/chatCtx'
import { groupChatsByDate } from '@/lib/chat-utils'
import { ChatWelcome } from '@/components/chat/ChatWelcome'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatInput } from '@/components/chat/ChatInput'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function Chat() {
  const { t } = useI18n()
  const chatCtx = useChatContext()
  const { chatId, messages } = chatCtx
  const isNewChat = !chatId && messages.length === 0
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filteredChats = chatCtx.searchQuery
    ? chatCtx.chatList.filter((c) =>
        c.name.toLowerCase().includes(chatCtx.searchQuery.toLowerCase()),
      )
    : chatCtx.chatList

  const chatGroups = groupChatsByDate(filteredChats, {
    today: t.chat.today,
    yesterday: t.chat.yesterday,
    older: t.chat.older,
  })

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await chatCtx.deleteChat(deleteTarget)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex h-full">
      {/* 左侧：对话列表 */}
      <div className="w-[260px] border-r border-border flex flex-col shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">{t.nav.chat}</h2>
          <button
            data-testid="chat-new"
            onClick={() => chatCtx.newChat()}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title={t.sidebar.newChat}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 搜索 */}
        <div className="px-3 py-2">
          <input
            type="text"
            data-testid="chat-search"
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={t.sidebar.search}
            value={chatCtx.searchQuery}
            onChange={(e) => chatCtx.setSearchQuery(e.target.value)}
          />
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1" role="listbox">
          {chatGroups.length === 0 && (
            <p className="text-xs text-muted-foreground px-2.5 py-4 text-center">
              {t.chat.noConversations}
            </p>
          )}
          {chatGroups.map((group) => (
            <div key={group.label}>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2.5 pt-3 pb-1">
                {group.label}
              </div>
              {group.items.map((chat) => (
                <div
                  key={chat.chat_id}
                  role="option"
                  data-testid="chat-item"
                  aria-selected={chatCtx.chatId === chat.chat_id}
                  className={cn(
                    'group flex items-center rounded-lg px-2.5 py-2 cursor-pointer transition-colors',
                    chatCtx.chatId === chat.chat_id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50',
                  )}
                  onClick={() => chatCtx.loadChat(chat.chat_id)}
                >
                  <span className="text-xs truncate flex-1">
                    {chat.name}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        data-testid="chat-item-menu"
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:bg-accent transition-all shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        data-testid="chat-item-delete"
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(chat.chat_id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        {t.common.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：聊天内容 */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {isNewChat ? (
          <ChatWelcome />
        ) : (
          <ChatMessages />
        )}

        {/* ChatInput 始终渲染，通过位置动画从居中移到底部 */}
        <div
          className={
            isNewChat
              ? 'absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 transition-all duration-500 ease-out'
              : 'relative px-0 transition-all duration-500 ease-out'
          }
        >
          <div className="max-w-3xl mx-auto">
            {/* 欢迎提示文字，发送后淡出 */}
            <div className={
              isNewChat
                ? 'text-center space-y-3 mb-6 opacity-100 transition-opacity duration-300'
                : 'text-center space-y-3 mb-0 opacity-0 h-0 overflow-hidden transition-all duration-300'
            }>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-2">
                <Sparkles className="h-7 w-7 text-primary opacity-80" />
              </div>
              <h1 className="text-2xl font-semibold">{t.chat.welcome}</h1>
              <p className="text-sm text-muted-foreground">{t.chat.startHint}</p>
            </div>
            <ChatInput />
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.chat.deleteChat}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.chat.confirmDelete}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
