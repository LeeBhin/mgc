import React, { useState, useEffect } from 'react';
import { X, Settings, Trash2, Lock, Unlock, Save } from 'lucide-react';

const RoomSettingsPopup = ({
  isOpen = false,
  onClose = () => {},
  roomInfo = {},
  onUpdateRoom = () => {},
  onDeleteRoom = () => {}
}) => {
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 팝업 열릴 때 현재 방 정보로 초기화
  useEffect(() => {
    if (isOpen && roomInfo) {
      setRoomName(roomInfo.name || '');
      setRoomDescription(roomInfo.description || '');
      setHasPassword(roomInfo.hasPassword || false);
      setRoomPassword('');
    }
  }, [isOpen, roomInfo]);

  // 설정 저장
  const handleSaveSettings = async () => {
    if (!roomName.trim()) {
      alert('방 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    
    const updatedSettings = {
      name: roomName.trim(),
      description: roomDescription.trim(),
      password: hasPassword ? roomPassword : '', // 비밀번호 비활성화 시 빈 문자열
      hasPassword: hasPassword && roomPassword.trim().length > 0
    };

    try {
      await onUpdateRoom(updatedSettings);
      onClose();
    } catch (error) {
      alert('설정 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 방 삭제 확인
  const handleDeleteRoom = async () => {
    setIsLoading(true);
    try {
      await onDeleteRoom();
      onClose();
    } catch (error) {
      alert('방 삭제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 비밀번호 토글
  const handlePasswordToggle = () => {
    setHasPassword(!hasPassword);
    if (!hasPassword) {
      setRoomPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">방 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* 삭제 확인 모드 */}
        {showDeleteConfirm ? (
          <div className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">방을 삭제하시겠습니까?</h3>
                <p className="text-sm text-slate-400">
                  이 작업은 되돌릴 수 없으며, 모든 참가자가 방에서 나가게 됩니다.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 py-2.5 px-4 rounded-xl transition-all font-medium text-sm border border-slate-600/50"
                  disabled={isLoading}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteRoom}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl transition-all font-medium text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? '삭제 중...' : '삭제하기'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 설정 폼 */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-chat">
              {/* 방 이름 */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  방 이름 *
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="방 이름을 입력해주세요"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900/70 transition-all text-slate-100 placeholder-slate-500 text-sm"
                  maxLength={30}
                  disabled={isLoading}
                />
              </div>

              {/* 방 설명 */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  방 설명
                </label>
                <textarea
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.target.value)}
                  placeholder="방에 대한 간단한 설명을 입력해주세요"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900/70 transition-all text-slate-100 placeholder-slate-500 text-sm resize-none"
                  maxLength={100}
                  disabled={isLoading}
                />
              </div>

              {/* 비밀번호 설정 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">
                    비밀번호 보호
                  </label>
                  <button
                    onClick={handlePasswordToggle}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all text-sm ${
                      hasPassword
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                    }`}
                    disabled={isLoading}
                  >
                    {hasPassword ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    <span>{hasPassword ? '활성화' : '비활성화'}</span>
                  </button>
                </div>
                
                {hasPassword && (
                  <input
                    type="password"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    placeholder="새 비밀번호를 입력해주세요"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900/70 transition-all text-slate-100 placeholder-slate-500 text-sm"
                    maxLength={20}
                    disabled={isLoading}
                  />
                )}
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="p-6 pt-0 space-y-3">
              {/* 저장 버튼 */}
              <button
                onClick={handleSaveSettings}
                disabled={!roomName.trim() || isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all font-semibold text-sm shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? '저장 중...' : '설정 저장'}</span>
              </button>

              <div className="pt-4">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 py-2.5 px-4 rounded-xl transition-all font-medium text-sm border border-red-800/50 hover:border-red-700/50 flex items-center justify-center gap-2"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>방 삭제</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoomSettingsPopup;