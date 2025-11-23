import React, { useState, useEffect, useMemo } from 'react'
import * as Yup from "yup"
import { FaUser, FaLock, FaEye, FaEyeSlash, FaGraduationCap } from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'
import BasicForm from '../../components/BasicForm'
import CustomTextField from '../../components/CustomTextField'
import CustomButton from '../../components/CustomButton'
import { login } from '../../api/auth'
import teacherSidebarSections from '../dashboard/teacherDashboard/TeacherDashboardSidebar';

export default function LoginPage() {
  
  const [rememberMe, setRememberMe] = useState(false)
  const [backendError, setBackendError] = useState("");
  const [rememberedUser, setRememberedUser] = useState("");
  const [appLang, setAppLang] = useState(localStorage.getItem('appLang') || 'en');
  const navigate = useNavigate();
  const translations = {
    en: {
      pleaseLogin: 'Please Login to Continue',
      userIdLabel: 'User ID',
      passwordLabel: 'Password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      signIn: 'Sign In',
      newStudentRegister: 'New Student? Register Here',
      userIdRequired: 'User ID is required',
      userIdMin: 'User ID must be at least 3 characters',
      userIdMax: 'User ID must not exceed 20 characters',
      passwordRequired: 'Password is required',
      passwordMin: 'Password must be at least 6 characters',
      passwordPattern: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    },
    si: {
      pleaseLogin: 'ඇතුල් වීමට කරුණාකර පිවිසෙන්න',
      userIdLabel: 'පරිශීලක හැඳුනුම් අංකය',
      passwordLabel: 'මුරපදය',
      rememberMe: 'මාව මතක තබා ගන්න',
      forgotPassword: 'මුරපදය අමතින් ද?',
      signIn: 'පිවිසෙන්න',
      newStudentRegister: 'නව ශිෂ්‍යයෙක්? මෙතැනින් ලියාපදිංචි වන්න',
      userIdRequired: 'පරිශීලක හැඳුනුම් අංකය අවශ්යයි',
      userIdMin: 'පරිශීලක හැඳුනුම් අංකය අක්ෂර 3 කට අඩු නොවිය යුතුය',
      userIdMax: 'පරිශීලක හැඳුනුම් අංකය අක්ෂර 20 ක් ඉක්මවා නැහැ',
      passwordRequired: 'මුරපදය අවශ්යයි',
      passwordMin: 'මුරපදය අවම වශයෙන් අක්ෂර 6 ක් තිබිය යුතුය',
      passwordPattern: 'මුරපදය විශාල, කුඩා අකුරු සහ සංඛ්‍යාත්මක අක්ෂරයක් අඩංගු විය යුතුය'
    }
  }

  const t = (key) => (translations[appLang] && translations[appLang][key]) || translations.en[key] || key;

  const LoginSchema = useMemo(() => {
    return Yup.object().shape({
      userID: Yup.string()
        .required(t('userIdRequired'))
        .min(3, t('userIdMin'))
        .max(20, t('userIdMax')),
      password: Yup.string()
        .required(t('passwordRequired'))
        .min(6, t('passwordMin'))
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          t('passwordPattern')
        )           
    })
  }, [appLang])

  const handleLogin = async (values) => {
    setBackendError("");
    
    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('rememberedUser', values.userID);
      // Use sessionStorage for tokens when remember me is false
      sessionStorage.setItem('usePersistentStorage', 'true');
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('rememberedUser');
      sessionStorage.removeItem('usePersistentStorage');
    }

    try {
      console.log("Attempting login with:", { userid: values.userID, password: values.password });
      const data = await login({ userid: values.userID, password: values.password });
      
      // Check if login was successful
      if (data.success) {
        // Handle successful login
        console.log("Login successful:", data);
        console.log("User data:", data.user);
        console.log("User role:", data.user?.role);
        
        // Store tokens and user data based on remember me preference
        if (data.accessToken) {
          if (rememberMe) {
            // Store in localStorage for persistent login
            localStorage.setItem('authToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('userData', JSON.stringify(data.user));
            localStorage.setItem('tokenExpiry', new Date(Date.now() + 15 * 60 * 1000).toISOString()); // 15 minutes
          } else {
            // Store in sessionStorage for session-only login
            sessionStorage.setItem('authToken', data.accessToken);
            sessionStorage.setItem('refreshToken', data.refreshToken);
            sessionStorage.setItem('userData', JSON.stringify(data.user));
            sessionStorage.setItem('tokenExpiry', new Date(Date.now() + 15 * 60 * 1000).toISOString()); // 15 minutes
          }
        }
        
        // Redirect based on user role
        if (data.user && data.user.role) {
          console.log("User role:", data.user.role);
          const role = data.user.role.toLowerCase();
          // Helper for teacher_staff: pick the first sidebar item the staff has permission to view
          // Only consider items that explicitly declare a string `requiredPermission`.
          const getTeacherStaffLanding = (user) => {
            const perms = user.permissions || {};
            // iterate sidebar sections & items in order and pick the first allowed
            for (const section of teacherSidebarSections) {
              if (!section.items) continue;
              for (const item of section.items) {
                const required = item.requiredPermission;
                if (required && typeof required === 'string') {
                  if (perms[required]) return item.path;
                }
                // skip items that don't declare requiredPermission (these are teacher/admin-only)
              }
            }

            // fallback to teacher dashboard
            return '/teacherdashboard';
          };

          switch (role) {
            case 'admin':
              console.log("Redirecting to admin dashboard");
              navigate('/admindashboard');
              break;
            case 'teacher':
              console.log("Redirecting to teacher dashboard");
              navigate('/teacherdashboard');
              break;
            case 'teacher_staff':
              console.log("Redirecting teacher staff to teacher dashboard (minimal view)");
              // Pass a flag so the dashboard can show the minimal name/id view on initial landing
              navigate('/teacherdashboard', { state: { minimalView: true } });
              break;
            case 'student':
              console.log("Redirecting to student dashboard");
              navigate('/studentdashboard');
              break;
            case 'cashier':
              console.log("Redirecting to cashier dashboard");
              navigate('/cashierdashboard');
              break;
            default:
              console.log("Unknown role, redirecting to default dashboard");
              navigate('/dashboard');
          }
        } else {
          console.log("No user role found, redirecting to default dashboard");
          navigate('/dashboard');
        }
      } else {
        // Login failed but didn't throw an error (backend returned success: false)
        console.log("Login failed:", data.message);
        setBackendError(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      // Handle network errors or other exceptions
      console.log("Login error:", error);
      setBackendError(error.message || "Login failed. Please check your credentials.");
  }
  }

  // Check for remembered user and auto-login on component mount
  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    const rememberMePreference = localStorage.getItem('rememberMe');
    const usePersistentStorage = sessionStorage.getItem('usePersistentStorage');
    
    // Set remembered user and checkbox state regardless of tokens
    if (rememberedUser && rememberMePreference === 'true') {
      setRememberMe(true);
      setRememberedUser(rememberedUser);
      
      // Check if we have valid tokens for auto-login
      const authToken = localStorage.getItem('authToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const userData = localStorage.getItem('userData');
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      
      if (authToken && refreshToken && userData && tokenExpiry) {
        const expiryTime = new Date(tokenExpiry).getTime();
        const currentTime = Date.now();
        
        // If token is still valid (with 5 minute buffer), auto-login
        if (currentTime < expiryTime - (5 * 60 * 1000)) {
          try {
            const user = JSON.parse(userData);
            console.log("Auto-login with remembered user:", user);
            
            // Redirect based on user role
            const role = user.role ? user.role.toLowerCase() : '';
            const getTeacherStaffLandingAuto = (user) => {
              const perms = user.permissions || {};
              for (const section of teacherSidebarSections) {
                if (!section.items) continue;
                for (const item of section.items) {
                  const required = item.requiredPermission;
                  if (required && typeof required === 'string') {
                    if (perms[required]) return item.path;
                  } else {
                    return item.path;
                  }
                }
              }
              return '/teacherdashboard';
            };

            switch (role) {
              case 'admin':
                navigate('/admindashboard');
                break;
              case 'teacher':
                navigate('/teacherdashboard');
                break;
      case 'teacher_staff':
        // Always land on the teacher dashboard so staff can see their name/id
        // and navigate to permitted pages via the sidebar. Pass a flag so the
        // dashboard knows this is the initial login landing and can show the
        // minimal view.
        navigate('/teacherdashboard', { state: { minimalView: true } });
        break;
              case 'student':
                navigate('/studentdashboard');
                break;
              case 'cashier':
                navigate('/cashierdashboard');
                break;
              default:
                navigate('/dashboard');
            }
          } catch (error) {
            console.log("Error parsing remembered user data:", error);
            // Clear invalid data
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('tokenExpiry');
          }
        } else {
          console.log("Remembered token expired, user needs to login again");
          // Clear expired tokens but keep remembered user
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('tokenExpiry');
        }
      } else {
        console.log("No valid tokens found, but remembered user exists");
        // User is remembered but needs to login again
      }
    } else if (usePersistentStorage === 'true') {
      // Check sessionStorage for session-only login
      const authToken = sessionStorage.getItem('authToken');
      const refreshToken = sessionStorage.getItem('refreshToken');
      const userData = sessionStorage.getItem('userData');
      const tokenExpiry = sessionStorage.getItem('tokenExpiry');
      
      if (authToken && refreshToken && userData && tokenExpiry) {
        const expiryTime = new Date(tokenExpiry).getTime();
        const currentTime = Date.now();
        
        if (currentTime < expiryTime - (5 * 60 * 1000)) {
          try {
            const user = JSON.parse(userData);
            console.log("Auto-login with session user:", user);
            
            // Redirect session user similarly and handle teacher_staff
            const role2 = (user.role || '').toLowerCase();
            const getTeacherStaffLandingSession = (user) => {
              const perms = user.permissions || {};
              for (const section of teacherSidebarSections) {
                if (!section.items) continue;
                for (const item of section.items) {
                  const required = item.requiredPermission;
                  if (required && typeof required === 'string') {
                    if (perms[required]) return item.path;
                  } else {
                    return item.path;
                  }
                }
              }
              return '/teacherdashboard';
            };

            switch (role2) {
              case 'admin':
                navigate('/admindashboard');
                break;
              case 'teacher':
                navigate('/teacherdashboard');
                break;
              case 'teacher_staff':
                // Always land on the teacher dashboard for session auto-login as well.
                // Provide the minimalView flag so the dashboard shows only name/id on first load.
                navigate('/teacherdashboard', { state: { minimalView: true } });
                break;
              case 'student':
                navigate('/studentdashboard');
                break;
              case 'cashier':
                navigate('/cashierdashboard');
                break;
              default:
                navigate('/dashboard');
            }
          } catch (error) {
            console.log("Error parsing session user data:", error);
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('userData');
            sessionStorage.removeItem('tokenExpiry');
          }
        }
      }
    } else {
      // No remembered user or session, check if there are any stored credentials
      const rememberedUser = localStorage.getItem('rememberedUser');
      if (rememberedUser) {
        setRememberedUser(rememberedUser);
        setRememberMe(true);
      }
    }
  }, [navigate]);

  // update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('appLang', appLang);
  }, [appLang]);

  return (
    <div className='w-full flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      {/* Language selector (top-right) */}
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
            {t('pleaseLogin')}
          </span>
        </div>
        <BasicForm
          key={rememberedUser} // Force re-render when remembered user changes
          initialValues={{
            userID: rememberedUser || "",
            password: "" 
          }} 
          validationSchema={LoginSchema}
          onSubmit={handleLogin}
      >
          {({ errors, touched, handleChange, values }) => (
            <>
              <CustomTextField
                id='userID'
                name='userID'
              type='text'
                label={`${t('userIdLabel')} *`}
              value={values.userID}
                onChange={handleChange}
                error={errors.userID}
                touched={touched.userID}
                icon={FaUser}
              />

              <CustomTextField
                id='password'
                name='password'
                type='password'
                label={`${t('passwordLabel')} *`}
                value={values.password}
                onChange={handleChange}
                error={errors.password}
                touched={touched.password}
                icon={FaLock}
                isPassword
              />
               <div className='flex items-center justify-between'>
                <label className='flex items-center space-x-2 cursor-pointer group'>
                  <div className='relative'>
            <input
                    type='checkbox'
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                      className='form-checkbox h-4 w-4 text-[#064e3b] rounded border-gray-300 focus:ring-[#064e3b] focus:ring-2 focus:ring-offset-2 transition-all duration-200'
                  />
                    {rememberMe && (
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className='text-[#1a365d] text-sm font-medium group-hover:text-[#064e3b] transition-colors duration-200'>
                    {t('rememberMe')}
                  </span>
                </label>
                <button
                  type='button'
                  onClick={() => navigate('/forgotpassword')}
                  className='text-sm text-[#064e3b] hover:text-[#1a365d] hover:underline transition-all duration-200 font-medium'
                >
                  {t('forgotPassword')}
                </button>
              </div>

              {backendError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                  {backendError}
                </div>
              )}

              <CustomButton type='submit'>{t('signIn')}</CustomButton>

              <div className='flex flex-col items-center mt-6 space-y-3 text-xs text-[#1a365d]'>
                
                <div className='flex space-x-4'>
                   
                </div>
                <Link to="/register" className='text-[#064e3b] hover:underline'>{t('newStudentRegister')}</Link>
              </div>
            </>
        )}
        </BasicForm>
      </div> 
    </div>
  )
}
