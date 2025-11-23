import React, { useRef, useEffect, useState } from 'react';
import { FaPlay, FaPause, FaStop, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { initializeVideoTracking } from '../api/attendance';
import { getUserData } from '../api/apiUtils';

const VideoAttendancePlayer = ({ 
  videoUrl, 
  videoTitle, 
  classId, 
  onAttendanceUpdate,
  autoPlay = false,
  completionThreshold = 80 
}) => {
  const videoRef = useRef(null);
  const trackingRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState('not_started');
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Get user data
    const user = getUserData();
    setUserData(user);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !userData) return;

    // Initialize video tracking
    trackingRef.current = initializeVideoTracking(video, {
      classId,
      studentId: userData.userid,
      videoUrl,
      videoTitle,
      studentName: `${userData.firstName} ${userData.lastName}`,
      updateInterval: 30000 // Update every 30 seconds
    });

    // Video event listeners
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      if (trackingRef.current) {
        const percentage = trackingRef.current.getWatchPercentage();
        setWatchPercentage(percentage);
        
        // Update attendance status based on watch percentage
        let status = 'not_started';
        if (percentage >= completionThreshold) {
          status = 'completed';
        } else if (percentage >= 50) {
          status = 'in_progress';
        } else if (percentage > 0) {
          status = 'started';
        }
        
        if (status !== attendanceStatus) {
          setAttendanceStatus(status);
          if (onAttendanceUpdate) {
            onAttendanceUpdate({
              status,
              watchPercentage: percentage,
              watchTime: trackingRef.current.getTotalWatchTime()
            });
          }
        }
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (trackingRef.current) {
        trackingRef.current.startTracking();
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAttendanceStatus('completed');
      if (trackingRef.current) {
        trackingRef.current.stopTracking();
      }
    };

    const handleError = (e) => {
      setError('Error loading video: ' + e.message);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Auto play if enabled
    if (autoPlay) {
      video.play().catch(err => {
        console.log('Autoplay prevented:', err);
      });
    }

    // Cleanup
    return () => {
      if (trackingRef.current) {
        trackingRef.current.stopTracking();
      }
      
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl, classId, userData, autoPlay, completionThreshold, attendanceStatus, onAttendanceUpdate]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAttendanceStatusIcon = () => {
    switch (attendanceStatus) {
      case 'completed':
        return <FaCheckCircle className="text-green-600" />;
      case 'in_progress':
        return <FaClock className="text-yellow-600" />;
      case 'started':
        return <FaExclamationTriangle className="text-orange-600" />;
      default:
        return <FaClock className="text-gray-400" />;
    }
  };

  const getAttendanceStatusText = () => {
    switch (attendanceStatus) {
      case 'completed':
        return 'Attendance Marked (Complete)';
      case 'in_progress':
        return 'In Progress';
      case 'started':
        return 'Started';
      default:
        return 'Not Started';
    }
  };

  const getProgressBarColor = () => {
    if (watchPercentage >= completionThreshold) return 'bg-green-500';
    if (watchPercentage >= 50) return 'bg-yellow-500';
    if (watchPercentage > 0) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <FaExclamationTriangle />
          <span>Error loading video: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Player */}
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-auto"
          controls
          preload="metadata"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Attendance Status Overlay */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            {getAttendanceStatusIcon()}
            <span>{getAttendanceStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Video Info and Controls */}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{videoTitle}</h3>
        
        {/* Progress Information */}
        <div className="space-y-3">
          {/* Time Progress */}
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          {/* Watch Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Watch Progress</span>
              <span>{watchPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                style={{ width: `${Math.min(watchPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              Minimum {completionThreshold}% required for attendance
            </div>
          </div>

          {/* Attendance Status */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getAttendanceStatusIcon()}
                <span className="font-medium">{getAttendanceStatusText()}</span>
              </div>
              <div className="text-sm text-gray-600">
                {trackingRef.current ? `${trackingRef.current.getTotalWatchTime()}s watched` : '0s watched'}
              </div>
            </div>
            
            {watchPercentage >= completionThreshold && (
              <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                ✅ Congratulations! You have completed the required viewing time for attendance.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoAttendancePlayer;
