import React, { useEffect, useState, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, ArrowRight, Plus, ChevronDown, Headphones, HeadphoneOff } from 'lucide-react';

const WaitingRoom = ({
  mode = 'join',
  roomId = '',
  username = '',
  setUsername = () => { },
  password = '',
  setPassword = () => { },
  roomName = '',
  setRoomName = () => { },
  roomDescription = '',
  setRoomDescription = () => { },
  roomPassword = '',
  setRoomPassword = () => { },
  existingRoomInfo = null,
  isVideoOn = false,
  isAudioOn = false,
  isHeadsetOn = true, // 헤드셋 상태 추가
  onToggleVideo = () => { },
  onToggleAudio = () => { },
  onToggleHeadset = () => { }, // 헤드셋 토글 추가
  localStream = null,
  localVideoRef = null,
  error = '',
  onCreateRoom = () => { },
  onJoinRoom = () => { },
  onCancel = () => { }
}) => {
  // 장치 선택 관련 상태
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState('');
  const [showVideoDevices, setShowVideoDevices] = useState(false);
  const [showAudioInputDevices, setShowAudioInputDevices] = useState(false);
  const [showAudioOutputDevices, setShowAudioOutputDevices] = useState(false);

  // 마이크 테스트 관련 상태
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);

  // 드롭다운 위치 및 참조
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const videoButtonRef = useRef(null);
  const audioButtonRef = useRef(null);
  const speakerButtonRef = useRef(null);
  const videoDropdownRef = useRef(null);
  const audioDropdownRef = useRef(null);
  const speakerDropdownRef = useRef(null);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    const savedUsername = sessionStorage.getItem('mogakko_username');
    if (savedUsername && !username) {
      setUsername(savedUsername);
    }
    getDevices();
  }, [setUsername, username]);

  // 닉네임 변경 및 세션 스토리지 저장
  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setUsername(newUsername);

    if (newUsername.trim()) {
      sessionStorage.setItem('mogakko_username', newUsername.trim());
    } else {
      sessionStorage.removeItem('mogakko_username');
    }
  };

  // 로컬 비디오 설정
  useEffect(() => {
    if (localStream && localVideoRef?.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => { });
    }
  }, [localStream]);

  // 외부 클릭 감지 - 수정된 버전
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 각 드롭다운별로 개별 체크
      if (showVideoDevices &&
        !videoButtonRef.current?.contains(event.target) &&
        !videoDropdownRef.current?.contains(event.target)) {
        setShowVideoDevices(false);
      }

      if (showAudioInputDevices &&
        !audioButtonRef.current?.contains(event.target) &&
        !audioDropdownRef.current?.contains(event.target)) {
        setShowAudioInputDevices(false);
      }

      if (showAudioOutputDevices &&
        !speakerButtonRef.current?.contains(event.target) &&
        !speakerDropdownRef.current?.contains(event.target)) {
        setShowAudioOutputDevices(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVideoDevices, showAudioInputDevices, showAudioOutputDevices]);

  // 장치 목록 가져오기
  const getDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

      setVideoDevices(videoInputs);
      setAudioInputDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);

      if (videoInputs.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
      if (audioInputs.length > 0 && !selectedAudioInput) {
        setSelectedAudioInput(audioInputs[0].deviceId);
      }
      if (audioOutputs.length > 0 && !selectedAudioOutput) {
        setSelectedAudioOutput(audioOutputs[0].deviceId);
      }
    } catch (error) {
      console.error('장치 목록 가져오기 실패:', error);
    }
  };

  // 장치명 정리
  const cleanDeviceName = (name) => {
    return name.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i, '').trim();
  };

  // 드롭다운 위치 계산
  const calculateDropdownPosition = (buttonRef) => {
    if (!buttonRef.current) return { top: 0, left: 0 };

    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left
    };
  };

  // 드롭다운 토글 함수들
  const toggleVideoDevices = () => {
    const newState = !showVideoDevices;
    if (newState) {
      setDropdownPosition(calculateDropdownPosition(videoButtonRef));
      setShowAudioInputDevices(false);
      setShowAudioOutputDevices(false);
    }
    setShowVideoDevices(newState);
  };

  const toggleAudioInputDevices = () => {
    const newState = !showAudioInputDevices;
    if (newState) {
      setDropdownPosition(calculateDropdownPosition(audioButtonRef));
      setShowVideoDevices(false);
      setShowAudioOutputDevices(false);
    }
    setShowAudioInputDevices(newState);
  };

  const toggleAudioOutputDevices = () => {
    const newState = !showAudioOutputDevices;
    if (newState) {
      setDropdownPosition(calculateDropdownPosition(speakerButtonRef));
      setShowVideoDevices(false);
      setShowAudioInputDevices(false);
    }
    setShowAudioOutputDevices(newState);
  };

  // 비디오 장치 변경
  const handleVideoDeviceChange = async (deviceId) => {
    setSelectedVideoDevice(deviceId);
    setShowVideoDevices(false);

    if (localStream) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: { deviceId: selectedAudioInput ? { exact: selectedAudioInput } : undefined }
        });

        const videoTrack = newStream.getVideoTracks()[0];
        const oldVideoTrack = localStream.getVideoTracks()[0];

        if (oldVideoTrack) {
          localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }

        if (videoTrack) {
          localStream.addTrack(videoTrack);
          videoTrack.enabled = isVideoOn;
        }
      } catch (error) {
        console.error('비디오 장치 변경 실패:', error);
      }
    }
  };

  // 오디오 입력 장치 변경
  const handleAudioInputDeviceChange = async (deviceId) => {
    setSelectedAudioInput(deviceId);
    setShowAudioInputDevices(false);

    if (localStream) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined },
          audio: { deviceId: { exact: deviceId } }
        });

        const audioTrack = newStream.getAudioTracks()[0];
        const oldAudioTrack = localStream.getAudioTracks()[0];

        if (oldAudioTrack) {
          localStream.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
        }

        if (audioTrack) {
          localStream.addTrack(audioTrack);
          audioTrack.enabled = isAudioOn && isHeadsetOn; // 헤드셋 상태 고려
        }
      } catch (error) {
        console.error('오디오 입력 장치 변경 실패:', error);
      }
    }
  };

  // 스피커 장치 변경
  const handleAudioOutputDeviceChange = async (deviceId) => {
    setSelectedAudioOutput(deviceId);
    setShowAudioOutputDevices(false);

    if (localVideoRef?.current && localVideoRef.current.setSinkId) {
      try {
        await localVideoRef.current.setSinkId(deviceId);
        // 헤드셋 상태에 따라 볼륨 설정
        localVideoRef.current.volume = isHeadsetOn ? 0.5 : 0;
      } catch (error) {
        console.error('스피커 장치 변경 실패:', error);
      }
    }
  };

  // 마이크 테스트 시작
  const startMicTest = async () => {
    try {
      let streamToTest = localStream;

      if (!streamToTest || streamToTest.getAudioTracks().length === 0) {
        streamToTest = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        });
        if (!sourceRef.current) {
          sourceRef.current = {};
        }
        sourceRef.current.testStream = streamToTest;
      }

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (!sourceRef.current) {
        sourceRef.current = {};
      }

      sourceRef.current.mediaStreamSource = audioContextRef.current.createMediaStreamSource(streamToTest);

      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 1;

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;

      sourceRef.current.mediaStreamSource.connect(gainNode);
      gainNode.connect(analyserRef.current);

      const destination = audioContextRef.current.createMediaStreamDestination();
      gainNode.connect(destination);

      const loopbackAudio = new Audio();
      loopbackAudio.srcObject = destination.stream;
      loopbackAudio.muted = false;
      loopbackAudio.play();
      sourceRef.current.loopbackAudio = loopbackAudio;

      const updateLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        let peak = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const value = Math.abs(dataArray[i] - 128);
          if (value > peak) {
            peak = value;
          }
        }

        const threshold = 3;
        const normalizedPeak = peak > threshold ? peak / 30 : 0;
        const newLevel = normalizedPeak > 0 ? Math.min(100, Math.pow(normalizedPeak, 0.65) * 100) : 0;

        setMicLevel(newLevel);

        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
      setIsMicTesting(true);
    } catch (error) {
      console.error('마이크 테스트 시작 실패:', error);
    }
  };

  // 마이크 테스트 중지
  const stopMicTest = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (sourceRef.current) {
      if (sourceRef.current.testStream) {
        sourceRef.current.testStream.getTracks().forEach(track => track.stop());
      }
      if (sourceRef.current.mediaStreamSource) {
        sourceRef.current.mediaStreamSource.disconnect();
      }
      if (sourceRef.current.loopbackAudio) {
        sourceRef.current.loopbackAudio.pause();
        sourceRef.current.loopbackAudio.srcObject = null;
      }
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setMicLevel(0);
    setIsMicTesting(false);
  };

  const handleMicTestToggle = () => {
    if (isMicTesting) {
      stopMicTest();
    } else {
      startMicTest();
    }
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  const handleVideoToggle = async () => {
    await onToggleVideo();
  };

  const handleAudioToggle = async () => {
    if (!isHeadsetOn) {
      alert('헤드셋이 꺼져있어 마이크를 켤 수 없습니다.');
      return;
    }
    await onToggleAudio();
  };

  const handleHeadsetToggle = async () => {
    await onToggleHeadset();
  };

  const isCreateMode = mode === 'create';
  const isJoinMode = mode === 'join' || !mode;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 w-full max-w-4xl">
        {/* 헤더 */}
        <div className="text-center mb-6">
          {isCreateMode ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">새 방 만들기</h2>
              <p className="text-slate-400 text-sm mt-1">방 정보를 입력하고 생성해주세요</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
                {existingRoomInfo ? existingRoomInfo.name : `방 #${roomId}`}
              </h2>
              <div className="space-y-1">
                {existingRoomInfo?.description && (
                  <p className="text-slate-300 text-sm">{existingRoomInfo.description}</p>
                )}
                <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                  <span>참가자 {existingRoomInfo?.participants || 0}명</span>
                  {existingRoomInfo?.hasPassword && (
                    <span className="bg-amber-600/20 text-amber-400 px-2 py-1 rounded">🔒 비밀방</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-400 text-sm backdrop-blur">
            ⚠️ {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* 왼쪽: 비디오 미리보기 */}
          <div className="space-y-4">
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOn ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* 비디오 꺼짐 시 아바타 */}
              {!isVideoOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-white">
                        {username ? username[0]?.toUpperCase() : '?'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 미디어 컨트롤 버튼 */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                {/* 비디오 버튼 그룹 */}
                <div className="relative">
                  <div className="flex" ref={videoButtonRef}>
                    <button
                      onClick={handleVideoToggle}
                      className={`p-3 rounded-l-xl transition-all ${isVideoOn
                          ? 'bg-slate-700/90 hover:bg-slate-600/90 text-white'
                          : 'bg-slate-900/90 hover:bg-slate-800/90 text-red-400'
                        } backdrop-blur border border-slate-600/50 border-r-0`}
                    >
                      {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={toggleVideoDevices}
                      className={`p-3 rounded-r-xl transition-all ${isVideoOn
                          ? 'bg-slate-700/90 hover:bg-slate-600/90 text-white'
                          : 'bg-slate-900/90 hover:bg-slate-800/90 text-red-400'
                        } backdrop-blur border border-slate-600/50 border-l-0`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 오디오 버튼 그룹 */}
                <div className="relative">
                  <div className="flex" ref={audioButtonRef}>
                    <button
                      onClick={handleAudioToggle}
                      disabled={!isHeadsetOn}
                      className={`p-3 rounded-l-xl transition-all ${
                        !isHeadsetOn 
                          ? 'bg-slate-900/90 text-slate-600 cursor-not-allowed' 
                          : isAudioOn
                            ? 'bg-slate-700/90 hover:bg-slate-600/90 text-white'
                            : 'bg-slate-900/90 hover:bg-slate-800/90 text-red-400'
                        } backdrop-blur border border-slate-600/50 border-r-0`}
                    >
                      {isAudioOn && isHeadsetOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={toggleAudioInputDevices}
                      disabled={!isHeadsetOn}
                      className={`p-3 rounded-r-xl transition-all ${
                        !isHeadsetOn 
                          ? 'bg-slate-900/90 text-slate-600 cursor-not-allowed' 
                          : isAudioOn
                            ? 'bg-slate-700/90 hover:bg-slate-600/90 text-white'
                            : 'bg-slate-900/90 hover:bg-slate-800/90 text-red-400'
                        } backdrop-blur border border-slate-600/50 border-l-0`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 헤드셋 버튼 그룹 */}
                <div className="relative">
                  <div className="flex" ref={speakerButtonRef}>
                    <button
                      onClick={handleHeadsetToggle}
                      className={`p-3 rounded-l-xl transition-all ${isHeadsetOn
                          ? 'bg-slate-700/90 hover:bg-slate-600/90 text-white'
                          : 'bg-slate-900/90 hover:bg-slate-800/90 text-red-400'
                        } backdrop-blur border border-slate-600/50 border-r-0`}
                    >
                      {isHeadsetOn ? <Headphones className="h-5 w-5" /> : <HeadphoneOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={toggleAudioOutputDevices}
                      disabled={!isHeadsetOn}
                      className={`p-3 rounded-r-xl transition-all ${
                        !isHeadsetOn 
                          ? 'bg-slate-900/90 text-slate-600 cursor-not-allowed' 
                          : 'bg-slate-700/90 hover:bg-slate-600/90 text-white'
                        } backdrop-blur border border-slate-600/50 border-l-0`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 마이크 테스트 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMicTestToggle}
                  className={`px-4 py-2 rounded-xl transition-all text-sm font-medium ${isMicTesting
                    ? 'bg-red-600/20 text-red-400 border border-red-500/50'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700/70'
                    }`}
                >
                  {isMicTesting ? '테스트 중지' : '마이크 테스트'}
                </button>

                {/* 마이크 레벨 표시 - 깔끔한 바만 */}
                {isMicTesting && (
                  <div className="flex-1 bg-slate-900/50 rounded-xl p-2 border border-slate-700/50">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-100"
                        style={{ width: `${micLevel}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 설정 */}
          <div className="space-y-4">
            {/* 닉네임 입력 */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                닉네임 *
              </label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="닉네임을 입력해주세요"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900/70 transition-all text-slate-100 placeholder-slate-500 text-sm"
                maxLength={20}
              />
            </div>

            {/* 방 생성 모드 */}
            {isCreateMode && (
              <>
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    방 설명
                  </label>
                  <textarea
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    placeholder="방에 대한 간단한 설명을 입력해주세요 (선택사항)"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900/70 transition-all text-slate-100 placeholder-slate-500 text-sm resize-none"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                    placeholder="비밀번호 설정 (선택사항)"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900/70 transition-all text-slate-100 placeholder-slate-500 text-sm"
                    maxLength={20}
                  />
                </div>
              </>
            )}

            {/* 방 입장 모드 - 비밀번호 입력 */}
            {isJoinMode && existingRoomInfo?.hasPassword && (
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  방 비밀번호 *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="방 비밀번호를 입력해주세요"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-slate-900/70 transition-all text-slate-100 placeholder-slate-500 text-sm"
                />
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="space-y-3 pt-4">
              <button
                onClick={isCreateMode ? onCreateRoom : onJoinRoom}
                disabled={
                  !username.trim() ||
                  (isCreateMode && !roomName.trim()) ||
                  (isJoinMode && existingRoomInfo?.hasPassword && !password.trim())
                }
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all font-semibold text-sm shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isCreateMode ? (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>방 생성 후 입장</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>방 입장하기</span>
                  </>
                )}
              </button>

              <button
                onClick={onCancel}
                className="w-full bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 py-2.5 px-6 rounded-xl transition-all font-medium text-sm border border-slate-600/50 hover:border-slate-600"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed 위치 드롭다운들 */}
      {showVideoDevices && (
        <div
          ref={videoDropdownRef}
          className="fixed w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl max-h-48 overflow-y-auto scrollbar-custom z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          {videoDevices.map((device) => (
            <button
              key={device.deviceId}
              onClick={() => handleVideoDeviceChange(device.deviceId)}
              className={`w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors text-sm ${selectedVideoDevice === device.deviceId
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-300'
                } first:rounded-t-xl last:rounded-b-xl`}
            >
              {cleanDeviceName(device.label) || '카메라'}
            </button>
          ))}
        </div>
      )}

      {showAudioInputDevices && (
        <div
          ref={audioDropdownRef}
          className="fixed w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl max-h-48 overflow-y-auto scrollbar-custom z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          {audioInputDevices.map((device) => (
            <button
              key={device.deviceId}
              onClick={() => handleAudioInputDeviceChange(device.deviceId)}
              className={`w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors text-sm ${selectedAudioInput === device.deviceId
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-300'
                } first:rounded-t-xl last:rounded-b-xl`}
            >
              {cleanDeviceName(device.label) || '마이크'}
            </button>
          ))}
        </div>
      )}

      {showAudioOutputDevices && (
        <div
          ref={speakerDropdownRef}
          className="fixed w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl max-h-48 overflow-y-auto scrollbar-custom z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          {audioOutputDevices.map((device) => (
            <button
              key={device.deviceId}
              onClick={() => handleAudioOutputDeviceChange(device.deviceId)}
              className={`w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors text-sm ${selectedAudioOutput === device.deviceId
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-300'
                } first:rounded-t-xl last:rounded-b-xl`}
            >
              {cleanDeviceName(device.label) || '스피커'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WaitingRoom;