import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Code2 } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">

        {/* 심플한 404 */}
        <div className="mb-12">
          <h2 className="text-8xl font-black text-slate-700 mb-4">404</h2>
          <p className="text-xl text-slate-300 mb-2">페이지를 찾을 수 없어요</p>
          <p className="text-slate-500 text-sm">
            입력하신 주소가 올바르지 않거나 페이지가 이동했을 수 있습니다.
          </p>
        </div>

        {/* 간단한 액션 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            <span>홈으로 가기</span>
          </button>

          <button
            onClick={handleGoBack}
            className="w-full bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 py-2.5 px-6 rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>뒤로 가기</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;