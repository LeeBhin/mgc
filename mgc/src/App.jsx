import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import JoinScreen from './pages/JoinScreen';
import RoomPage from './pages/RoomPage';
import NotFoundPage from './pages/NotFoundPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<JoinScreen />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
};

export default App;