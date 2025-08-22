import React, { useState, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Headphones, HeadphoneOff, ChevronDown } from 'lucide-react';

/**
 * 컨트롤 바 컴포넌트
 * - 비디오/오디오/헤드셋 토글 버튼
 * - 장치 선택 드롭다운 메뉴
 * - 강제 제어 상태 표시 (빨간색)
 * - 반응형 디자인 지원
 */
const ControlBar = ({
  isVideoOn = false,
  isAudioOn = false,
  isHeadsetOn = true,
  onToggleVideo = () => { },
  onToggleAudio = () => { },
  onToggleHeadset = () => { },
  onDeviceChange = () => { },
  isVideoForcedOff = false,
  isAudioForcedOff = false,
  isHeadsetForcedOff = false
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

  // 컴포넌트 마운트 시 장치 목록 가져오기
  useEffect(() => {
    getDevices();
  }, []);

  // 외부 클릭 감지로 selectbox 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.device-select-container')) {
        setShowVideoDevices(false);
        setShowAudioInputDevices(false);
        setShowAudioOutputDevices(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 장치 목록 가져오기
  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
      
      setVideoDevices(videoInputs);
      setAudioInputDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);
      
      // 기본 장치 설정
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

  // 장치명 정리 함수
  const cleanDeviceName = (name) => {
    return name.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i, '').trim();
  };

  // 비디오 장치 변경
  const handleVideoDeviceChange = async (deviceId) => {
    setSelectedVideoDevice(deviceId);
    setShowVideoDevices(false);
    
    if (onDeviceChange) {
      onDeviceChange('video', deviceId);
    }
  };

  // 오디오 입력 장치 변경
  const handleAudioInputDeviceChange = async (deviceId) => {
    setSelectedAudioInput(deviceId);
    setShowAudioInputDevices(false);
    
    if (onDeviceChange) {
      onDeviceChange('audioInput', deviceId);
    }
  };

  // 스피커 장치 변경
  const handleAudioOutputDeviceChange = async (deviceId) => {
    setSelectedAudioOutput(deviceId);
    setShowAudioOutputDevices(false);
    
    if (onDeviceChange) {
      onDeviceChange('audioOutput', deviceId);
    }
  };

  // selectbox 토글 함수들
  const toggleVideoDevices = () => {
    setShowVideoDevices(!showVideoDevices);
    setShowAudioInputDevices(false);
    setShowAudioOutputDevices(false);
  };

  const toggleAudioInputDevices = () => {
    setShowAudioInputDevices(!showAudioInputDevices);
    setShowVideoDevices(false);
    setShowAudioOutputDevices(false);
  };

  const toggleAudioOutputDevices = () => {
    setShowAudioOutputDevices(!showAudioOutputDevices);
    setShowVideoDevices(false);
    setShowAudioInputDevices(false);
  };

  return (
    <div className="bg-slate-800/95 backdrop-blur-xl border-t border-slate-700/50 p-4">
      <div className="flex items-center justify-center space-x-3 sm:space-x-4">
        {/* 비디오 토글 버튼 그룹 */}
        <div className="device-select-container relative">
          <div className="flex">
            <button
              onClick={onToggleVideo}
              disabled={isVideoForcedOff}
              className={`p-3 sm:p-4 rounded-l-xl sm:rounded-l-2xl transition-colors ${
                isVideoOn && !isVideoForcedOff
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : isVideoForcedOff
                    ? 'bg-red-900/50 text-red-400 cursor-not-allowed'
                    : 'bg-slate-900/50 hover:bg-slate-900/70 text-red-400'
              } border-r border-slate-600/50`}
              title={isVideoForcedOff ? '방장에 의해 비활성화됨' : isVideoOn ? '비디오 끄기' : '비디오 켜기'}
            >
              {isVideoOn && !isVideoForcedOff ? <Video className="h-5 w-5 sm:h-6 sm:w-6" /> : <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
            <button
              onClick={toggleVideoDevices}
              disabled={isVideoForcedOff}
              className={`p-2 sm:p-3 rounded-r-xl sm:rounded-r-2xl transition-colors ${
                isVideoOn && !isVideoForcedOff
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : isVideoForcedOff
                    ? 'bg-red-900/50 text-red-400 cursor-not-allowed'
                    : 'bg-slate-900/50 hover:bg-slate-900/70 text-red-400'
              }`}
              title={isVideoForcedOff ? '방장에 의해 비활성화됨' : '카메라 선택'}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          
          {/* 비디오 장치 선택 드롭다운 */}
          {showVideoDevices && !isVideoForcedOff && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl max-h-48 overflow-y-auto scrollbar-custom z-[60]">
              {videoDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleVideoDeviceChange(device.deviceId)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors text-sm ${
                    selectedVideoDevice === device.deviceId
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-300'
                  } first:rounded-t-xl last:rounded-b-xl`}
                >
                  {cleanDeviceName(device.label) || '카메라'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 마이크 토글 버튼 그룹 */}
        <div className="device-select-container relative">
          <div className="flex">
            <button
              onClick={onToggleAudio}
              disabled={!isHeadsetOn || isAudioForcedOff || isHeadsetForcedOff}
              className={`p-3 sm:p-4 rounded-l-xl sm:rounded-l-2xl transition-colors ${
                (!isHeadsetOn || !isAudioOn || isAudioForcedOff || isHeadsetForcedOff)
                  ? (isAudioForcedOff || isHeadsetForcedOff) 
                    ? 'bg-red-900/50 text-red-400 cursor-not-allowed'
                    : 'bg-slate-900/50 hover:bg-slate-900/70 text-red-400'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              } ${(!isHeadsetOn || isHeadsetForcedOff) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} border-r border-slate-600/50`}
              title={
                isAudioForcedOff ? '방장에 의해 마이크가 비활성화됨' :
                isHeadsetForcedOff ? '방장에 의해 헤드셋이 비활성화됨' :
                !isHeadsetOn ? '헤드셋을 먼저 켜주세요' : 
                isAudioOn ? '마이크 끄기' : '마이크 켜기'
              }
            >
              {isAudioOn && isHeadsetOn && !isAudioForcedOff && !isHeadsetForcedOff ? <Mic className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
            <button
              onClick={toggleAudioInputDevices}
              disabled={!isHeadsetOn || isAudioForcedOff || isHeadsetForcedOff}
              className={`p-2 sm:p-3 rounded-r-xl sm:rounded-r-2xl transition-colors ${
                (!isHeadsetOn || !isAudioOn || isAudioForcedOff || isHeadsetForcedOff)
                  ? (isAudioForcedOff || isHeadsetForcedOff) 
                    ? 'bg-red-900/50 text-red-400 cursor-not-allowed'
                    : 'bg-slate-900/50 hover:bg-slate-900/70 text-red-400'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              } ${(!isHeadsetOn || isHeadsetForcedOff) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
              title={isHeadsetForcedOff ? '방장에 의해 헤드셋이 비활성화됨' : '마이크 선택'}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          
          {/* 마이크 장치 선택 드롭다운 */}
          {showAudioInputDevices && isHeadsetOn && !isAudioForcedOff && !isHeadsetForcedOff && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl max-h-48 overflow-y-auto scrollbar-custom z-[60]">
              {audioInputDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleAudioInputDeviceChange(device.deviceId)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors text-sm ${
                    selectedAudioInput === device.deviceId
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-300'
                  } first:rounded-t-xl last:rounded-b-xl`}
                >
                  {cleanDeviceName(device.label) || '마이크'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 헤드셋/스피커 토글 버튼 그룹 - 강제 제어 상태 표시 개선 */}
        <div className="device-select-container relative">
          <div className="flex">
            <button
              onClick={onToggleHeadset}
              disabled={isHeadsetForcedOff}
              className={`p-3 sm:p-4 rounded-l-xl sm:rounded-l-2xl transition-colors ${
                isHeadsetOn && !isHeadsetForcedOff
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : isHeadsetForcedOff
                    ? 'bg-red-900/50 text-red-400 cursor-not-allowed'
                    : 'bg-slate-900/50 hover:bg-slate-900/70 text-red-400'
              } border-r border-slate-600/50`}
              title={isHeadsetForcedOff ? '방장에 의해 헤드셋이 비활성화됨' : isHeadsetOn ? '헤드셋 끄기 (듣기/말하기 차단)' : '헤드셋 켜기'}
            >
              {isHeadsetOn && !isHeadsetForcedOff ? <Headphones className="h-5 w-5 sm:h-6 sm:w-6" /> : <HeadphoneOff className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
            <button
              onClick={toggleAudioOutputDevices}
              disabled={isHeadsetForcedOff}
              className={`p-2 sm:p-3 rounded-r-xl sm:rounded-r-2xl transition-colors ${
                isHeadsetOn && !isHeadsetForcedOff
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : isHeadsetForcedOff
                    ? 'bg-red-900/50 text-red-400 cursor-not-allowed'
                    : 'bg-slate-900/50 hover:bg-slate-900/70 text-red-400'
              }`}
              title={isHeadsetForcedOff ? '방장에 의해 헤드셋이 비활성화됨' : '스피커 선택'}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          
          {/* 스피커 장치 선택 드롭다운 */}
          {showAudioOutputDevices && isHeadsetOn && !isHeadsetForcedOff && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl max-h-48 overflow-y-auto scrollbar-custom z-[60]">
              {audioOutputDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleAudioOutputDeviceChange(device.deviceId)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors text-sm ${
                    selectedAudioOutput === device.deviceId
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
      </div>
    </div>
  );
};

export default ControlBar;