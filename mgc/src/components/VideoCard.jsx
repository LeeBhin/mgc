import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MicOff, HeadphoneOff, Volume2, VolumeX, VideoOff, Mic, Crown, UserX, Check } from 'lucide-react';

/**
 * 비디오 카드 컴포넌트
 * - 참가자의 비디오/오디오 스트림 표시
 * - 마이크/헤드셋 상태 표시 (강제 제어 상태 포함)
 * - 본인도 강제로 꺼진 상태는 빨간색으로 표시
 * - 클릭으로 확대/축소 기능
 * - 우클릭으로 개별 볼륨 조절 메뉴 (원격 사용자만)
 * - 방장 전용 강제 제어 메뉴
 * - 음성 입력 시 글로우 효과
 */
const VideoCard = ({ 
  participant = {}, 
  currentUserSocketId = '',
  localStream = null, 
  remoteStream = null, 
  localVideoRef = null, 
  onClick = () => {}, 
  isExpanded = false,
  playAllVideos = () => {},
  isHeadsetOn = true,
  participantVolumes = {},
  participantPreviousVolumes = {},
  onVolumeChange = () => {},
  onForceControl = () => {},
  participants = []
}) => {
  const remoteVideoRef = useRef(null);
  const [showVolumeMenu, setShowVolumeMenu] = useState(false);
  const [showForceMenu, setShowForceMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showPercentage, setShowPercentage] = useState(false);
  const volumeMenuRef = useRef(null);
  const forceMenuRef = useRef(null);
  const cardRef = useRef(null);
  const percentageTimeoutRef = useRef(null);
  
  // 참가자 정보 추출
  const participantName = participant?.username || '사용자';
  const participantSocketId = participant?.socketId || '';
  const isVideoOnState = participant?.isVideoOn || false;
  const participantIsAudioOn = participant?.isAudioOn || false;
  const participantIsHeadsetOn = participant?.isHeadsetOn !== undefined ? participant.isHeadsetOn : true;
  const userColor = participant?.userColor || { from: '#2563eb', to: '#4f46e5' };
  const audioLevel = participant?.audioLevel || 0;
  const isSpeaking = participant?.isSpeaking || false;
  
  // 강제 제어 상태 추출
  const isVideoForcedOff = participant?.isVideoForcedOff || false;
  const isAudioForcedOff = participant?.isAudioForcedOff || false;
  const isHeadsetForcedOff = participant?.isHeadsetForcedOff || false;
  
  // 현재 사용자 여부 확인
  const isCurrentUser = participantSocketId === currentUserSocketId;
  
  // 방장 여부 확인
  const currentUser = participants.find(p => p.socketId === currentUserSocketId);
  const isOwner = currentUser?.isOwner || false;
  
  // 현재 참가자의 볼륨과 이전 볼륨
  const currentVolume = participantVolumes[participantSocketId] !== undefined 
    ? participantVolumes[participantSocketId] 
    : 50;
  const previousVolume = participantPreviousVolumes[participantSocketId] || 50;
  
  // 실제 헤드셋/오디오 상태 계산
  const actualIsHeadsetOn = isCurrentUser ? isHeadsetOn : participantIsHeadsetOn;
  const actualIsAudioOn = isCurrentUser ? 
    (participant?.isAudioOn !== undefined ? participant.isAudioOn : false) : 
    participantIsAudioOn;
  
  // 아바타 스타일
  const avatarStyle = {
    background: `linear-gradient(to right, ${userColor.from}, ${userColor.to})`,
    boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)'
  };

  // 말하는 중일 때 그림자 효과만 - 부드러운 전환
  const getSpeakingStyle = () => {
    // 현재 사용자인 경우: 실제 오디오 상태 확인
    if (isCurrentUser) {
      const currentUserData = participant;
      const userIsSpeaking = currentUserData?.isSpeaking || false;
      
      // 말하는 중이고 오디오와 헤드셋이 켜져있을 때만 그림자 효과
      if (userIsSpeaking && actualIsAudioOn && actualIsHeadsetOn) {
        return {
          boxShadow: isExpanded 
            ? '0 0 25px rgba(59, 130, 246, 0.7), 0 0 50px rgba(59, 130, 246, 0.3)' 
            : '0 0 15px rgba(59, 130, 246, 0.8)',
        };
      }
    } else {
      // 원격 사용자인 경우
      if (isSpeaking && actualIsAudioOn && actualIsHeadsetOn) {
        return {
          boxShadow: isExpanded 
            ? '0 0 25px rgba(59, 130, 246, 0.7), 0 0 50px rgba(59, 130, 246, 0.3)' 
            : '0 0 15px rgba(59, 130, 246, 0.8)',
        };
      }
    }
    
    // 기본 상태 (말하지 않을 때)
    return {};
  };

  // 표시 상태 계산 - 본인도 강제 제어 상태 반영
  const showVideoElement = (isCurrentUser && localStream) || (!isCurrentUser && remoteStream);
  const showMicOffIcon = !actualIsAudioOn || isAudioForcedOff;
  const showHeadsetOffIcon = !actualIsHeadsetOn || isHeadsetForcedOff;
  const canShowVolumeMenu = !isCurrentUser && actualIsAudioOn && actualIsHeadsetOn && !isAudioForcedOff && !isHeadsetForcedOff;
  const canShowForceMenu = isOwner && !isCurrentUser;
  
  // 강제로 꺼진 상태인지 확인 - 본인도 빨간색 표시
  const isVideoForcedOffState = isVideoForcedOff;
  const isAudioForcedOffState = isAudioForcedOff;
  const isHeadsetForcedOffState = isHeadsetForcedOff;

  // 외부 클릭으로 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (volumeMenuRef.current && !volumeMenuRef.current.contains(event.target)) {
        setShowVolumeMenu(false);
      }
      if (forceMenuRef.current && !forceMenuRef.current.contains(event.target)) {
        setShowForceMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowVolumeMenu(false);
        setShowForceMenu(false);
      }
    };

    if (showVolumeMenu || showForceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showVolumeMenu, showForceMenu]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (percentageTimeoutRef.current) {
        clearTimeout(percentageTimeoutRef.current);
      }
    };
  }, []);

  // 우클릭 이벤트 처리
  const handleRightClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // 메뉴 위치를 화면 좌표로 계산 (화면 경계 고려)
    const x = event.clientX;
    const y = event.clientY;
    const menuWidth = 220;
    const menuHeight = canShowForceMenu ? 200 : 80;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedX = x;
    let adjustedY = y;
    
    if (x + menuWidth > viewportWidth) {
      adjustedX = x - menuWidth;
    }
    if (y + menuHeight > viewportHeight) {
      adjustedY = y - menuHeight;
    }
    
    setMenuPosition({ x: adjustedX, y: adjustedY });
    
    // 권한에 따라 메뉴 표시
    if (canShowForceMenu) {
      setShowForceMenu(true);
      setShowVolumeMenu(false);
    } else if (canShowVolumeMenu) {
      setShowVolumeMenu(true);
      setShowForceMenu(false);
    }
  };

  // 슬라이더 볼륨 변경 처리
  const handleVolumeChange = (event) => {
    event.stopPropagation();
    const newVolume = parseInt(event.target.value);
    onVolumeChange(participantSocketId, newVolume);
    
    // 퍼센트 표시 (1초 후 자동 숨김)
    setShowPercentage(true);
    if (percentageTimeoutRef.current) {
      clearTimeout(percentageTimeoutRef.current);
    }
    percentageTimeoutRef.current = setTimeout(() => {
      setShowPercentage(false);
    }, 1000);
  };

  // 아이콘 클릭으로 음소거 토글
  const handleMuteToggle = (event) => {
    event.stopPropagation();
    
    if (currentVolume === 0) {
      // 음소거 해제: 이전 볼륨으로 복원
      onVolumeChange(participantSocketId, previousVolume);
    } else {
      // 음소거: 현재 볼륨을 이전 볼륨으로 저장하고 0으로 설정
      onVolumeChange(participantSocketId, 0);
    }
    
    // 퍼센트 표시
    setShowPercentage(true);
    if (percentageTimeoutRef.current) {
      clearTimeout(percentageTimeoutRef.current);
    }
    percentageTimeoutRef.current = setTimeout(() => {
      setShowPercentage(false);
    }, 1000);
  };

  // 강제 제어 액션 처리
  const handleForceAction = (action, value) => {
    setShowForceMenu(false);
    onForceControl(participantSocketId, action, value);
  };

  // 원격 비디오 설정
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = !isHeadsetOn;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, participantName]);

  // 볼륨 변경 시 비디오 엘리먼트 볼륨 적용
  useEffect(() => {
    if (remoteVideoRef.current && !isCurrentUser) {
      remoteVideoRef.current.volume = currentVolume / 100;
    }
  }, [currentVolume, isCurrentUser]);

  // 헤드셋 상태 변경시 음소거 업데이트
  useEffect(() => {
    if (remoteVideoRef.current && !isCurrentUser && remoteStream) {
      remoteVideoRef.current.muted = !isHeadsetOn;
    }
  }, [isHeadsetOn, isCurrentUser, remoteStream]);

  // 로컬 비디오 설정
  useEffect(() => {
    if (isCurrentUser && localVideoRef && localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
  }, [isCurrentUser, localStream]);

  return (
    <>
      <div 
        ref={cardRef}
        className={`bg-slate-900/90 rounded-lg sm:rounded-xl lg:rounded-2xl relative overflow-hidden border border-slate-700/50 cursor-pointer w-full aspect-video transition-all duration-500 ease-out ${
          isExpanded ? 'shadow-2xl' : 'shadow-sm'
        }`}
        onClick={onClick}
        onContextMenu={handleRightClick}
        style={{ 
          minHeight: '120px',
          ...getSpeakingStyle()
        }}
      >
        {/* 비디오 요소 */}
        {showVideoElement && (
          <video
            ref={isCurrentUser ? localVideoRef : remoteVideoRef}
            autoPlay
            playsInline
            muted={isCurrentUser ? true : !isHeadsetOn}
            controls={false}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isVideoOnState ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
        
        {/* 아바타 (비디오 꺼져있을 때) */}
        {!isVideoOnState && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800/95 to-slate-900/95">
            <div className="text-center px-2">
              <div 
                className={`${isExpanded ? 'w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16' : 'w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12'} rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-1 sm:mb-2 md:mb-3`}
                style={avatarStyle}
              >
                <span className={`${isExpanded ? 'text-sm sm:text-lg lg:text-xl' : 'text-xs xs:text-sm sm:text-sm md:text-base'} font-bold text-white`}>
                  {participantName[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <p className={`text-slate-300 font-medium truncate max-w-full ${isExpanded ? 'text-sm sm:text-lg lg:text-xl' : 'text-xs xs:text-sm sm:text-sm md:text-base'}`}>
                  {participantName}
                </p>
                {isCurrentUser && (
                  <span className={`text-slate-500 ${isExpanded ? 'text-xs lg:text-sm' : 'text-xs'}`}>(나)</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 이름 표시 (비디오 켜져있을 때) */}
        {isVideoOnState && (
          <div className="absolute bottom-1 sm:bottom-2 md:bottom-3 right-1 sm:right-2 md:right-3">
            <div className="bg-black/70 backdrop-blur text-white px-2 py-1 rounded text-xs font-medium">
              {participantName}{isCurrentUser && ' (나)'}
            </div>
          </div>
        )}

        {/* 마이크/헤드셋 상태 아이콘 - 본인도 강제 제어 상태 빨간색 표시 */}
        {(showMicOffIcon || showHeadsetOffIcon) && (
          <div className="absolute bottom-1 sm:bottom-2 md:bottom-3 left-1 sm:left-2 md:left-3">
            <div className="bg-black/70 backdrop-blur text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              {showHeadsetOffIcon && (
                <HeadphoneOff className={`h-4 w-4 ${isHeadsetForcedOffState ? 'text-red-400' : ''}`} />
              )}
              {showMicOffIcon && (
                <MicOff className={`h-4 w-4 ${isAudioForcedOffState ? 'text-red-400' : ''}`} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Portal을 사용한 볼륨 조절 메뉴 (원격 사용자만) */}
      {showVolumeMenu && canShowVolumeMenu && createPortal(
        <div
          ref={volumeMenuRef}
          className="fixed bg-slate-800/95 backdrop-blur-xl rounded-lg border border-slate-700/50 shadow-2xl p-3 z-[9999]"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            minWidth: '180px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            {/* 음소거/볼륨 아이콘 버튼 */}
            <button
              onClick={handleMuteToggle}
              className={`p-2 rounded-lg transition-colors ${
                currentVolume === 0 
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700/70'
              }`}
              title={currentVolume === 0 ? '음소거 해제' : '음소거'}
            >
              {currentVolume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            
            {/* 볼륨 슬라이더 */}
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="100"
                value={currentVolume}
                onChange={handleVolumeChange}
                className="volume-slider w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${currentVolume}%, #475569 ${currentVolume}%, #475569 100%)`
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              />
              
              {/* 볼륨 퍼센트 표시 (조정할 때만) */}
              {showPercentage && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
                  <span className="text-xs text-slate-300 bg-slate-900/90 px-2 py-1 rounded shadow-lg">
                    {currentVolume}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Portal을 사용한 강제 제어 메뉴 (방장 전용) */}
      {showForceMenu && canShowForceMenu && createPortal(
        <div
          ref={forceMenuRef}
          className="fixed bg-slate-800/95 backdrop-blur-xl rounded-lg border border-slate-700/50 shadow-2xl p-2 z-[9999]"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            minWidth: '180px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            {/* 미디어 강제 제어 - 체크박스 스타일 */}
            <div className="space-y-1">
              <div
                onClick={() => handleForceAction('video', isVideoForcedOff)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-red-600/20 transition-colors text-sm text-red-400 hover:text-red-300 rounded cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <VideoOff className="h-4 w-4" />
                  <span>비디오 끄기</span>
                </div>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  isVideoForcedOff ? 'bg-red-600 border-red-600' : 'border-slate-500'
                }`}>
                  {isVideoForcedOff && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>

              <div
                onClick={() => handleForceAction('audio', isAudioForcedOff)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-red-600/20 transition-colors text-sm text-red-400 hover:text-red-300 rounded cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <MicOff className="h-4 w-4" />
                  <span>마이크 끄기</span>
                </div>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  isAudioForcedOff ? 'bg-red-600 border-red-600' : 'border-slate-500'
                }`}>
                  {isAudioForcedOff && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>

              <div
                onClick={() => handleForceAction('headset', isHeadsetForcedOff)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-red-600/20 transition-colors text-sm text-red-400 hover:text-red-300 rounded cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <HeadphoneOff className="h-4 w-4" />
                  <span>헤드셋 끄기</span>
                </div>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  isHeadsetForcedOff ? 'bg-red-600 border-red-600' : 'border-slate-500'
                }`}>
                  {isHeadsetForcedOff && <Check className="h-3 w-3 text-white" />}
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

            {/* 볼륨 조절 (헤드셋 켜져있고 마이크 켜져있을 때만) */}
            {canShowVolumeMenu && (
              <>
                <div className="border-t border-slate-700/50 my-1"></div>
                <div className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMuteToggle}
                      className={`p-2 rounded-lg transition-colors ${
                        currentVolume === 0 
                          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700/70'
                      }`}
                      title={currentVolume === 0 ? '음소거 해제' : '음소거'}
                    >
                      {currentVolume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentVolume}
                        onChange={handleVolumeChange}
                        className="volume-slider w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${currentVolume}%, #475569 ${currentVolume}%, #475569 100%)`
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      />
                      
                      {showPercentage && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 transition-opacity duration-300">
                          <span className="text-xs text-slate-300 bg-slate-900/90 px-2 py-1 rounded shadow-lg">
                            {currentVolume}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default VideoCard;