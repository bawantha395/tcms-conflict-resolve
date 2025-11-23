import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as Yup from 'yup';
import CustomTextField from '../../components/CustomTextField';
import CustomButton from '../../components/CustomButton';
import BasicForm from '../../components/BasicForm';
import { FaPhone, FaLock, FaGraduationCap, FaKey, FaRedo } from 'react-icons/fa';
import { forgotPasswordRequestOtp, resetPassword } from '../../api/auth';

// schemas will be created inside the component so they can use translations

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [userid, setUserid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appLang, setAppLang] = useState(localStorage.getItem('appLang') || 'en');
  
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

  // persist selected language
  useEffect(() => {
    localStorage.setItem('appLang', appLang);
  }, [appLang]);

  const translations = {
    en: {
      title: 'Forgot Password',
      userIdLabel: 'User ID *',
      placeholderUserId: 'Enter your User ID (e.g., S001, T001)',
      sendOtp: 'Send OTP',
      sendingOtp: 'Sending OTP...',
      sendOtpSuccess: 'OTP sent successfully! Check your phone for the code.',
      otpLabel: 'OTP *',
      didntReceive: "Didn't receive the code?",
      resendIn: 'Resend in',
      resendOtp: 'Resend OTP',
      sending: 'Sending...',
      newPasswordLabel: 'New Password *',
      confirmPasswordLabel: 'Confirm New Password *',
      passwordRequirementsTitle: 'Password Requirements:',
      passwordReq1: 'At least 8 characters long',
      passwordReq2: 'At least one lowercase letter (a-z)',
      passwordReq3: 'At least one uppercase letter (A-Z)',
      passwordReq4: 'At least one number (0-9)',
      passwordReq5: 'At least one special character (@$!%*?&)',
      resettingPassword: 'Resetting Password...',
      resetPassword: 'Reset Password',
      resetSuccess: 'Password reset successfully!',
      backToLogin: 'Back to login',
      userIdRequired: 'User ID is required',
      userIdMin: 'User ID must be at least 2 characters',
      userIdMax: 'User ID must be less than 20 characters',
      otpRequired: 'OTP is required',
      otpDigits: 'OTP must be 6 digits',
      passwordRequired: 'New password is required',
      passwordMin: 'Password must be at least 8 characters',
      passwordLower: 'Password must contain at least one lowercase letter',
      passwordUpper: 'Password must contain at least one uppercase letter',
      passwordNumber: 'Password must contain at least one number',
      passwordSpecial: 'Password must contain at least one special character (@$!%*?&)',
      confirmPasswordRequired: 'Confirm password is required',
      passwordsNotMatch: 'Passwords do not match',
      resendSuccess: 'OTP resent successfully! Check your phone for the new code.'
    },
    si: {
      title: 'මුරපද අමතක වුණා',
      userIdLabel: 'පරිශීලක හැඳුනුම් අංකය *',
      placeholderUserId: 'ඔබේ පරිශීලක හැඳුනුම් අංකය ඇතුලත් කරන්න (උදා: S001, T001)',
      sendOtp: 'OTP යවන්න',
      sendingOtp: 'OTP යවමින් ...',
      sendOtpSuccess: 'OTP යැවීම සාර්ථකයි! කේතය ලබා ගැනීමට දුරකථනය පරීක්ෂා කරන්න.',
      otpLabel: 'OTP *',
      didntReceive: 'කේතය ලබා ගත නොහැකිද?',
      resendIn: 'නැවත යවයි',
      resendOtp: 'OTP නැවත යවන්න',
      sending: 'යවමින්...',
      newPasswordLabel: 'නව මුරපදය *',
      confirmPasswordLabel: 'නව මුරපදය තහවුරු කරන්න *',
      passwordRequirementsTitle: 'මුරපද අවශ්‍යතා:',
      passwordReq1: 'අවම වශයෙන් අක්ෂර 8 ක්',
      passwordReq2: 'අවම වශයෙන් කුඩා අකුරක් (a-z)',
      passwordReq3: 'අවම වශයෙන් විශාල අකුරක් (A-Z)',
      passwordReq4: 'අවම වශයෙන් එක් අංකයක් (0-9)',
      passwordReq5: 'අවම වශයෙන් එක් විශේෂ චරිතයක් (@$!%*?&)',
      resettingPassword: 'මුරපදය යළි සකස් කිරීම...',
      resetPassword: 'මුරපදය යළි සකසන්න',
      resetSuccess: 'මුරපදය සාර්ථකව යළි සකසා ඇත!',
      backToLogin: 'ආපසු පිවිසුමට',
      userIdRequired: 'පරිශීලක හැඳුනුම් අංකය අවශ්‍යයි',
      userIdMin: 'පරිශීලක හැඳුනුම් අංකය අවම වශයෙන් අක්ෂර 2 ක් තිබිය යුතුය',
      userIdMax: 'පරිශීලක හැඳුනුම් අංකය අක්ෂර 20 ට වඩා අඩු විය යුතුය',
      otpRequired: 'OTP අවශ්‍යයි',
      otpDigits: 'OTP අංක 6 ක් පමණි',
      passwordRequired: 'නව මුරපදය අවශ්‍යයි',
      passwordMin: 'මුරපදය අවම වශයෙන් අක්ෂර 8 ක් තිබිය යුතුය',
      passwordLower: 'මුරපදය අවම වශයෙන් කුඩා අකුරක් තිබිය යුතුය',
      passwordUpper: 'මුරපදය අවම වශයෙන් විශාල අකුරක් තිබිය යුතුය',
      passwordNumber: 'මුරපදය අවම වශයෙන් එක් අංකයක් තිබිය යුතුය',
      passwordSpecial: 'මුරපදය අවම වශයෙන් එක් විශේෂ චරිතයක් (@$!%*?&) තිබිය යුතුය',
      confirmPasswordRequired: 'පුරපදය තහවුරු කිරීම අවශ්‍යයි',
      passwordsNotMatch: 'මුරපද එකිනෙකට නොගැලපේ',
      resendSuccess: 'OTP නැවත යවමින් සාර්ථකයි! නව කේතය සඳහා දුරකථනය පරීක්ෂා කරන්න.'
    }
  };

  const t = (key) => (translations[appLang] && translations[appLang][key]) || translations.en[key] || key;

  const useridSchema = useMemo(() => Yup.object().shape({
    userid: Yup.string()
      .required(t('userIdRequired'))
      .min(2, t('userIdMin'))
      .max(20, t('userIdMax'))
  }), [appLang]);

  const otpSchema = useMemo(() => Yup.object().shape({
    otp: Yup.string()
      .required(t('otpRequired'))
      .matches(/^[0-9]{6}$/, t('otpDigits')),
    password: Yup.string()
      .required(t('passwordRequired'))
      .min(8, t('passwordMin'))
      .matches(/^(?=.*[a-z])/, t('passwordLower'))
      .matches(/^(?=.*[A-Z])/, t('passwordUpper'))
      .matches(/^(?=.*\d)/, t('passwordNumber'))
      .matches(/^(?=.*[@$!%*?&])/, t('passwordSpecial')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], t('passwordsNotMatch'))
      .required(t('confirmPasswordRequired'))
  }), [appLang]);

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
      {/* language selector */}
      <div className='fixed top-4 right-4 z-50'>
        <select
          value={appLang}
          onChange={(e) => setAppLang(e.target.value)}
          className='border rounded px-2 py-1 bg-white text-sm'
          aria-label='Select language'
        >
          <option value='en'>EN</option>
          <option value='si'>සිං</option>
        </select>
      </div>
      <div className='max-w-md w-full flex flex-col p-8 items-center'>
        <div className='app-log flex flex-col justify-center items-center mb-8'>
          <div className='w-12 h-12 rounded-full bg-[#3da58a] flex items-center justify-center mb-3 shadow-xl backdrop-blur-sm'>
            <FaGraduationCap className='text-white text-2xl' />
          </div>
          <span className='text-2xl font-bold text-[#1a365d] mb-1'>
            TCMS
          </span>
          <span className='text-sm text-[#1a365d] font-medium'>
            {t('title')}
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
                    // label={t('userIdLabel')}
                    value={values.userid}
                    onChange={handleChange}
                    error={errors.userid}
                    touched={touched.userid}
                    icon={FaGraduationCap}
                    placeholder={t('placeholderUserId')}
                  />
                  <CustomButton type="submit" disabled={loading}>
                    {loading ? t('sendingOtp') : t('sendOtp')}
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
                    {t('sendOtpSuccess')} OTP sent to user: {userid}
                  </div>
                  <CustomTextField
                    id="otp"
                    name="otp"
                    type="text"
                    label={t('otpLabel')}
                    value={values.otp}
                    onChange={handleChange}
                    error={errors.otp}
                    touched={touched.otp}
                    icon={FaKey}
                  />
                  
                  {/* Resend OTP Button */}
                  <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-600">
                      {t('didntReceive')}
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
                        {resendLoading ? t('sending') : t('resendOtp')}
                      </button>
                    )}
                  </div>
                  
                  <CustomTextField
                    id="password"
                    name="password"
                    type="password"
                    label={t('newPasswordLabel')}
                    value={values.password}
                    onChange={handleChange}
                    error={errors.password}
                    touched={touched.password}
                    isPassword
                    icon={FaLock}
                  />
                  
                  {/* Password Requirements */}
                  <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 border border-blue-200">
                    <p className="font-semibold mb-1">{t('passwordRequirementsTitle')}</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('passwordReq1')}</li>
                      <li>{t('passwordReq2')}</li>
                      <li>{t('passwordReq3')}</li>
                      <li>{t('passwordReq4')}</li>
                      <li>{t('passwordReq5')}</li>
                    </ul>
                  </div>
                  
                  <CustomTextField
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label={t('confirmPasswordLabel')}
                    value={values.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    touched={touched.confirmPassword}
                    isPassword
                    icon={FaLock}
                  />
                  <CustomButton type="submit" disabled={loading}>
                    {loading ? t('resettingPassword') : t('resetPassword')}
                  </CustomButton>
                </>
              )}
            </BasicForm>
          )}
          <Link to="/login" className="mt-8 text-[#064e3b] hover:underline text-xs block text-center">{t('backToLogin')}</Link>
        </div>
      </div>
    </div>
  );
} 