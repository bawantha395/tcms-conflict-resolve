import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as Yup from 'yup';
import CustomTextField from '../../components/CustomTextField';
import CustomButton from '../../components/CustomButton';
import BasicForm from '../../components/BasicForm';
import { FaPhone, FaLock, FaGraduationCap, FaKey, FaRedo } from 'react-icons/fa';
import { forgotPasswordRequestOtp, resetPassword } from '../../api/auth';

const useridSchema = Yup.object().shape({
  userid: Yup.string()
    .required('User ID is required')
    .min(2, 'User ID must be at least 2 characters')
    .max(20, 'User ID must be less than 20 characters'),
});

const otpSchema = Yup.object().shape({
  otp: Yup.string()
    .required('OTP is required')
    .matches(/^[0-9]{6}$/, 'OTP must be 6 digits'),
  password: Yup.string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .matches(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .matches(/^(?=.*\d)/, 'Password must contain at least one number')
    .matches(/^(?=.*[@$!%*?&])/, 'Password must contain at least one special character (@$!%*?&)'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords do not match')
    .required('Confirm password is required'),
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [userid, setUserid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // OTP resend functionality
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCountdown]);

  const handleSendOtp = async (values) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await forgotPasswordRequestOtp(values.userid);
      console.log('OTP response:', response);
      
      if (response.success) {
        // Log OTP sent for forgot password
        console.log('🔐 FORGOT PASSWORD OTP SENT:', {
          userid: values.userid,
          otp: response.otp,
          timestamp: new Date().toLocaleString(),
          message: 'OTP sent successfully for password reset'
        });
        
        setUserid(values.userid);
        setSuccess('OTP sent successfully! Check your phone for the code.');
        setStep(2);
        // Start countdown timer (60 seconds)
        setResendCountdown(60);
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      setError(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await forgotPasswordRequestOtp(userid);
      console.log('OTP resend response:', response);
      
      if (response.success) {
        // Log OTP resent for forgot password
        console.log('🔄 FORGOT PASSWORD OTP RESENT:', {
          userid: userid,
          otp: response.otp,
          timestamp: new Date().toLocaleString(),
          message: 'OTP resent successfully for password reset'
        });
        
        setSuccess('OTP resent successfully! Check your phone for the new code.');
        // Start countdown timer (60 seconds)
        setResendCountdown(60);
      } else {
        setError(response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setError(error.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleReset = async (values) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await resetPassword(userid, values.otp, values.password);
      
      if (response.success) {
        // Log password reset success
        console.log('✅ PASSWORD RESET SUCCESS:', {
          userid: userid,
          timestamp: new Date().toLocaleString(),
          message: 'Password reset successfully'
        });
        
        setSuccess('Password reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (error) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className='max-w-md w-full flex flex-col p-8 items-center'>
        <div className='app-log flex flex-col justify-center items-center mb-8'>
          <div className='w-12 h-12 rounded-full bg-[#3da58a] flex items-center justify-center mb-3 shadow-xl backdrop-blur-sm'>
            <FaGraduationCap className='text-white text-2xl' />
          </div>
          <span className='text-2xl font-bold text-[#1a365d] mb-1'>
            TCMS
          </span>
          <span className='text-sm text-[#1a365d] font-medium'>
            Forgot Password
          </span>
        </div>
        <div className="w-full max-w-md">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}
          {step === 1 && (
            <BasicForm
              initialValues={{ userid: '' }}
              validationSchema={useridSchema}
              onSubmit={handleSendOtp}
            >
              {({ errors, touched, handleChange, values }) => (
                <>
                  <CustomTextField
                    id="userid"
                    name="userid"
                    type="text"
                    label="User ID *"
                    value={values.userid}
                    onChange={handleChange}
                    error={errors.userid}
                    touched={touched.userid}
                    icon={FaGraduationCap}
                    placeholder="Enter your User ID (e.g., S001, T001)"
                  />
                  <CustomButton type="submit" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </CustomButton>
                </>
              )}
            </BasicForm>
          )}
          {step === 2 && (
            <BasicForm
              initialValues={{ otp: '', password: '', confirmPassword: '' }}
              validationSchema={otpSchema}
              onSubmit={handleReset}
            >
              {({ errors, touched, handleChange, values }) => (
                <>
                  <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded text-sm">
                    OTP sent to user: {userid}
                  </div>
                  <CustomTextField
                    id="otp"
                    name="otp"
                    type="text"
                    label="OTP *"
                    value={values.otp}
                    onChange={handleChange}
                    error={errors.otp}
                    touched={touched.otp}
                    icon={FaKey}
                  />
                  
                  {/* Resend OTP Button */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-600">
                      Didn't receive the code?
                    </div>
                    {resendCountdown > 0 ? (
                      <div className="text-sm text-gray-500">
                        Resend in {resendCountdown}s
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendLoading}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                          resendLoading
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        <FaRedo className={`text-xs ${resendLoading ? 'animate-spin' : ''}`} />
                        {resendLoading ? 'Sending...' : 'Resend OTP'}
                      </button>
                    )}
                  </div>
                  
                  <CustomTextField
                    id="password"
                    name="password"
                    type="password"
                    label="New Password *"
                    value={values.password}
                    onChange={handleChange}
                    error={errors.password}
                    touched={touched.password}
                    isPassword
                    icon={FaLock}
                  />
                  
                  {/* Password Requirements */}
                  <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 border border-blue-200">
                    <p className="font-semibold mb-1">Password Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>At least 8 characters long</li>
                      <li>At least one lowercase letter (a-z)</li>
                      <li>At least one uppercase letter (A-Z)</li>
                      <li>At least one number (0-9)</li>
                      <li>At least one special character (@$!%*?&)</li>
                    </ul>
                  </div>
                  
                  <CustomTextField
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label="Confirm New Password *"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    touched={touched.confirmPassword}
                    isPassword
                    icon={FaLock}
                  />
                  <CustomButton type="submit" disabled={loading}>
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                  </CustomButton>
                </>
              )}
            </BasicForm>
          )}
          <Link to="/login" className="mt-8 text-[#064e3b] hover:underline text-xs block text-center">Back to login</Link>
        </div>
      </div>
    </div>
  );
} 