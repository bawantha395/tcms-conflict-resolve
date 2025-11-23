import React from 'react';
import BasicAlertBox from '../../../components/BasicAlertBox';
import CustomTextField from '../../../components/CustomTextField';
import CustomButton from '../../../components/CustomButton';
import CustomSelectField from '../../../components/CustomSelectField';
import BasicForm from '../../../components/BasicForm';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { FaUser, FaLock, FaPhone, FaIdCard, FaEnvelope } from 'react-icons/fa';
import { createTeacher } from '../../../api/teachers';

const streamOptions = [
  'O/L',
  'A/L-Art',
  'A/L-Maths',
  'A/L-Science',
  'A/L-Commerce',
  'A/L-Technology',
  'Primary',
];

const phoneRegex = /^0\d{9}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const validationSchema = Yup.object().shape({
  designation: Yup.string().required('Designation is required'),
  name: Yup.string().min(2, "Name must be at least 2 characters").required("Teacher's Name is required"),
  stream: Yup.string().oneOf(streamOptions, 'Invalid stream').required('Stream is required'),
  password: Yup.string()
    .matches(passwordRegex, 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character')
    .required('Password is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  phone: Yup.string().matches(phoneRegex, 'Invalid phone number (should be 10 digits, start with 0)').required('Phone number is required'),
});

const initialValues = {
  designation: '',
  name: '',
  stream: '',
  password: '',
  email: '',
  phone: '',
};

const CreateTeacherLogin = () => {
  const navigate = useNavigate();
  const [submitCount, setSubmitCount] = React.useState(0);
  const [alertBox, setAlertBox] = React.useState({ open: false, message: '', onConfirm: null, confirmText: 'OK', type: 'success' });

  const handleSubmit = async (values) => {
    try {
      const response = await createTeacher(values);
      
      if (response.success) {
        let message = 'Teacher account created successfully!';
        
        // Add teacher ID to the message
        if (response.teacherId) {
          message += `\n\nTeacher ID: ${response.teacherId}`;
        }
        
        // Add WhatsApp status to the message
        if (response.whatsapp_sent !== undefined) {
          if (response.whatsapp_sent) {
            message += '\n\n📱 WhatsApp message sent successfully with login credentials.';
          } else {
            message += '\n\n⚠️ Teacher account created but WhatsApp message failed to send.';
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
            navigate('/admin/teachers/info');
            // navigate('/dashboard/admin/teacher-info');
          },
          confirmText: 'OK',
          type: response.whatsapp_sent ? 'success' : 'warning'
        });
      } else {
        // If backend reports an existing Teacher ID, show an informative modal
        const backendMessage = response.message || 'Failed to create teacher account';
        if (backendMessage.toLowerCase().includes('teacher id already exists')) {
          // If backend returned the conflicting ID, show it explicitly
          const existingId = response.existingId || null;
          const infoMessage = existingId
            ? `Teacher ID ${existingId} already exists. Please check the teacher list or try again.`
            : 'Teacher ID already exists. It looks like a generated ID collided with an existing record. Please check the teacher list or try again.';

          setAlertBox({
            open: true,
            message: infoMessage,
            onConfirm: () => {
              setAlertBox(a => ({ ...a, open: false }));
            },
            confirmText: 'OK',
            type: 'info'
          });
        } else {
          setAlertBox({
            open: true,
            message: backendMessage,
            onConfirm: () => {
              setAlertBox(a => ({ ...a, open: false }));
            },
            confirmText: 'OK',
            type: 'error'
          });
        }
      }
    } catch (error) {
      setAlertBox({
        open: true,
        message: 'Error creating teacher account. Please try again.',
        onConfirm: () => {
          setAlertBox(a => ({ ...a, open: false }));
        },
        confirmText: 'OK',
        type: 'error'
      });
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
        <h2 className="text-2xl font-bold mb-6 text-center">Create Teacher Login</h2>
        <p className="text-center text-gray-600 mb-6">
          Teacher login credentials will be automatically sent via WhatsApp after successful creation.
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
          {/* Responsive grid for two columns on md+ screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              label="Teacher's Name *"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              touched={touched.name}
              icon={FaUser}
            />

            <CustomSelectField
              id="designation"
              name="designation"
              label="Designation"
              value={values.designation}
              onChange={handleChange}
              options={[{ value: '', label: 'Select Designation' },
                { value: 'Mr.', label: 'Mr.' },
                { value: 'Mrs.', label: 'Mrs.' },
                { value: 'Miss', label: 'Miss' },
                { value: 'Ven.', label: 'Ven.' },
                { value: 'Dr', label: 'Dr' },
                { value: 'Prof', label: 'Prof' }
              ]}
              error={errors.designation}
              touched={touched.designation}
              required
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

            <CustomSelectField
              id="stream"
              name="stream"
              label="Stream"
              value={values.stream}
              onChange={handleChange}
              options={[{ value: '', label: 'Select Stream' }, ...streamOptions.map(s => ({ value: s, label: s }))]}
              error={errors.stream}
              touched={touched.stream}
              required
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
          {/* Horizontal line between buttons */}
          <hr className="my-6 border-t border-gray-300" />
          <div className="flex flex-row gap-4 mt-0 mb-2">
            <CustomButton
              type="button"
              onClick={() => navigate(-1)}
              className="w-1/2 py-2.5 px-4 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 shadow-md hover:shadow-xl"
            >
              Cancel
            </CustomButton>
            <CustomButton
              type="submit"
              onClick={() => setSubmitCount((c) => c + 1)}
              className="w-1/2 py-2.5 px-4 bg-[#1a365d] text-white text-xs font-bold rounded-lg hover:bg-[#13294b] active:bg-[#0f2038] focus:outline-none focus:ring-2 focus:ring-[#1a365d] focus:ring-opacity-50 shadow-md hover:shadow-xl"
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

export default CreateTeacherLogin; 