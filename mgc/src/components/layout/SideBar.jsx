import React, { useState } from 'react';
import { X, MessageCircle, Users } from 'lucide-react';
import ChatTab from './tabs/ChatTab';
import ParticipantsTab from './tabs/ParticipantsTab';

/**
 * 사이드바 컴포넌트
 * - 채팅과 참가자 탭 전환
 * - 모바일 반응형 지원
 * - 상태 변경 기능 지원
 * - 강제 제어 기능 지원
 */
const Sidebar = ({
  isOpen = false,
  onClose = () => {},
  username = '',
  roomCode = '',
  participants = [],
  messages = [],
  currentUserSocketId = '',
  onSendMessage = () => {},
  onStatusChange = () => {},
  onForceControl = () => {}, // 강제 제어 콜백 추가
  // 사용자 상태 관련 props 추가
  userStatus = 'online',
  userEmoji = '',
  customText = ''
}) => {
  const [activeTab, setActiveTab] = useState('chat');

  // 상태 변경을 상위로 전달
  const handleStatusChange = (statusData) => {
    onStatusChange(statusData);
  };

  // 강제 제어를 상위로 전달
  const handleForceControl = (targetSocketId, action, value) => {
    onForceControl(targetSocketId, action, value);
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 사이드바 메인 */}
      <div className={`
        fixed md:static inset-y-0 right-0 z-50 md:z-0
        w-full md:w-96 
        bg-slate-800/95 backdrop-blur-xl 
        border-l border-slate-700/50 
        flex flex-col
        transform transition-transform duration-300 ease-in-out md:transform-none
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${!isOpen ? 'md:flex' : 'flex'}
      `}>
        {/* 사이드바 헤더 */}
        <div className="p-3">
          {/* 모바일 닫기 버튼 */}
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={onClose}
              className="md:hidden p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* 탭 전환 버튼 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center p-1.5 rounded-xl transition-all ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 flex items-center justify-center space-x-1.5 p-1.5 rounded-xl transition-all ${
                activeTab === 'participants'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
              }`}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{participants.length}</span>
            </button>
          </div>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'chat' ? (
            <ChatTab
              messages={messages}
              username={username}
              currentUserSocketId={currentUserSocketId}
              participants={participants}
              onSendMessage={onSendMessage}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <ParticipantsTab
                participants={participants}
                username={username}
                roomCode={roomCode}
                currentUserSocketId={currentUserSocketId}
                onStatusChange={handleStatusChange}
                onForceControl={handleForceControl}
                userStatus={userStatus}
                userEmoji={userEmoji}
                customText={customText}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;