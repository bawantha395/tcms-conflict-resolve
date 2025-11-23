import React from 'react';
import BasicAlertBox from '../../../components/BasicAlertBox';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import CustomTextField from '../../../components/CustomTextField';
import CustomButton from '../../../components/CustomButton';
import BasicForm from '../../../components/BasicForm';
import adminSidebarSections from './AdminDashboardSidebar';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { FaUser, FaLock, FaPhone, FaIdCard, FaEnvelope } from 'react-icons/fa';
import { createCashier, getNextCashierId } from '../../../api/cashier';

const phoneRegex = /^0\d{9}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const validationSchema = Yup.object().shape({
  name: Yup.string().min(2, "Name must be at least 2 characters").required("Name is required"),
  password: Yup.string()
    .matches(passwordRegex, 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character')
    .required('Password is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  phone: Yup.string().matches(phoneRegex, 'Invalid phone number (should be 10 digits, start with 0)').required('Phone number is required'),
});

const initialValues = {
  name: '',
  password: '',
  email: '',
  phone: '',
};

const CreateCashierLogin = () => {
  const navigate = useNavigate();
  const [submitCount, setSubmitCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [alertBox, setAlertBox] = React.useState({ open: false, message: '', onConfirm: null, confirmText: 'OK', type: 'success' });
  const [nextCashierId, setNextCashierId] = React.useState('');
  const [loadingId, setLoadingId] = React.useState(false);

  // Load next cashier ID on component mount
  React.useEffect(() => {
    const loadNextCashierId = async () => {
      try {
        setLoadingId(true);
        const response = await getNextCashierId();
        if (response.success) {
          setNextCashierId(response.data);
        } else {
          console.error('Failed to load next cashier ID:', response.message);
        }
      } catch (error) {
        console.error('Error loading next cashier ID:', error);
      } finally {
        setLoadingId(false);
      }
    };
    
    loadNextCashierId();
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);
    
    try {
      const response = await createCashier({
        name: values.name,
        password: values.password,
        email: values.email,
        phone: values.phone
      });

      if (response.success) {
        let message = 'Cashier account created successfully!';
        
        // Add WhatsApp status to the message
        if (response.whatsapp_sent !== undefined) {
          if (response.whatsapp_sent) {
            message += '\n\n📱 WhatsApp message sent successfully with login credentials.';
          } else {
            message += '\n\n⚠️ Cashier account created but WhatsApp message failed to send.';
            if (response.whatsapp_message) {
              message += `\nError: ${response.whatsapp_message}`;
            }
          }
        }
        
        setAlertBox({
          open: true,
          message: message,
          onConfirm: () => {
            setAlertBox(a => ({ ...a, open: false }));
            navigate('/admin/cashiers/info');
          },
          confirmText: 'OK',
          type: response.whatsapp_sent ? 'success' : 'warning'
        });
      } else {
        setAlertBox({
          open: true,
          message: response.message || 'Failed to create cashier account',
          onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
          confirmText: 'OK',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error creating cashier account:', error);
      setAlertBox({
        open: true,
        message: 'Error creating cashier account. Please try again.',
        onConfirm: () => setAlertBox(a => ({ ...a, open: false })),
        confirmText: 'OK',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white p-8 rounded-lg shadow mt-10">
      <BasicAlertBox
        open={alertBox.open}
        message={alertBox.message}
        onConfirm={alertBox.onConfirm}
        confirmText={alertBox.confirmText}
        type={alertBox.type}
      />
      <h2 className="text-2xl font-bold mb-6 text-center">Create Cashier Login</h2>
      <p className="text-gray-600 text-center mb-6">
        Create a new cashier account. Credentials will be sent via WhatsApp to the provided phone number.
      </p>
      <BasicForm
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ errors, touched, handleChange, values }) => (
          <>
            {submitCount > 0 && Object.keys(errors).length > 0 && (
              <div className='bg-red-100 text-red-700 p-2 rounded mb-2 text-xs font-semibold'>
                Please fix the errors below before continuing.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <FaIdCard className="text-blue-600 mr-2" />
                    <span className="text-blue-800 font-medium">Next Cashier ID: </span>
                    <span className="text-blue-900 font-bold ml-2">
                      {loadingId ? 'Loading...' : nextCashierId || 'C001'}
                    </span>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">
                    This ID will be automatically assigned to the new cashier account.
                  </p>
                </div>
              </div>
              <CustomTextField
                id="email"
                name="email"
                type="email"
                label="Email *"
                value={values.email}
                onChange={handleChange}
                error={errors.email}
                touched={touched.email}
                icon={FaEnvelope}
              />
              <CustomTextField
                id="name"
                name="name"
                type="text"
                label="Name *"
                value={values.name}
                onChange={handleChange}
                error={errors.name}
                touched={touched.name}
                icon={FaUser}
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
                id="phone"
                name="phone"
                type="text"
                label="Phone Number *"
                value={values.phone}
                onChange={handleChange}
                error={errors.phone}
                touched={touched.phone}
                icon={FaPhone}
              />
            </div>
            <hr className="my-6 border-t border-gray-300" />
            <div className="flex flex-row gap-4 mt-0 mb-2">
              <CustomButton
                type="button"
                onClick={() => navigate(-1)}
                className="w-1/2 py-2.5 px-4 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                onClick={() => setSubmitCount((c) => c + 1)}
                className="w-1/2 py-2.5 px-4 bg-[#1a365d] text-white text-xs font-bold rounded-lg hover:bg-[#13294b] active:bg-[#0f2038]"
                loading={loading}
              >
                {loading ? 'Creating...' : 'Create Cashier Account'}
              </CustomButton>
            </div>
          </>
        )}
      </BasicForm>
    </div>
  );
};

export default CreateCashierLogin;
