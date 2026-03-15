import React from 'react';
import { useLocation } from 'react-router-dom';

interface PageTurnProps {
  children: React.ReactNode;
}

const PageTurn: React.FC<PageTurnProps> = ({ children }) => {
  const location = useLocation();

  const animationKey = location.key || location.pathname;

  return (
    <div className="page-turn-wrapper">
      <div key={animationKey} className="page-turn-sheet">
        {children}
      </div>
    </div>
  );
};

export default PageTurn;
