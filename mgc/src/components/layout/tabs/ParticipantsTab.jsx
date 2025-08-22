import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Edit3, Check, X, VideoOff, MicOff, HeadphoneOff, UserX } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

/**
 * 참가자 탭 컴포넌트
 * - 참가자 목록 표시
 * - 현재 사용자 상태 변경 기능
 * - 자리비움 자동 감지
 * - 커스텀 상태 및 이모지 설정
 * - 방장 전용 강제 제어 메뉴
 */
const ParticipantsTab = ({
  participants = [],
  username = '',
  roomCode = '',
  currentUserSocketId = '',
  onStatusChange = () => { },
  userStatus = 'online',
  userEmoji = '',
  customText = '',
  onForceControl = () => {}
}) => {
  // UI 상태
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showForceMenu, setShowForceMenu] = useState(false);
  const [forceMenuTarget, setForceMenuTarget] = useState(null);
  const [forceMenuPosition, setForceMenuPosition] = useState({ x: 0, y: 0 });
  
  // 모달 입력용 임시 상태
  const [tempEmoji, setTempEmoji] = useState('');
  const [tempCustomStatus, setTempCustomStatus] = useState('');

  // 자리비움 자동 감지를 위한 오디오 활동 추적
  const audioActivityRef = useRef({
    highActivityCount: 0,
    startTime: Date.now(),
    lastReset: Date.now()
  });

  const statusMenuRef = useRef(null);
  const forceMenuRef = useRef(null);

  // 현재 사용자가 방장인지 확인
  const currentUser = participants.find(p => p.socketId === currentUserSocketId);
  const isOwner = currentUser?.isOwner || false;

  // 미리 정의된 상태 목록
  const predefinedStatuses = [
    { id: 'online', text: '온라인', color: 'bg-green-500' },
    { id: 'away', text: '자리비움', color: 'bg-gray-500' },
    { id: 'gaming', text: '빡겜중', color: 'bg-red-500' },
    { id: 'coding', text: '빡코딩중', color: 'bg-red-500' }
  ];

  // 외부 클릭으로 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setShowStatusMenu(false);
      }
      if (forceMenuRef.current && !forceMenuRef.current.contains(event.target)) {
        setShowForceMenu(false);
        setForceMenuTarget(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 커스텀 모달 열 때 현재 값으로 초기화
  useEffect(() => {
    if (showCustomModal) {
      setTempEmoji(userEmoji);
      setTempCustomStatus(customText);
    }
  }, [showCustomModal, userEmoji, customText]);

  // 자리비움 자동 감지 로직
  useEffect(() => {
    const currentUser = participants.find(p => p.socketId === currentUserSocketId);
    if (!currentUser || userStatus !== 'online') return;

    const audioLevel = currentUser.audioLevel || 0;
    const now = Date.now();

    // 5분마다 카운터 리셋
    if (now - audioActivityRef.current.lastReset > 5 * 60 * 1000) {
      audioActivityRef.current = {
        highActivityCount: 0,
        startTime: now,
        lastReset: now
      };
    }

    // 음성 레벨이 30% 이상일 때 카운트 증가
    if (audioLevel > 30) {
      audioActivityRef.current.highActivityCount++;
    }

    // 5분 동안 고음량 활동이 3번 이하면 자리비움으로 자동 변경
    if (now - audioActivityRef.current.startTime > 5 * 60 * 1000) {
      if (audioActivityRef.current.highActivityCount <= 3) {
        handleStatusChange('away');
      }
      audioActivityRef.current = {
        highActivityCount: 0,
        startTime: now,
        lastReset: now
      };
    }
  }, [participants, currentUserSocketId, userStatus]);

  // 방 코드 복사 기능
  const handleCopyRoomCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomCode).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  };

  // 상태 변경 처리
  const handleStatusChange = (statusId, emoji = '', text = '') => {
    // 자리비움이 아닌 상태로 변경 시 활동 카운터 리셋
    if (statusId !== 'away') {
      audioActivityRef.current = {
        highActivityCount: 0,
        startTime: Date.now(),
        lastReset: Date.now()
      };
    }

    setShowStatusMenu(false);
    setShowCustomModal(false);
    setShowEmojiPicker(false);

    // 부모 컴포넌트에 상태 변경 알림
    onStatusChange({
      status: statusId,
      emoji: emoji,
      customText: text
    });
  };

  // 이모지 선택 처리
  const handleEmojiSelect = (emojiData) => {
    const emojiNative = emojiData.emoji;
    setTempEmoji(emojiNative);
    setShowEmojiPicker(false);
  };

  // 커스텀 상태 저장
  const handleCustomSave = () => {
    if (tempEmoji || tempCustomStatus.trim()) {
      handleStatusChange('custom', tempEmoji, tempCustomStatus.trim());
      setTempCustomStatus('');
      setTempEmoji('');
    }
  };

  // 우클릭 강제 제어 메뉴 처리
  const handleParticipantRightClick = (event, participant) => {
    if (!isOwner || participant.socketId === currentUserSocketId) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // 마우스 위치 기준으로 메뉴 위치 계산
    const x = event.clientX;
    const y = event.clientY;
    const menuWidth = 200;
    const menuHeight = 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedX = x;
    let adjustedY = y;
    
    // 화면 경계를 벗어나지 않도록 조정
    if (x + menuWidth > viewportWidth) {
      adjustedX = x - menuWidth;
    }
    if (y + menuHeight > viewportHeight) {
      adjustedY = y - menuHeight;
    }
    
    setForceMenuPosition({ x: adjustedX, y: adjustedY });
    setForceMenuTarget(participant);
    setShowForceMenu(true);
  };

  // 강제 제어 액션 처리
  const handleForceAction = (action, value) => {
    if (!forceMenuTarget) return;
    
    setShowForceMenu(false);
    onForceControl(forceMenuTarget.socketId, action, value);
    setForceMenuTarget(null);
  };

  // 상태 정보 반환 함수
  const getStatusInfo = (participant, isCurrentUser) => {
    if (isCurrentUser) {
      // 현재 사용자: 전역 상태 사용
      if (userEmoji) {
        return {
          display: customText || '커스텀',
          indicator: userEmoji,
          color: 'bg-blue-500'
        };
      }

      const predefined = predefinedStatuses.find(s => s.id === userStatus);
      if (predefined) {
        return {
          display: predefined.text,
          indicator: null,
          color: predefined.color
        };
      }
    } else {
      // 다른 사용자: participant 객체의 상태 사용
      if (participant.statusEmoji) {
        return {
          display: participant.statusText || '커스텀',
          indicator: participant.statusEmoji,
          color: 'bg-blue-500'
        };
      }

      const predefined = predefinedStatuses.find(s => s.id === participant.status);
      if (predefined) {
        return {
          display: predefined.text,
          indicator: null,
          color: predefined.color
        };
      }
    }

    return {
      display: '온라인',
      indicator: null,
      color: 'bg-green-500'
    };
  };

  return (
    <div className="relative p-3 sm:p-4">
      {/* 상태 메뉴 - 스크롤 영역 밖에 배치 */}
      {showStatusMenu && (
        <div
          ref={statusMenuRef}
          className="absolute left-4 top-20 w-40 bg-slate-800/95 backdrop-blur-xl rounded-lg border border-slate-700/50 shadow-xl z-[60] overflow-hidden"
        >
          {/* 미리 정의된 상태들 */}
          {predefinedStatuses.map((status) => (
            <button
              key={status.id}
              onClick={() => handleStatusChange(status.id)}
              className={`w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors text-sm flex items-center gap-2 ${userStatus === status.id && !userEmoji ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300'
                }`}
            >
              <div className={`w-2 h-2 ${status.color} rounded-full`}></div>
              <span>{status.text}</span>
            </button>
          ))}

          <div>
            {/* 직접 설정 버튼 */}
            <button
              onClick={() => {
                setShowCustomModal(true);
                setShowStatusMenu(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors text-sm text-slate-300 flex items-center gap-2"
            >
              <Edit3 className="h-3 w-3" />
              <span>직접 설정</span>
            </button>
          </div>
        </div>
      )}

      {/* 참가자 목록 */}
      <div
        className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-participants"
        onScroll={() => {
          setShowStatusMenu(false);
          setShowForceMenu(false);
        }}
      >
        {participants
          .sort((a, b) => {
            // 현재 사용자를 맨 앞으로 정렬
            if (a.socketId === currentUserSocketId) return -1;
            if (b.socketId === currentUserSocketId) return 1;
            return 0;
          })
          .map((participant, index) => {
            const participantName = participant?.username || '사용자';
            const participantKey = participant?.socketId || `participant-${index}`;
            const isParticipantOwner = participant?.isOwner || false;
            const socketId = participant?.socketId;
            const isCurrentUser = socketId === currentUserSocketId;
            const canForceControl = isOwner && !isCurrentUser;

            // 사용자별 고유 컬러
            const userColor = participant?.userColor || { from: '#0891b2', to: '#0d9488' };
            const avatarStyle = {
              background: `linear-gradient(to right, ${userColor.from}, ${userColor.to})`,
              boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)'
            };

            // 상태 정보 가져오기
            const statusInfo = getStatusInfo(participant, isCurrentUser);

            return (
              <div 
                key={participantKey} 
                className={`relative flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-700/30 transition-colors group ${canForceControl ? 'cursor-context-menu' : ''}`}
                onContextMenu={canForceControl ? (e) => handleParticipantRightClick(e, participant) : undefined}
              >
                {/* 아바타 */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium text-white"
                  style={avatarStyle}
                >
                  {participantName[0]?.toUpperCase() || 'U'}
                </div>

                <div className="flex-1 min-w-0">
                  {/* 사용자명과 방장 표시 */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {participantName}
                      {isCurrentUser && <span className="text-slate-400 ml-1 text-xs">(나)</span>}
                    </p>
                    {isParticipantOwner && (
                      <Crown className="w-3 h-3 text-yellow-400" title="방장" />
                    )}
                  </div>

                  {/* 상태 표시 (현재 사용자만 클릭 가능) */}
                  <div
                    className={`flex items-center space-x-1 ${isCurrentUser ? 'cursor-pointer rounded px-1 py-0.5 -mx-1 hover:bg-slate-700/30 transition-colors' : ''}`}
                    onClick={isCurrentUser ? () => setShowStatusMenu(!showStatusMenu) : undefined}
                  >
                    {statusInfo.indicator ? (
                      <span className="text-sm">{statusInfo.indicator}</span>
                    ) : (
                      <div className={`w-2 h-2 ${statusInfo.color} rounded-full`}></div>
                    )}
                    <p className="text-xs text-slate-400">{statusInfo.display}</p>
                    {isCurrentUser && (
                      <Edit3 className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Portal을 사용한 강제 제어 메뉴 - 마우스 위치에 정확히 표시 */}
      {showForceMenu && forceMenuTarget && createPortal(
        <div
          ref={forceMenuRef}
          className="fixed bg-slate-800/95 backdrop-blur-xl rounded-lg border border-slate-700/50 shadow-2xl p-2 z-[9999]"
          style={{
            left: `${forceMenuPosition.x}px`,
            top: `${forceMenuPosition.y}px`,
            minWidth: '200px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            {/* 미디어 강제 제어 - 토글 방식 */}
            <div className="space-y-1">
              <div
                onClick={() => handleForceAction('video', forceMenuTarget.isVideoForcedOff)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-red-600/20 transition-colors text-sm text-red-400 hover:text-red-300 rounded cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <VideoOff className="h-4 w-4" />
                  <span>비디오 끄기</span>
                </div>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  forceMenuTarget.isVideoForcedOff ? 'bg-red-600 border-red-600' : 'border-slate-500'
                }`}>
                  {forceMenuTarget.isVideoForcedOff && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>

              <div
                onClick={() => handleForceAction('audio', forceMenuTarget.isAudioForcedOff)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-red-600/20 transition-colors text-sm text-red-400 hover:text-red-300 rounded cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <MicOff className="h-4 w-4" />
                  <span>마이크 끄기</span>
                </div>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  forceMenuTarget.isAudioForcedOff ? 'bg-red-600 border-red-600' : 'border-slate-500'
                }`}>
                  {forceMenuTarget.isAudioForcedOff && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>

              <div
                onClick={() => handleForceAction('headset', forceMenuTarget.isHeadsetForcedOff)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-red-600/20 transition-colors text-sm text-red-400 hover:text-red-300 rounded cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <HeadphoneOff className="h-4 w-4" />
                  <span>헤드셋 끄기</span>
                </div>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  forceMenuTarget.isHeadsetForcedOff ? 'bg-red-600 border-red-600' : 'border-slate-500'
                }`}>
                  {forceMenuTarget.isHeadsetForcedOff && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-slate-700/50 my-1"></div>

            {/* 강퇴 */}
            <button
              onClick={() => handleForceAction('kick', true)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-600/30 transition-colors text-sm text-red-500 hover:text-red-400 rounded font-medium"
            >
              <UserX className="h-4 w-4" />
              <span>강제 퇴장</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 방 코드 공유 섹션 */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-center">
          <p className="text-sm text-slate-400 mb-2">방 코드를 공유하세요</p>
          <div className="relative inline-block">
            <button
              onClick={handleCopyRoomCode}
              onMouseEnter={() => setShowCopyTooltip(true)}
              onMouseLeave={() => setShowCopyTooltip(false)}
              className="bg-slate-700/50 hover:bg-slate-700/70 px-3 py-2 rounded-lg font-mono text-lg font-bold text-blue-400 transition-colors cursor-pointer border border-slate-600/50 hover:border-blue-500/50"
            >
              {roomCode}
            </button>

            {/* 복사 툴팁 */}
            {(showCopyTooltip || copySuccess) && (
              <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 rounded text-xs text-white whitespace-nowrap transition-all duration-200 z-[70] ${copySuccess ? 'bg-green-600' : 'bg-slate-600'}`}>
                {copySuccess ? '복사됨!' : '클릭해서 복사'}
                <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent ${copySuccess ? 'border-b-green-600' : 'border-b-slate-600'}`}></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 커스텀 상태 설정 모달 */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl w-full max-w-sm relative z-[90]">
            <div className="p-4 space-y-4">
              {/* 이모지 선택 섹션 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">이모지</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-center">
                    {tempEmoji ? (
                      <span className="text-2xl">{tempEmoji}</span>
                    ) : (
                      <span className="text-slate-500 text-sm">이모지 없음</span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowEmojiPicker(true)}
                    className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors text-sm border border-blue-500/30"
                  >
                    선택
                  </button>
                  {tempEmoji && (
                    <button
                      onClick={() => setTempEmoji('')}
                      className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm border border-red-500/30"
                    >
                      제거
                    </button>
                  )}
                </div>
              </div>

              {/* 커스텀 텍스트 입력 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">상태 메시지</label>
                <input
                  type="text"
                  value={tempCustomStatus}
                  onChange={(e) => setTempCustomStatus(e.target.value)}
                  placeholder="상태 메시지 입력..."
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder-slate-500 text-sm"
                  maxLength={20}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomSave()}
                />
              </div>

              <div className='flex justify-between gap-2'>
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="w-full bg-slate-600 hover:bg-slate-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                >
                  취소
                </button>
                <button
                  onClick={handleCustomSave}
                  disabled={!tempEmoji && !tempCustomStatus.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이모지 피커 */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl relative z-[110]">
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              theme="dark"
              emojiStyle="native"
              width={300}
              height={350}
              searchPlaceholder="검색..."
              previewConfig={{
                showPreview: false
              }}
              skinTonesDisabled={true}
              autoFocusSearch={false}
            />
            <div className="p-2 border-t border-slate-700">
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-1.5 px-3 rounded-lg transition-colors text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantsTab;