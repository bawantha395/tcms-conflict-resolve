import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as Yup from 'yup';
import CustomTextField from '../../components/CustomTextField';
import CustomButton from '../../components/CustomButton';
import BasicForm from '../../components/BasicForm';
import BasicAlertBox from '../../components/BasicAlertBox';
import { FaUser, FaLock, FaPhone, FaIdCard, FaCalendarAlt, FaVenusMars, FaBarcode, FaDownload, FaWhatsapp } from 'react-icons/fa';
import { FaGraduationCap } from 'react-icons/fa';
import { Formik } from 'formik';
import JsBarcode from 'jsbarcode';
import { register } from '../../api/auth';
import { saveBarcode } from '../../api/auth';
import { forgotPasswordRequestOtp } from '../../api/auth';

// Helper to parse NIC (Sri Lankan)
function parseNIC(nic) {
  let year, month, day, gender;
  let nicStr = nic.toString().toUpperCase();
  if (/^\d{9}[VX]$/.test(nicStr)) {
    year = '19' + nicStr.substring(0, 2);
    let days = parseInt(nicStr.substring(2, 5), 10);
    gender = days > 500 ? 'Female' : 'Male';
    if (days > 500) days -= 500;
    // Days to month/day
    const months = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let m = 0;
    while (days > months[m]) {
      days -= months[m];
      m++;
    }
    month = (m + 1).toString().padStart(2, '0');
    day = days.toString().padStart(2, '0');
  } else if (/^\d{12}$/.test(nicStr)) {
    year = nicStr.substring(0, 4);
    let days = parseInt(nicStr.substring(4, 7), 10);
    gender = days > 500 ? 'Female' : 'Male';
    if (days > 500) days -= 500;
    const months = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let m = 0;
    while (days > months[m]) {
      days -= months[m];
      m++;
    }
    month = (m + 1).toString().padStart(2, '0');
    day = days.toString().padStart(2, '0');
  } else {
    return null;
  }
  const dob = `${year}-${month}-${day}`;
  // Calculate age
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return { dob, gender, age };
}

const nicRegex = /^(\d{12}|\d{9}[VXvx])$/;
const phoneRegex = /^0\d{9}$/;
const genderRegex = /^(male|female)$/i;
const nameRegex = /^[A-Za-z ]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
const allowedStreams = ['A/L-Maths', 'A/L-Science', 'A/L-Art', 'A/L-Technology', 'A/L-Commerce', 'O/L', 'Primary', 'Other'];
const allowedDistricts = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota',
  'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale',
  'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya'
];

const step1Schema = Yup.object().shape({
  firstName: Yup.string()
    .matches(nameRegex, 'First name should only contain letters')
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .matches(nameRegex, 'Last name should only contain letters')
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  idNumber: Yup.string()
    .matches(nicRegex, 'Invalid NIC format (e.g., 199985012023 or 981360737V)')
    .notRequired()
    .nullable(),
  mobile: Yup.string()
    .matches(phoneRegex, 'Invalid phone number (should be 10 digits, start with 0)')
    .required('Mobile number is required'),
  password: Yup.string()
    .matches(passwordRegex, 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords do not match')
    .required('Confirm password is required'),
});

const sriLankaDistricts = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota',
  'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale',
  'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya'
];
const streams = [
  'A/L-Maths', 'A/L-Science', 'A/L-Art', 'A/L-Technology', 'A/L-Commerce', 'O/L', 'Primary', 'Other'
];

export default function NewStudentRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [summaryValues, setSummaryValues] = useState({});
  const [nicInfo, setNicInfo] = useState(null);
  const [step1Values, setStep1Values] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });
  const [editFields, setEditFields] = useState(false);
  const [manualFields, setManualFields] = useState({
    dob: '',
    age: '',
    gender: '',
    email: '',
    school: '',
    stream: '',
    address: '',
    district: '',
    parentName: '',
    parentMobile: '',
  });
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [generatedBarcode, setGeneratedBarcode] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    open: false,
    message: '',
    title: '',
    type: 'info',
    onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
  });

  // WhatsApp verification state
  const [verificationStep, setVerificationStep] = useState('pending'); // pending, sent, verified
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentTime, setOtpSentTime] = useState(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleStep1 = (values) => {
    setStep1Values(values);
    if (values.idNumber && nicRegex.test(values.idNumber)) {
      const parsed = parseNIC(values.idNumber);
      if (parsed) {
        setNicInfo(parsed);
        setManualFields(parsed);
      } else {
        setNicInfo(null);
        setManualFields({ dob: '', age: '', gender: '', email: '', school: '', stream: '', address: '', district: '', parentName: '', parentMobile: '' });
      }
    } else {
      setNicInfo(null);
      setManualFields({ dob: '', age: '', gender: '', email: '', school: '', stream: '', address: '', district: '', parentName: '', parentMobile: '' });
    }
    setStep(2);
  };

  const handleStep2 = (values) => {
    setSummaryValues({ ...step1Values, ...values });
    setStep(3);
  };

  // Send OTP for mobile verification
  const sendOtp = async () => {
    setIsSendingOtp(true);
    try {
      const response = await fetch('http://localhost:8081/routes.php/registration-otp-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile: summaryValues.mobile
        })
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ OTP API returned non-JSON response:', {
          status: response.status,
          statusText: response.statusText,
          contentType: contentType,
          url: response.url
        });
        
        // Try to get the actual response text for debugging
        const responseText = await response.text();
        console.error('Response body:', responseText.substring(0, 500)); // First 500 chars
        
        throw new Error(`Server error: Expected JSON response but got ${contentType || 'unknown type'}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Log OTP to console for development/testing
        console.log('🔐 OTP SENT:', {
          mobile: summaryValues.mobile,
          otp: result.otp,
          timestamp: new Date().toLocaleString(),
          message: 'OTP sent successfully to WhatsApp'
        });
        
        setVerificationStep('sent');
        setOtpSentTime(Date.now());
        setResendCountdown(60); // 60 seconds countdown
        setAlertConfig({
          open: true,
          message: 'OTP sent successfully to your WhatsApp!',
          title: 'OTP Sent',
          type: 'success',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
        });
      } else {
        // Log OTP sending failure
        console.log('❌ OTP SENDING FAILED:', {
          mobile: summaryValues.mobile,
          timestamp: new Date().toLocaleString(),
          error: result.message || 'Failed to send OTP'
        });
        
        setAlertConfig({
          open: true,
          message: result.message || 'Failed to send OTP',
          title: 'OTP Error',
          type: 'danger',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
        });
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      setAlertConfig({
        open: true,
        message: 'Failed to send OTP. Please try again.',
        title: 'OTP Error',
        type: 'danger',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    if (otpCode.length !== 6) {
      setAlertConfig({
        open: true,
        message: 'Please enter a valid 6-digit OTP code.',
        title: 'Invalid OTP',
        type: 'warning',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
      });
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch('http://localhost:8081/routes.php/verify-registration-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile: summaryValues.mobile,
          otp: otpCode
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Log OTP verification success
        console.log('✅ OTP VERIFIED:', {
          mobile: summaryValues.mobile,
          otp: otpCode,
          timestamp: new Date().toLocaleString(),
          message: 'OTP verified successfully'
        });
        
        setVerificationStep('verified');
        setAlertConfig({
          open: true,
          message: 'Mobile number verified successfully!',
          title: 'Verification Success',
          type: 'success',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
        });
      } else {
        // Log OTP verification failure
        console.log('❌ OTP VERIFICATION FAILED:', {
          mobile: summaryValues.mobile,
          otp: otpCode,
          timestamp: new Date().toLocaleString(),
          error: result.message || 'Invalid OTP code'
        });
        
        setAlertConfig({
          open: true,
          message: result.message || 'Invalid OTP code. Please try again.',
          title: 'Verification Failed',
          type: 'danger',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
        });
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setAlertConfig({
        open: true,
        message: 'Failed to verify OTP. Please try again.',
        title: 'Verification Error',
        type: 'danger',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP
  const resendOtp = async () => {
    if (resendCountdown > 0) return;
    
    console.log('🔄 RESENDING OTP:', {
      mobile: summaryValues.mobile,
      timestamp: new Date().toLocaleString(),
      message: 'Resending OTP to WhatsApp'
    });
    
    await sendOtp();
  };

  // Send welcome WhatsApp message after successful registration
  const sendWelcomeWhatsAppMessage = async (userid, studentData) => {
    try {
      const response = await fetch('http://localhost:8081/routes.php/send-welcome-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userid: userid,
          studentData: studentData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('📱 WELCOME WHATSAPP SENT:', {
          mobile: studentData.mobile,
          userid: userid,
          timestamp: new Date().toLocaleString(),
          message: 'Welcome WhatsApp message sent successfully'
        });
      } else {
        console.error('❌ WELCOME WHATSAPP FAILED:', {
          mobile: studentData.mobile,
          userid: userid,
          timestamp: new Date().toLocaleString(),
          error: result.message || 'Failed to send welcome message'
        });
      }
    } catch (error) {
      console.error('Error sending welcome WhatsApp message:', error);
    }
  };

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Auto-send OTP when reaching step 4
  useEffect(() => {
    if (step === 4 && verificationStep === 'pending') {
      sendOtp();
    }
  }, [step]);

  // Generate barcode when registration is successful
  useEffect(() => {
    if (registrationSuccess && generatedBarcode) {
      setTimeout(() => {
        const canvas = document.getElementById('success-barcode-display');
        if (canvas) {
          try {
            JsBarcode('#success-barcode-display', generatedBarcode.barcodeData, {
              format: 'CODE128',
              width: 1.5,
              height: 30,
              displayValue: true,
              fontSize: 10,
              margin: 3,
              background: '#ffffff',
              lineColor: '#000000'
            });
          } catch (error) {
            console.error('Error generating barcode:', error);
          }
        }
      }, 300);
    }
  }, [registrationSuccess, generatedBarcode]);

  const handleRegister = async () => {
    setIsRegistering(true);
    
    try {
      // Prepare user data for backend registration
      const userData = {
        role: 'student',
        password: summaryValues.password,
        registration_method: 'Online', // Mark as online registration
        // Additional student data
        firstName: summaryValues.firstName,
        lastName: summaryValues.lastName,
        nic: summaryValues.idNumber || '',
        gender: summaryValues.gender,
        age: summaryValues.age,
        email: summaryValues.email,
        mobile: summaryValues.mobile,
        parentName: summaryValues.parentName,
        parentMobile: summaryValues.parentMobile,
        stream: summaryValues.stream,
        dateOfBirth: summaryValues.dob,
        school: summaryValues.school,
        address: summaryValues.address,
        district: summaryValues.district
      };

      console.log('Sending registration data:', userData);

      // Call backend registration API
      const response = await register(userData);
      
      console.log('Registration response:', response);
      
      if (response.success) {
        // Create barcode object for display using the generated userid
        const barcodeObj = {
          id: response.userid,
          barcodeData: response.userid,
          studentName: `${summaryValues.firstName} ${summaryValues.lastName}`,
          generatedAt: new Date().toISOString()
        };
        
        setGeneratedBarcode(barcodeObj);
        setRegistrationSuccess(true);
        
        // Show professional success message
        setAlertConfig({
          open: true,
          message: response.welcomeMessage || `Welcome to TCMS! Your account has been successfully created with Student ID: ${response.userid}`,
          title: '🎉 Registration Successful!',
          type: 'success',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
        });
        
        // Save barcode data to backend
        try {
          await saveBarcode(response.userid, response.userid, `${summaryValues.firstName} ${summaryValues.lastName}`);
          console.log('Barcode data saved to backend');
        } catch (error) {
          console.error('Failed to save barcode data:', error);
          // Don't fail the registration if barcode save fails
        }
        
        // Send welcome WhatsApp message
        try {
          await sendWelcomeWhatsAppMessage(response.userid, summaryValues);
          console.log('Welcome WhatsApp message sent successfully');
          
          // Show success message about WhatsApp notification
          setAlertConfig({
            open: true,
            message: `Registration successful! A welcome message has been sent to your WhatsApp (${summaryValues.mobile}).`,
            title: '🎉 Registration Complete!',
            type: 'success',
            onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
          });
        } catch (error) {
          console.error('Failed to send welcome WhatsApp message:', error);
          // Don't fail the registration if WhatsApp message fails
        }
        
        // Generate barcode on canvas after a short delay to ensure DOM is ready
        setTimeout(() => {
          generateBarcodeOnCanvas(response.userid, 'success-barcode-display');
        }, 100);
        
        console.log('Registration successful! Student ID:', response.userid);
      } else {
        console.error('Registration failed:', response.message);
        setAlertConfig({
          open: true,
          message: 'Registration failed: ' + (response.message || 'Unknown error'),
          title: 'Registration Failed',
          type: 'danger',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Check if it's a validation error
      if (error.message && (error.message.includes('NIC number') || error.message.includes('mobile number') || error.message.includes('email address'))) {
        setAlertConfig({
          open: true,
          message: 'Registration failed: ' + error.message + '\n\nPlease use different information or contact support if you believe this is an error.',
          title: 'Duplicate Information',
          type: 'warning',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
        });
      } else {
        setAlertConfig({
          open: true,
          message: 'Registration failed: ' + (error.message || 'Network error occurred'),
          title: 'Registration Failed',
          type: 'danger',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, open: false }))
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Function to generate barcode on canvas
  const generateBarcodeOnCanvas = (text, canvasId) => {
    try {
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        JsBarcode(canvas, text, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          background: "#ffffff",
          lineColor: "#000000"
        });
      }
    } catch (error) {
      console.error('Barcode generation error:', error);
    }
  };

  // useEffect to generate barcode when registration is successful
  useEffect(() => {
    if (registrationSuccess && generatedBarcode) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        generateBarcodeOnCanvas(generatedBarcode.id, 'success-barcode-display');
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [registrationSuccess, generatedBarcode]);

  // Function to download barcode
  const downloadBarcode = () => {
    try {
      const canvas = document.getElementById('success-barcode-display');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `barcode_${generatedBarcode?.id}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download barcode');
    }
  };

  return (
    <div className="w-full flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <BasicAlertBox {...alertConfig} />
      <div className='max-w-md w-full flex flex-col p-8 items-center'>
        <div className='app-log flex flex-col justify-center items-center mb-8'>
          <div className='w-12 h-12 rounded-full bg-[#3da58a] flex items-center justify-center mb-3 shadow-xl backdrop-blur-sm'>
            <FaGraduationCap className='text-white text-2xl' />
          </div>
          <span className='text-2xl font-bold text-[#1a365d] mb-1'>
            TCMS
          </span>
          <span className='text-sm text-[#1a365d] font-medium'>
            New Student Registration
          </span>
        </div>
        <div className="w-full max-w-md">
          {step === 1 && (
            <BasicForm
              initialValues={step1Values}
              validationSchema={step1Schema}
              onSubmit={handleStep1}
            >
              {({ errors, touched, handleChange, values }) => (
                <>
                  <CustomTextField
                    id="firstName"
                    name="firstName"
                    type="text"
                    label="First Name *"
                    value={values.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                    touched={touched.firstName}
                    icon={FaUser}
                  />
                  <CustomTextField
                    id="lastName"
                    name="lastName"
                    type="text"
                    label="Last Name *"
                    value={values.lastName}
                    onChange={handleChange}
                    error={errors.lastName}
                    touched={touched.lastName}
                    icon={FaUser}
                  />
                  <CustomTextField
                    id="idNumber"
                    name="idNumber"
                    type="text"
                    label="NIC If Available"
                    value={values.idNumber}
                    onChange={handleChange}
                    error={errors.idNumber}
                    touched={touched.idNumber}
                    icon={FaIdCard}
                  />
                  <CustomTextField
                    id="mobile"
                    name="mobile"
                    type="text"
                    label="Mobile *"
                    value={values.mobile}
                    onChange={handleChange}
                    error={errors.mobile}
                    touched={touched.mobile}
                    icon={FaPhone}
                  />
                  <CustomTextField
                    id="password"
                    name="password"
                    type="password"
                    label="Password *"
                    value={values.password}
                    onChange={handleChange}
                    error={errors.password}
                    touched={touched.password}
                    isPassword
                    icon={FaLock}
                  />
                  <CustomTextField
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label="Confirm Password *"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    touched={touched.confirmPassword}
                    isPassword
                    icon={FaLock}
                  />
                  <div className="flex gap-4 mt-2">
                    <CustomButton type="button" onClick={() => navigate(-1)}>
                      Back
                    </CustomButton>
                    <CustomButton type="submit">
                      Next
                    </CustomButton>
                  </div>
                </>
              )}
            </BasicForm>
          )}
          {step === 2 && (
            <Formik
              initialValues={manualFields}
              validationSchema={Yup.object().shape({
                dob: Yup.date()
                  .max(new Date(), 'Date of birth cannot be in the future')
                  .required('Date of birth is required'),
                age: Yup.number()
                  .min(5, 'Age must be at least 5')
                  .max(100, 'Age must be less than 100')
                  .required('Age is required'),
                gender: Yup.string()
                  .matches(genderRegex, 'Gender must be Male or Female')
                  .required('Gender is required'),
                email: Yup.string().email('Invalid email').notRequired().nullable(),
                school: Yup.string().min(2, 'School name must be at least 2 characters').required('School is required'),
                stream: Yup.string().oneOf(allowedStreams, 'Invalid stream').required('Stream is required'),
                address: Yup.string().min(5, 'Address must be at least 5 characters').required('Address is required'),
                district: Yup.string().oneOf(allowedDistricts, 'Invalid district').required('District is required'),
                parentName: Yup.string().min(2, 'Parent name must be at least 2 characters').required('Parent name is required'),
                parentMobile: Yup.string()
                  .matches(phoneRegex, 'Invalid phone number (should be 10 digits, start with 0)')
                  .required('Parent mobile number is required'),
              })}
              validateOnMount={false}
              onSubmit={(values, { setSubmitting, setTouched, setErrors, validateForm }) => {
                validateForm().then(errors => {
                  if (Object.keys(errors).length > 0) {
                    alert('Please enter all required values.');
                    setTouched({
                      dob: true, age: true, gender: true, email: true, school: true, stream: true, address: true, district: true, parentName: true, parentMobile: true
                    });
                    setSubmitting(false);
                  } else {
                    handleStep2(values);
                  }
                });
              }}
            >
              {({ errors, touched, handleChange, values, handleSubmit, isSubmitting, submitCount }) => (
                <form className='flex flex-col w-full space-y-4' onSubmit={e => {
                  handleSubmit(e);
                  if (Object.keys(errors).length > 0) {
                    const firstErrorField = Object.keys(errors)[0];
                    const el = document.getElementsByName(firstErrorField)[0];
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}>
                  {submitCount > 0 && Object.keys(errors).length > 0 && (
                    <div className='bg-red-100 text-red-700 p-2 rounded mb-2 text-xs font-semibold'>
                      Please fix the errors below before continuing.
                    </div>
                  )}
                  <CustomTextField
                    id="dob"
                    name="dob"
                    type="date"
                    label="Date of Birth *"
                    value={values.dob}
                    onChange={handleChange}
                    error={errors.dob}
                    touched={touched.dob}
                    icon={FaCalendarAlt}
                  />
                  <CustomTextField
                    id="age"
                    name="age"
                    type="number"
                    label="Age *"
                    value={values.age}
                    onChange={handleChange}
                    error={errors.age}
                    touched={touched.age}
                    icon={FaCalendarAlt}
                  />
                  <CustomTextField
                    id="gender"
                    name="gender"
                    type="text"
                    label="Gender *"
                    value={values.gender}
                    onChange={handleChange}
                    error={errors.gender}
                    touched={touched.gender}
                    icon={FaVenusMars}
                  />
                  <CustomTextField
                    id="email"
                    name="email"
                    type="email"
                    label="Email (Optional)"
                    value={values.email}
                    onChange={handleChange}
                    error={errors.email}
                    touched={touched.email}
                    icon={FaUser}
                  />
                  <CustomTextField
                    id="school"
                    name="school"
                    type="text"
                    label="School *"
                    value={values.school}
                    onChange={handleChange}
                    error={errors.school}
                    touched={touched.school}
                    icon={FaUser}
                  />
                  <div className="flex flex-col mb-2">
                    <label htmlFor="stream" className="text-xs font-medium text-[#1a365d] mb-1">Stream *</label>
                    <select
                      id="stream"
                      name="stream"
                      value={values.stream}
                      onChange={handleChange}
                      className="border-2 border-[#1a365d] rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a365d]"
                    >
                      <option value="">Select Stream</option>
                      {streams.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.stream && <span className='text-red-500 text-[10px] mt-1'>{errors.stream}</span>}
                  </div>
                  <CustomTextField
                    id="address"
                    name="address"
                    type="text"
                    label="Address *"
                    value={values.address}
                    onChange={handleChange}
                    error={errors.address}
                    touched={touched.address}
                    icon={FaUser}
                  />
                  <div className="flex flex-col mb-2">
                    <label htmlFor="district" className="text-xs font-medium text-[#1a365d] mb-1">District *</label>
                    <select
                      id="district"
                      name="district"
                      value={values.district}
                      onChange={handleChange}
                      className="border-2 border-[#1a365d] rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a365d]"
                    >
                      <option value="">Select District</option>
                      {sriLankaDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.district && <span className='text-red-500 text-[10px] mt-1'>{errors.district}</span>}
                  </div>
                  <CustomTextField
                    id="parentName"
                    name="parentName"
                    type="text"
                    label="Parent Name *"
                    value={values.parentName}
                    onChange={handleChange}
                    error={errors.parentName}
                    touched={touched.parentName}
                    icon={FaUser}
                  />
                  <CustomTextField
                    id="parentMobile"
                    name="parentMobile"
                    type="text"
                    label="Parent Mobile Number *"
                    value={values.parentMobile}
                    onChange={handleChange}
                    error={errors.parentMobile}
                    touched={touched.parentMobile}
                    icon={FaPhone}
                  />
                  <div className="flex gap-4 mt-2">
                    <CustomButton type="button" onClick={() => setStep(1)}>
                      Back
                    </CustomButton>
                    <CustomButton type="submit" disabled={isSubmitting}>
                      Next
                    </CustomButton>
                  </div>
                </form>
              )}
            </Formik>
          )}
          {step === 3 && (
            <div className="flex flex-col w-full space-y-4">
              {!registrationSuccess ? (
                <>
                  <h2 className="text-lg font-bold text-[#1a365d] mb-2">Review Your Details</h2>
                  <CustomTextField label="First Name" value={summaryValues.firstName} readOnly icon={FaUser} />
                  <CustomTextField label="Last Name" value={summaryValues.lastName} readOnly icon={FaUser} />
                  <CustomTextField label="NIC" value={summaryValues.idNumber} readOnly icon={FaIdCard} />
                  <CustomTextField label="Mobile" value={summaryValues.mobile} readOnly icon={FaPhone} />
                  <CustomTextField label="Date of Birth" value={summaryValues.dob} readOnly icon={FaCalendarAlt} />
                  <CustomTextField label="Age" value={summaryValues.age} readOnly icon={FaCalendarAlt} />
                  <CustomTextField label="Gender" value={summaryValues.gender} readOnly icon={FaVenusMars} />
                  <CustomTextField label="Email" value={summaryValues.email} readOnly icon={FaUser} />
                  <CustomTextField label="School" value={summaryValues.school} readOnly icon={FaUser} />
                  <CustomTextField label="Stream" value={summaryValues.stream} readOnly icon={FaUser} />
                  <CustomTextField label="Address" value={summaryValues.address} readOnly icon={FaUser} />
                  <CustomTextField label="District" value={summaryValues.district} readOnly icon={FaUser} />
                  <CustomTextField label="Parent Name" value={summaryValues.parentName} readOnly icon={FaUser} />
                  <CustomTextField label="Parent Mobile Number" value={summaryValues.parentMobile} readOnly icon={FaPhone} />
                  <div className="flex gap-4 mt-2">
                    <CustomButton type="button" onClick={() => setStep(2)}>
                      Back
                    </CustomButton>
                    <CustomButton 
                      type="button" 
                      onClick={() => setStep(4)}
                    >
                      Verify Mobile
                    </CustomButton>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-green-800 mb-2">Student Registered Successfully!</h3>
                  <p className="text-gray-600 mb-2">Generated Student ID: <span className="font-semibold text-blue-600">{generatedBarcode?.id}</span></p>
                  <p className="text-gray-600 mb-4">Student Name: <span className="font-semibold">{generatedBarcode?.studentName}</span></p>
                  
                  {generatedBarcode && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-6 mt-4">
                      <h4 className="font-medium text-gray-800 mb-2 text-center text-sm">Generated Barcode</h4>
                      <div className="flex justify-center mb-2">
                        <canvas id="success-barcode-display" className="border border-gray-300 max-w-xs"></canvas>
                      </div>
                      <p className="text-xs text-gray-600 text-center break-all">
                        {generatedBarcode.barcodeData}
                      </p>
                      <div className="mt-4 flex gap-3 justify-center">
                        <CustomButton
                          onClick={downloadBarcode}
                        >
                          Download Barcode
                        </CustomButton>
                        <CustomButton
                          onClick={() => navigate('/login')}
                        >
                          Login Now
                        </CustomButton>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
                     {step === 4 && (
             <div className="flex flex-col w-full space-y-4">
               {verificationStep !== 'verified' ? (
                 <>
                   <h2 className="text-lg font-bold text-[#1a365d] mb-2">Mobile Verification</h2>
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                     <div className="flex items-center gap-2 mb-2">
                       <FaWhatsapp className="text-green-600 text-lg" />
                       <span className="font-semibold text-blue-800">WhatsApp Verification</span>
                     </div>
                     <p className="text-sm text-blue-700 mb-2">
                       We've sent a 6-digit OTP code to your WhatsApp number:
                     </p>
                     <p className="font-semibold text-blue-900">{summaryValues.mobile}</p>
                   </div>
                   
                   <CustomTextField
                     id="otpCode"
                     name="otpCode"
                     type="text"
                     label="Enter OTP Code *"
                     value={otpCode}
                     onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                     placeholder="Enter 6-digit code"
                     maxLength={6}
                     icon={FaWhatsapp}
                   />
                   
                   {verificationStep === 'sent' && (
                     <div className="text-center">
                       <p className="text-sm text-gray-600 mb-2">
                         Didn't receive the code?
                       </p>
                       <button
                         type="button"
                         onClick={resendOtp}
                         disabled={resendCountdown > 0 || isSendingOtp}
                         className={`text-sm font-medium ${
                           resendCountdown > 0 
                             ? 'text-gray-400 cursor-not-allowed' 
                             : 'text-blue-600 hover:text-blue-800'
                         }`}
                       >
                         {resendCountdown > 0 
                           ? `Resend in ${resendCountdown}s` 
                           : isSendingOtp 
                             ? 'Sending...' 
                             : 'Resend OTP'
                         }
                       </button>
                     </div>
                   )}
                   
                   <div className="flex gap-4 mt-4">
                     <CustomButton type="button" onClick={() => setStep(3)}>
                       Back
                     </CustomButton>
                     <CustomButton
                       type="button" 
                       onClick={verifyOtp}
                       disabled={isVerifyingOtp || otpCode.length !== 6}
                       
                     >
                       {isVerifyingOtp ? (
                         <div className="flex items-center gap-2">
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           Verifying...
                         </div>
                       ) : (
                         'Verify OTP'
                       )}
                     </CustomButton>
                   </div>
                 </>
               ) : (
                 <div className="text-center">
                   <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                     </svg>
                   </div>
                   <h3 className="text-xl font-bold text-green-800 mb-2">Mobile Verified!</h3>
                   <p className="text-gray-600 mb-4">Your mobile number has been successfully verified via WhatsApp.</p>
                   <div className="flex gap-4 mt-4">
                     <CustomButton type="button" onClick={() => setStep(3)}>
                       Back
                     </CustomButton>
                     <CustomButton 
                       type="button" 
                       onClick={() => setStep(5)}
                       
                     >
                       Continue Registration
                     </CustomButton>
                   </div>
                 </div>
               )}
             </div>
           )}
                     {step === 5 && (
             <div className="flex flex-col w-full space-y-4">
               {!registrationSuccess ? (
                 <>
                   <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                     <div className="flex items-center gap-2 mb-2">
                       <FaWhatsapp className="text-green-600 text-lg" />
                       <span className="font-semibold text-green-800">Mobile Verified ✓</span>
                     </div>
                     <p className="text-sm text-green-700">
                       Your mobile number {summaryValues.mobile} has been successfully verified via WhatsApp.
                     </p>
                   </div>
                   
                   <h2 className="text-lg font-bold text-[#1a365d] mb-2">Final Review & Registration</h2>
                   <CustomTextField label="First Name" value={summaryValues.firstName} readOnly icon={FaUser} />
                   <CustomTextField label="Last Name" value={summaryValues.lastName} readOnly icon={FaUser} />
                   <CustomTextField label="NIC" value={summaryValues.idNumber} readOnly icon={FaIdCard} />
                   <CustomTextField label="Mobile (Verified)" value={summaryValues.mobile} readOnly icon={FaPhone} />
                   <CustomTextField label="Date of Birth" value={summaryValues.dob} readOnly icon={FaCalendarAlt} />
                   <CustomTextField label="Age" value={summaryValues.age} readOnly icon={FaCalendarAlt} />
                   <CustomTextField label="Gender" value={summaryValues.gender} readOnly icon={FaVenusMars} />
                   <CustomTextField label="Email" value={summaryValues.email} readOnly icon={FaUser} />
                   <CustomTextField label="School" value={summaryValues.school} readOnly icon={FaUser} />
                   <CustomTextField label="Stream" value={summaryValues.stream} readOnly icon={FaUser} />
                   <CustomTextField label="Address" value={summaryValues.address} readOnly icon={FaUser} />
                   <CustomTextField label="District" value={summaryValues.district} readOnly icon={FaUser} />
                   <CustomTextField label="Parent Name" value={summaryValues.parentName} readOnly icon={FaUser} />
                   <CustomTextField label="Parent Mobile Number" value={summaryValues.parentMobile} readOnly icon={FaPhone} />
                   
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                     <p className="text-sm text-blue-700 font-medium">
                       By clicking "Register", you agree to our terms and conditions.
                     </p>
                   </div>
                   
                   <div className="flex gap-4 mt-4">
                     <CustomButton type="button" onClick={() => setStep(4)}>
                       Back
                     </CustomButton>
                     <CustomButton 
                       type="button" 
                       onClick={handleRegister}
                       disabled={isRegistering}
                       
                     >
                       {isRegistering ? (
                         <div className="flex items-center gap-2">
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           Registering...
                         </div>
                       ) : (
                         'Complete Registration'
                       )}
                     </CustomButton>
                   </div>
                 </>
               ) : (
                 <div className="text-center">
                   <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                     <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                     </svg>
                   </div>
                   
                   <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-6 shadow-sm">
                     <h3 className="text-2xl font-bold text-green-800 mb-3">🎉 Registration Successful!</h3>
                     <p className="text-lg text-gray-700 mb-4">
                       Welcome to <span className="font-bold text-blue-600">TCMS</span> (Tuition Class Management System)
                     </p>
                     
                     <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                         <div>
                           <p className="text-sm text-gray-600 mb-1">Student ID</p>
                           <p className="text-lg font-bold text-blue-600">{generatedBarcode?.id}</p>
                         </div>
                         <div>
                           <p className="text-sm text-gray-600 mb-1">Full Name</p>
                           <p className="text-lg font-semibold text-gray-800">{generatedBarcode?.studentName}</p>
                         </div>
                       </div>
                     </div>
                     
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                       <div className="flex items-center gap-2 mb-2">
                         <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                         </svg>
                         <span className="font-semibold text-blue-800">Next Steps</span>
                       </div>
                       <ul className="text-sm text-blue-700 space-y-1">
                         <li>• Your account has been successfully created in TCMS</li>
                         <li>• You can now login using your Student ID and password</li>
                         
                      
                       </ul>
                     </div>
                     
                     <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                       <div className="flex items-center gap-2 mb-2">
                         <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                         </svg>
                         <span className="font-semibold text-green-800">Account Status</span>
                       </div>
                       <p className="text-sm text-green-700">
                         ✅ Account Created | ✅ Mobile Verified | ✅ Ready for Login
                       </p>
                     </div>
                   </div>
                   
                   {generatedBarcode && (
                     <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
                       <div className="text-center mb-4">
                         <div className="flex items-center justify-center gap-2 mb-2">
                           <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z"></path>
                           </svg>
                           <h4 className="font-semibold text-gray-800 text-lg">Attendance Barcode</h4>
                         </div>
                         <p className="text-sm text-gray-600 mb-4">
                           Use this barcode for quick attendance tracking in your classes
                         </p>
                       </div>
                       
                       <div className="bg-gray-50 rounded-lg p-4 mb-4">
                         <div className="flex justify-center mb-3">
                           <canvas id="success-barcode-display" className="border border-gray-300 bg-white p-2 rounded max-w-xs"></canvas>
                         </div>
                         <p className="text-xs text-gray-500 text-center break-all font-mono bg-white p-2 rounded border">
                           {generatedBarcode.barcodeData}
                         </p>
                       </div>
                       
                       <div className="flex flex-col sm:flex-row gap-3 justify-center">
                         <CustomButton
                           onClick={downloadBarcode}
                           
                         >
                           
                           Download Barcode
                         </CustomButton>
                         <CustomButton
                           onClick={() => navigate('/login')} 
                         >
                           
                           Login to TCMS
                         </CustomButton>
                       </div>
                       
                       <div className="mt-4 text-center">
                         <p className="text-xs text-gray-500">
                           Need help? Contact support at <span className="text-blue-600">support@tcms.com</span>
                         </p>
                       </div>
                     </div>
                   )}
                 </div>
               )}
             </div>
           )}
          <Link to="/login" className="mt-8 text-[#064e3b] hover:underline text-xs block text-center">Already registered?</Link>
        </div>
      </div>
    </div>
  );
} 