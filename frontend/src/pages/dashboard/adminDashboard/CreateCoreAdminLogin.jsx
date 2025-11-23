import React from 'react';
import BasicAlertBox from '../../../components/BasicAlertBox';
import CustomTextField from '../../../components/CustomTextField';
import CustomButton from '../../../components/CustomButton';
import BasicForm from '../../../components/BasicForm';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { FaUser, FaLock, FaPhone, FaIdCard, FaEnvelope } from 'react-icons/fa';

const phoneRegex = /^0\d{9}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const validationSchema = Yup.object().shape({
  adminId: Yup.string().required('Admin ID is required'),
  name: Yup.string().min(2, "Name must be at least 2 characters").required("Name is required"),
  password: Yup.string()
    .matches(passwordRegex, 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character')
    .required('Password is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  phone: Yup.string().matches(phoneRegex, 'Invalid phone number (should be 10 digits, start with 0)').required('Phone number is required'),
});

const initialValues = {
  adminId: '',
  name: '',
  password: '',
  email: '',
  phone: '',
};

const CreateCoreAdminLogin = () => {
  const navigate = useNavigate();
  const [submitCount, setSubmitCount] = React.useState(0);
  const [alertBox, setAlertBox] = React.useState({ open: false, message: '', onConfirm: null, confirmText: 'OK', type: 'success' });

  const handleSubmit = (values) => {
    const coreAdmins = JSON.parse(localStorage.getItem('coreAdmins')) || [];
    coreAdmins.push(values);
    localStorage.setItem('coreAdmins', JSON.stringify(coreAdmins));
    setAlertBox({
      open: true,
      message: 'Core admin account created!',
      onConfirm: () => {
        setAlertBox(a => ({ ...a, open: false }));
        navigate('/admin/coreadmins/info');
      },
      confirmText: 'OK',
      type: 'success'
    });
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
      <h2 className="text-2xl font-bold mb-6 text-center">Create Core Admin Login</h2>
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
              <CustomTextField
                id="adminId"
                name="adminId"
                type="text"
                label="Admin ID *"
                value={values.adminId}
                onChange={handleChange}
                error={errors.adminId}
                touched={touched.adminId}
                icon={FaIdCard}
              />
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
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                onClick={() => setSubmitCount((c) => c + 1)}
                className="w-1/2 py-2.5 px-4 bg-[#1a365d] text-white text-xs font-bold rounded-lg hover:bg-[#13294b] active:bg-[#0f2038]"
              >
                Create
              </CustomButton>
            </div>
          </>
        )}
      </BasicForm>
    </div>
  );
};

export default CreateCoreAdminLogin;
