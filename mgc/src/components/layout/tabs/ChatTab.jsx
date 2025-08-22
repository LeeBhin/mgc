import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

const ChatTab = ({
  messages = [],
  username = '',
  currentUserSocketId = '',
  participants = [],
  onSendMessage = () => { }
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // 메시지가 추가될 때마다 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // 메시지 전송 처리
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  // Enter 키 처리
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 현재 사용자인지 확인
  const isCurrentUser = (messageSocketId) => {
    return messageSocketId === currentUserSocketId;
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-chat p-3 sm:p-4 space-y-3 max-h-[calc(100vh-130px)]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400">
              <p className="text-sm">아직 메시지가 없습니다.</p>
              <p className="text-xs mt-1">첫 메시지를 보내보세요! 👋</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="group">
              {message.user === 'System' ? (
                <div className="text-center">
                  <div className="inline-block bg-slate-700/50 text-slate-400 px-3 py-1.5 rounded-full text-xs border border-slate-600/50">
                    {message.message}
                  </div>
                </div>
              ) : (
                <div className={`flex ${isCurrentUser(message.socketId) ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-xs sm:max-w-sm">
                    {!isCurrentUser(message.socketId) && (
                      <p className="text-xs text-slate-400 mb-1 px-1">{message.user}</p>
                    )}
                    <div className={`flex items-end space-x-2 ${isCurrentUser(message.socketId) ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                      <div className={`relative px-3 py-2 rounded-lg shadow-sm ${isCurrentUser(message.socketId)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-100 border border-slate-600/50'
                        }`}>
                        <p className="text-sm leading-relaxed break-words">{message.message}</p>
                      </div>
                      <p className="text-xs text-slate-500 whitespace-nowrap pb-1">
                        {message.time}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력 */}
      <div className="p-3">
        <div className="flex space-x-2 items-center">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-3 py-2 bg-slate-900/70 border border-slate-700/50 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900 focus:outline-none transition-all text-slate-100 placeholder-slate-500 text-sm resize-none overflow-hidden"
            rows="1"
            style={{
              height: '36px',
              lineHeight: '20px'
            }}
            onInput={(e) => {
              e.target.style.height = '36px';
              const scrollHeight = e.target.scrollHeight;
              if (scrollHeight > 36) {
                e.target.style.height = Math.min(scrollHeight, 96) + 'px';
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="w-[33px] h-[33px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg transition-all shadow-md hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-600 flex items-center justify-center transform hover:scale-105 active:scale-95"
            title="메시지 전송"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatTab;