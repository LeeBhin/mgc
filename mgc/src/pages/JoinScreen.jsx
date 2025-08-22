import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2 } from 'lucide-react';

const JoinScreen = () => {
  const [roomCode, setRoomCode] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const navigate = useNavigate();

  // 컴포넌트 마운트 시 저장된 닉네임 확인
  useEffect(() => {
    const username = sessionStorage.getItem('mogakko_username');
    if (username) {
      setSavedUsername(username);
    }
  }, []);

  // 방 생성 페이지로 이동
  const handleCreateRoom = () => {
    // 방 생성 대기실로 이동 (mode=create)
    navigate(`/room/create?mode=create`);
  };

  // 방 입장 처리
  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      // 방 입장 대기실로 이동 (mode=join)
      navigate(`/room/${roomCode.toUpperCase()}?mode=join`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 w-full max-w-md">
        {/* 로고 및 제목 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl mb-3 shadow-lg">
            <Code2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 mb-1 tracking-tight">모각코</h1>
          <p className="text-slate-400 text-sm">함께하는 코딩 시간</p>
        </div>
        
        <div className="space-y-4">
          {/* 방 코드 입력 */}
          <div>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="방 코드를 입력해주세요"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900/70 transition-all text-slate-100 placeholder-slate-500 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
          </div>
          
          {/* 방 참여 버튼 */}
          <button
            onClick={handleJoinRoom}
            disabled={!roomCode.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all font-semibold text-sm shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            방 참여하기
          </button>

          {/* 구분선 */}
          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-800 px-3 text-xs text-slate-500">새로운 방을 만들고 싶다면?</span>
            </div>
          </div>

          {/* 새 방 만들기 버튼 */}
          <button
            onClick={handleCreateRoom}
            className="w-full bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 py-2.5 px-6 rounded-xl transition-all font-medium text-sm border border-slate-600/50 hover:border-slate-600"
          >
            새 방 만들기
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinScreen;