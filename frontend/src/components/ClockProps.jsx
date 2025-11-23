import React, { useEffect, useState } from "react";

function getTimeAngles(date) {
  const sec = date.getSeconds();
  const min = date.getMinutes();
  const hour = date.getHours() % 12;
  return {
    sec: (sec / 60) * 360,
    min: (min / 60) * 360 + (sec / 60) * 6,
    hour: (hour / 12) * 360 + (min / 60) * 30,
  };
}

const ClockProps = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const { sec, min, hour } = getTimeAngles(now);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg viewBox="0 0 200 200" className="w-48 h-48">
        <circle cx="100" cy="100" r="90" stroke="#333" strokeWidth="4" fill="none" />
        {/* Hour hand */}
        <line
          x1="100"
          y1="100"
          x2={100 + 40 * Math.sin((Math.PI * hour) / 180)}
          y2={100 - 40 * Math.cos((Math.PI * hour) / 180)}
          stroke="#333"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Minute hand */}
        <line
          x1="100"
          y1="100"
          x2={100 + 60 * Math.sin((Math.PI * min) / 180)}
          y2={100 - 60 * Math.cos((Math.PI * min) / 180)}
          stroke="#444"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Second hand */}
        <line
          x1="100"
          y1="100"
          x2={100 + 70 * Math.sin((Math.PI * sec) / 180)}
          y2={100 - 70 * Math.cos((Math.PI * sec) / 180)}
          stroke="red"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill="#333" />
      </svg>
    </div>
  );
};

export default ClockProps;
  
  
  