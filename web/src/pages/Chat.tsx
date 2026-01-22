import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { getSessionId, getUserName, setUserName } from '../lib/session';
import { API_BASE } from '../config/runtime';
import { President } from '../types/president';

interface Source {
  source: string;
  title: string;
  source_url?: string;
  score: number;
  doc_id: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  sources_json?: string;
}

interface Chat {
  id: string;
  user_name?: string;
}

// API_BASE imported from runtime config

function Chat() {
  const { presidentId } = useParams<{ presidentId: string }>();
  const navigate = useNavigate();
  const [president, setPresident] = useState<President | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userName, setUserNameState] = useState(getUserName());
  const [editingUserName, setEditingUserName] = useState(false);
  const [displayedStarters, setDisplayedStarters] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!presidentId) return;
    
    let cancelled = false;
    
    async function load() {
      try {
        const record = await pb
          .collection('presidents')
          .getOne<President>(presidentId!);
        if (!cancelled) {
          setPresident(record);
          // Initialize conversation starters
          if (record.starter_prompts_json) {
            try {
              const starters: string[] = JSON.parse(record.starter_prompts_json);
              const shuffled = [...starters].sort(() => Math.random() - 0.5);
              setDisplayedStarters(shuffled.slice(0, 3));
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      } catch (error: any) {
        if (!cancelled && error?.status !== 0) {
          // Ignore autocancellation errors (status 0)
          console.error('Failed to load president:', error);
        }
      }
    }
    
    load();
    
    return () => {
      cancelled = true;
    };
  }, [presidentId]);
  
  useEffect(() => {
    if (!presidentId) return;
    
    let cancelled = false;
    
    async function load() {
      if (!presidentId) return;
      
      try {
        const sessionId = getSessionId();
        const existingChats = await pb.collection('chats').getList(1, 1, {
          filter: `session_id = "${sessionId}" && president = "${presidentId}"`,
        });

          if (existingChats.items.length > 0) {
            const chat = existingChats.items[0];
            if (!cancelled) {
              // Chat loaded, but we don't need to store it in state
            }

          const messages = await pb.collection('messages').getList(1, 100, {
            filter: `chat = "${chat.id}"`,
            sort: 'created_at',
          });
          
          if (!cancelled) {
            // Debug: log raw PocketBase response for assistant messages
            const assistantMessages = messages.items.filter(m => m.role === 'assistant');
            if (assistantMessages.length > 0) {
              console.log('📦 Raw PocketBase messages (first assistant):', {
                id: assistantMessages[0].id,
                role: assistantMessages[0].role,
                hasSourcesJson: 'sources_json' in assistantMessages[0],
                sourcesJsonValue: assistantMessages[0].sources_json,
                sourcesJsonType: typeof assistantMessages[0].sources_json,
                allKeys: Object.keys(assistantMessages[0])
              });
            }
            
            const mappedMessages = messages.items.map(m => {
              const msg = {
                id: m.id,
                role: m.role,
                content: m.content,
                created_at: m.created_at || m.created || new Date().toISOString(),
                sources_json: m.sources_json || m.sources || undefined
              };
              // Debug: log if assistant message has sources
              if (msg.role === 'assistant') {
                if (msg.sources_json) {
                  console.log('✅ Message', msg.id, 'has sources_json:', msg.sources_json.substring(0, 100));
                } else {
                  console.log('❌ Message', msg.id, 'has NO sources_json. Raw PB object keys:', Object.keys(m));
                }
              }
              return msg;
            });
            setMessages(mappedMessages);
          }
        }
      } catch (error: any) {
        if (!cancelled && error?.status !== 0) {
          // Ignore autocancellation errors (status 0)
          console.error('Failed to load chat:', error);
        }
      }
    }
    
    load();
    
    return () => {
      cancelled = true;
    };
  }, [presidentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // loadPresident and loadChatAndMessages moved to useEffect hooks above

  async function sendMessage(messageOverride?: string) {
    const messageText = (messageOverride || inputMessage).trim();
    if (!messageText || !presidentId || sending) return;

    setInputMessage('');
    setSending(true);

    // Optimistic UI update
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const sessionId = getSessionId();
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presidentId,
          sessionId,
          userName: userName || undefined,
          message: messageText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        console.error('Error details:', JSON.stringify(errorData.details, null, 2));
        throw new Error(errorData.error || `Failed to send message: ${response.status}`);
      }

          const data = await response.json();

      // Remove temp message and add real ones
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !m.id.startsWith('temp-'));
        return [
          ...withoutTemp,
          {
            id: `temp-user-${Date.now()}`,
            role: 'user',
            content: messageText,
            created_at: new Date().toISOString(),
          },
          {
            id: `temp-assistant-${Date.now()}`,
            role: 'assistant',
            content: data.message,
            created_at: new Date().toISOString(),
            sources_json: data.sources ? JSON.stringify(data.sources) : undefined,
          },
        ];
      });

      // Reload messages to get real IDs from PocketBase
      setTimeout(async () => {
        if (!presidentId) return;
        try {
          const sessionId = getSessionId();
          const existingChats = await pb.collection('chats').getList(1, 1, {
            filter: `session_id = "${sessionId}" && president = "${presidentId}"`,
          });
          if (existingChats.items.length > 0) {
            const chat = existingChats.items[0];
            const messages = await pb.collection('messages').getList(1, 100, {
              filter: `chat = "${chat.id}"`,
              sort: 'created_at',
            });
            
            // Debug: log raw PocketBase response
            const assistantMessages = messages.items.filter(m => m.role === 'assistant');
            if (assistantMessages.length > 0) {
              console.log('📦 Reloaded PocketBase messages (first assistant):', {
                id: assistantMessages[0].id,
                hasSourcesJson: 'sources_json' in assistantMessages[0],
                sourcesJsonValue: assistantMessages[0].sources_json,
                allKeys: Object.keys(assistantMessages[0])
              });
            }
            
            const mappedMessages = messages.items.map(m => {
              const msg = {
                id: m.id,
                role: m.role,
                content: m.content,
                created_at: m.created_at || m.created || new Date().toISOString(),
                sources_json: m.sources_json || m.sources || undefined
              };
              // Debug: log if assistant message has sources
              if (msg.role === 'assistant') {
                if (msg.sources_json) {
                  console.log('✅ Reloaded message', msg.id, 'has sources_json:', msg.sources_json.substring(0, 100));
                } else {
                  console.log('❌ Reloaded message', msg.id, 'has NO sources_json. Raw PB keys:', Object.keys(m));
                }
              }
              return msg;
            });
            setMessages(mappedMessages);
          }
        } catch (e) {
          // Ignore errors on reload
        }
      }, 500);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      alert(`Failed to send message: ${error.message || 'Please try again.'}`);
    } finally {
      setSending(false);
    }
  }

  async function resetChat() {
    if (!presidentId || !confirm('Are you sure you want to reset this chat? This will permanently delete the conversation.'))
      return;

    try {
      const sessionId = getSessionId();
      const response = await fetch(`${API_BASE}/reset-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presidentId,
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to reset chat: ${response.status}`);
      }

      // Clear messages immediately - chat is deleted on server, so it won't reload
      setMessages([]);
      
    } catch (error: any) {
      console.error('Failed to reset chat:', error);
      alert(`Failed to reset chat: ${error.message || 'Please try again.'}`);
    }
  }

  function handleUserNameSave() {
    setUserName(userName);
    setEditingUserName(false);
  }

  function getPortraitUrl(): string {
    if (president?.portrait) {
      return pb.files.getUrl(president, president.portrait);
    }
    return '/placeholder-president.jpg';
  }

  if (!president) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <Link
              to={`/presidents/${president.slug}`}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src={getPortraitUrl()}
                alt={president.name}
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect fill="%23ddd" width="48" height="48"/%3E%3C/svg%3E';
                }}
              />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900">{president.name}</h1>
                {president.rag_stats && (() => {
                  try {
                    const stats = JSON.parse(president.rag_stats);
                    if (stats.chunks > 0) {
                      return (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          Library
                        </span>
                      );
                    }
                  } catch (e) {}
                  return null;
                })()}
              </div>
              {editingUserName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserNameState(e.target.value)}
                    placeholder="Your name"
                    className="text-sm px-2 py-1 border border-gray-300 rounded"
                    autoFocus
                    onBlur={handleUserNameSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUserNameSave();
                      }
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setEditingUserName(true)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Chatting as: {userName || 'Anonymous'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={resetChat}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded hover:bg-red-50"
              >
                Reset Chat
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-4 py-6">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center mt-8">
              <div className="max-w-2xl mx-auto">
                <p className="text-lg text-gray-900 mb-2 italic">
                  {president.greeting || `Greetings. I am ${president.name}, and I stand ready to discuss matters of governance and leadership. What brings you here?`}
                </p>
                <p className="text-sm text-gray-500 mt-4 mb-6">
                  Ask about decisions, beliefs, conflicts, and the events of their time.
                </p>
                {displayedStarters.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-600 mb-3">Not sure where to start?</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {displayedStarters.map((starter, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            sendMessage(starter);
                          }}
                          className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          {starter}
                        </button>
                      ))}
                      {president.starter_prompts_json && (() => {
                        try {
                          const allStarters: string[] = JSON.parse(president.starter_prompts_json);
                          if (allStarters.length > 3) {
                            return (
                              <button
                                onClick={() => {
                                  const shuffled = [...allStarters].sort(() => Math.random() - 0.5);
                                  setDisplayedStarters(shuffled.slice(0, 3));
                                }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                              >
                                More starters →
                              </button>
                            );
                          }
                        } catch (e) {}
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {messages.map((message) => {
            return (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t max-w-4xl mx-auto w-full px-4 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Say something, or ask a question…"
            disabled={sending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            onClick={() => sendMessage()}
            disabled={sending || !inputMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
