import React from 'react';
import { Code2, MessageCircle, LogOut, Settings } from 'lucide-react';

const Header = ({ 
  roomCode = '', 
  roomName = '',
  roomDescription = '',
  currentUserSocketId = '',
  participants = [],
  onToggleSidebar = () => {}, 
  onLeaveRoom = () => {},
  onOpenSettings = () => {}
}) => {
  // 현재 사용자가 방장인지 확인
  const currentUser = participants.find(p => p.socketId === currentUserSocketId);
  const isOwner = currentUser?.isOwner || false;

  return (
    <header className="bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50 px-3 py-2">
      <div className="flex items-center justify-between">
        {/* 로고 및 방 정보 */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Code2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-100">
              {roomName || `방 #${roomCode}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {roomDescription ? roomDescription : ''}
            </p>
          </div>
        </div>

        {/* 우측 컨트롤 버튼들 */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* 방장 전용 설정 버튼 */}
          {isOwner && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-2 bg-slate-700/50 hover:bg-slate-700/70 px-2 sm:px-3 py-2 rounded-xl transition-colors border border-slate-600/50 hover:border-slate-600"
            >
              <Settings className="h-4 w-4 text-slate-300" />
              <span className="hidden sm:inline text-sm font-medium text-slate-300">설정</span>
            </button>
          )}

          {/* 모바일에서만 사이드바 토글 */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden flex items-center space-x-2 bg-slate-700/50 px-2 sm:px-3 py-2 rounded-xl hover:bg-slate-700 transition-colors border border-slate-600/50"
          >
            <MessageCircle className="h-4 w-4 text-slate-300" />
          </button>

          {/* 방 나가기 버튼 */}
          <button 
            onClick={onLeaveRoom}
            className="flex items-center space-x-1 sm:space-x-2 bg-red-900/50 hover:bg-red-900/70 px-2 sm:px-3 py-2 rounded-xl transition-colors text-red-400 hover:text-red-300 border border-red-800/50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline text-sm font-medium">나가기</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;