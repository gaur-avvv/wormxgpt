import React, { useState, useEffect } from 'react';

const dotColors = ['#ff4444', '#ff5555', '#ff00aa', '#ff22ff'];
const textColors = ['#ff4444', '#ff5555', '#ff3333', '#ff6666'];

interface DynamicStatusIndicatorsProps {
  sessionCount: number;
  messageCount: number;
  sessionTitle: string;
  isStreaming: boolean;
  model: string;
}

export const DynamicStatusIndicators: React.FC<DynamicStatusIndicatorsProps> = ({ 
  sessionCount, messageCount, isStreaming 
}) => {
  const [uptime, setUptime] = useState(0);
  const [dataTransferred, setDataTransferred] = useState(0);

  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(uptimeInterval);
  }, []);

  useEffect(() => {
    setDataTransferred(messageCount * 2.4);
  }, [messageCount]);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h${mins}m`;
    if (mins > 0) return `${mins}m${secs}s`;
    return `${secs}s`;
  };

  const statuses = [
    { text: `SESSIONS_${sessionCount}`, dotColor: dotColors[0], textColor: textColors[0] },
    { text: `MSG_COUNT_${messageCount}`, dotColor: dotColors[1], textColor: textColors[1] },
    { text: isStreaming ? 'STREAM_ACTIVE' : `UPTIME_${formatUptime(uptime)}`, dotColor: isStreaming ? '#ffaa00' : dotColors[2], textColor: textColors[2] },
    { text: `DATA_${dataTransferred.toFixed(1)}KB`, dotColor: dotColors[3], textColor: textColors[3] },
  ];

  return (
    <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest">
      {statuses.map((status, i) => (
        <span
          key={i}
          className="flex items-center gap-1.5 transition-all duration-500 hover:scale-105 cursor-default"
          style={{
            color: status.textColor,
            textShadow: `0 0 3px ${status.textColor}80`,
            animation: `redNeonPulse ${4 + (i * 0.5)}s ease-in-out infinite`
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.dotColor, boxShadow: `0 0 4px ${status.dotColor}` }}></span>
          {status.text}
        </span>
      ))}
      <style>{`
        @keyframes redNeonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};
