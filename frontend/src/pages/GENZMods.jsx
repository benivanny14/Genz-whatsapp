import React from 'react';
import { useNavigate } from 'react-router-dom';
import GENZSettings from '../components/GENZSettings';
import { useChat } from '../context/ChatContext';

const GENZMods = () => {
  const navigate = useNavigate();
  const { mods, setMods } = useChat();

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
      <GENZSettings 
        close={() => navigate(-1)} 
        mods={mods} 
        setMods={setMods} 
      />
    </div>
  );
};

export default GENZMods;
