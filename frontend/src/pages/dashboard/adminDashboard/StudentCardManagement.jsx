import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import BasicTable from '../../../components/BasicTable';
import BasicForm from '../../../components/BasicForm';
import CustomTextField from '../../../components/CustomTextField';
import CustomSelectField from '../../../components/CustomSelectField';
import CustomButton from '../../../components/CustomButton';
import BasicAlertBox from '../../../components/BasicAlertBox';
import { FaEdit, FaTrash, FaPlus, FaUser, FaBook, FaCalendar, FaGift, FaTicketAlt, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSync, FaMagic } from 'react-icons/fa';
import * as Yup from 'yup';
import { initializeSampleCards, getCardStats } from '../../../utils/initializeCards';

// Card types and their descriptions
const cardTypes = [
  { value: 'free', label: 'Free Card', description: 'Student can attend class for free', color: 'bg-green-100 text-green-800' },
  { value: 'half', label: 'Half Card', description: 'Student pays 50% of the class fee', color: 'bg-yellow-100 text-yellow-800' },
];

// Validation schema for card management
const validationSchema = Yup.object().shape({
  studentId: Yup.string().required('Student ID is required'),
  classId: Yup.string().required('Class is required'),
  cardType: Yup.string().oneOf(['free', 'half'], 'Invalid card type').required('Card type is required'),
  reason: Yup.string().when(['cardType'], {
    is: (cardType) => cardType === 'free' || cardType === 'half',
    then: () => Yup.string().required('Reason is required for free/half cards'),
    otherwise: () => Yup.string().optional(),
  }),
  validFrom: Yup.string().required('Valid from date is required'),
  validUntil: Yup.string().required('Valid until date is required'),
});

const initialValues = {
  studentId: '',
  classId: '',
  cardType: 'free',
  reason: '',
  validFrom: '',
  validUntil: '',
};

const StudentCardManagement = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [studentCards, setStudentCards] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formValues, setFormValues] = useState(initialValues);
  const [alertBox, setAlertBox] = useState({ open: false, message: '', onConfirm: null, onCancel: null, confirmText: 'OK', cancelText: 'Cancel', type: 'info' });

  // Load data from localStorage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load students
    const storedStudents = localStorage.getItem('students');
    if (storedStudents) {
      setStudents(JSON.parse(storedStudents));
    }

    // Load classes
    const storedClasses = localStorage.getItem('classes');
    if (storedClasses) {
      setClasses(JSON.parse(storedClasses));
    }

    // Load student cards
    const storedCards = localStorage.getItem('studentCards');
    if (storedCards) {
      setStudentCards(JSON.parse(storedCards));
    } else {
      // Initialize with default cards for existing students
      initializeDefaultCards();
    }
  };

  const initializeDefaultCards = () => {
    const storedStudents = localStorage.getItem('students');
    const storedClasses = localStorage.getItem('classes');
    
    if (storedStudents && storedClasses) {
      const students = JSON.parse(storedStudents);
      const classes = JSON.parse(storedClasses);
      
      const defaultCards = [];
      students.forEach(student => {
        if (student.enrolledClasses) {
          student.enrolledClasses.forEach(enrolledClass => {
            // Find matching class
            const matchingClass = classes.find(cls => 
              cls.subject === enrolledClass.subject && 
              cls.teacher === enrolledClass.teacher
            );
            
            if (matchingClass) {
              defaultCards.push({
                id: `${student.studentId}_${matchingClass.id}_${Date.now()}`,
                studentId: student.studentId,
                studentName: `${student.firstName} ${student.lastName}`,
                classId: matchingClass.id,
                className: matchingClass.className || matchingClass.subject,
                subject: matchingClass.subject,
                teacher: matchingClass.teacher,
                cardType: 'free',
                reason: '',
                validFrom: new Date().toISOString().split('T')[0],
                validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                isActive: true,
                createdAt: new Date().toISOString(),
              });
            }
          });
        }
      });
      
      setStudentCards(defaultCards);
      localStorage.setItem('studentCards', JSON.stringify(defaultCards));
    }
  };

  // Save cards to localStorage
  useEffect(() => {
    if (studentCards.length > 0) {
      localStorage.setItem('studentCards', JSON.stringify(studentCards));
    }
  }, [studentCards]);

  const openAlert = (message, onConfirm, options = {}) => {
    setAlertBox({
      open: true,
      message,
      onConfirm: onConfirm || (() => setAlertBox(a => ({ ...a, open: false }))),
      onCancel: options.onCancel || (() => setAlertBox(a => ({ ...a, open: false }))),
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      type: options.type || 'info',
    });
  };

  const handleAddCard = () => {
    setEditingCard(null);
    setFormValues(initialValues);
    setShowAddModal(true);
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setFormValues({
      studentId: card.studentId,
      classId: card.classId,
      cardType: card.cardType,
      reason: card.reason,
      validFrom: card.validFrom,
      validUntil: card.validUntil,
    });
    setShowAddModal(true);
  };

  const handleDeleteCard = (cardId) => {
    openAlert(
      'Are you sure you want to delete this card?',
      () => {
        setStudentCards(studentCards.filter(card => card.id !== cardId));
        setAlertBox(a => ({ ...a, open: false }));
      },
      { confirmText: 'Delete', cancelText: 'Cancel', type: 'danger' }
    );
  };

  const handleSubmit = (values, { resetForm }) => {
    const student = students.find(s => s.studentId === values.studentId);
    const classData = classes.find(c => c.id === values.classId);
    
    if (!student || !classData) {
      openAlert('Student or class not found!', null, { type: 'error' });
      return;
    }

    const cardData = {
      id: editingCard ? editingCard.id : `${values.studentId}_${values.classId}_${Date.now()}`,
      studentId: values.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      classId: values.classId,
      className: classData.className || classData.subject,
      subject: classData.subject,
      teacher: classData.teacher,
      cardType: values.cardType,
      reason: values.reason,
      validFrom: values.validFrom,
      validUntil: values.validUntil,
      isActive: true,
      createdAt: editingCard ? editingCard.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingCard) {
      setStudentCards(studentCards.map(card => 
        card.id === editingCard.id ? cardData : card
      ));
    } else {
      setStudentCards([...studentCards, cardData]);
    }

    setShowAddModal(false);
    setEditingCard(null);
    resetForm();
    
    openAlert(
      `Card ${editingCard ? 'updated' : 'added'} successfully!`,
      null,
      { type: 'success' }
    );
  };

  const getCardStatus = (card) => {
    const today = new Date().toISOString().split('T')[0];
    const isExpired = card.validUntil < today;
    
    if (isExpired) return { status: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' };
    return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' };
  };

  const getCardTypeInfo = (cardType) => {
    return cardTypes.find(type => type.value === cardType) || cardTypes[0];
  };

  // Prepare table data
  const tableData = studentCards.map(card => {
    const cardStatus = getCardStatus(card);
    const cardTypeInfo = getCardTypeInfo(card.cardType);
    
    return {
      ...card,
      cardStatus,
      cardTypeInfo,
    };
  });

  // Student options for select field
  const studentOptions = [
    { value: '', label: 'Select Student' },
    ...students.map(student => ({
      value: student.studentId,
      label: `${student.studentId} - ${student.firstName} ${student.lastName}`,
    })),
  ];

  // Class options for select field
  const classOptions = [
    { value: '', label: 'Select Class' },
    ...classes.map(cls => ({
      value: cls.id,
      label: `${cls.className || cls.subject} - ${cls.teacher}`,
    })),
  ];

  return (
    <DashboardLayout userRole="Administrator" sidebarItems={adminSidebarSections}>
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Card Management</h1>
            <p className="text-gray-600">Manage free, half, and full cards for students</p>
          </div>
          <div className="flex gap-3">
            <CustomButton onClick={handleAddCard}>
              <FaPlus className="inline mr-2" />
              Add New Card
            </CustomButton>
            <CustomButton
              onClick={() => {
                initializeSampleCards();
                setTimeout(() => loadData(), 1000);
              }}
            >
              <FaMagic className="inline mr-2" />
              Initialize Sample Cards
            </CustomButton>
            <CustomButton
              onClick={() => {
                getCardStats();
              }}
            >
              <FaSync className="inline mr-2" />
              View Stats
            </CustomButton>
          </div>
        </div>

        {/* Card Type Legend */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Card Types:</h3>
          <div className="flex flex-wrap gap-4">
            {cardTypes.map(type => (
              <div key={type.value} className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${type.color}`}>
                  {type.label}
                </span>
                <span className="text-sm text-gray-600">{type.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cards Table */}
        <BasicTable
          columns={[
            { key: 'studentName', label: 'Student', render: row => (
              <div className="flex items-center gap-2">
                <FaUser className="text-gray-400" />
                <div>
                  <div className="font-medium">{row.studentName}</div>
                  <div className="text-sm text-gray-500">ID: {row.studentId}</div>
                </div>
              </div>
            )},
            { key: 'className', label: 'Class', render: row => (
              <div className="flex items-center gap-2">
                <FaBook className="text-gray-400" />
                <div>
                  <div className="font-medium">{row.className}</div>
                  <div className="text-sm text-gray-500">{row.subject} - {row.teacher}</div>
                </div>
              </div>
            )},
            { key: 'cardType', label: 'Card Type', render: row => (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${row.cardTypeInfo.color}`}>
                {row.cardTypeInfo.label}
              </span>
            )},

            { key: 'validity', label: 'Validity', render: row => (
              <div className="text-sm">
                <div>From: {new Date(row.validFrom).toLocaleDateString()}</div>
                <div>Until: {new Date(row.validUntil).toLocaleDateString()}</div>
              </div>
            )},
            { key: 'status', label: 'Status', render: row => (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${row.cardStatus.color}`}>
                {row.cardStatus.label}
              </span>
            )},
            { key: 'reason', label: 'Reason', render: row => (
              <div className="max-w-xs">
                {row.reason ? (
                  <span className="text-sm text-gray-600">{row.reason}</span>
                ) : (
                  <span className="text-sm text-gray-400">No reason provided</span>
                )}
              </div>
            )},
          ]}
          data={tableData}
          actions={row => (
            <div className="flex gap-2">
              <button 
                className="text-blue-600 hover:text-blue-800 hover:underline" 
                onClick={() => handleEditCard(row)} 
                title="Edit"
              >
                <FaEdit />
              </button>
              <button 
                className="text-red-600 hover:text-red-800 hover:underline" 
                onClick={() => handleDeleteCard(row.id)} 
                title="Delete"
              >
                <FaTrash />
              </button>
            </div>
          )}
          className="min-w-[1200px]"
        />

        {/* Add/Edit Card Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingCard ? 'Edit Card' : 'Add New Card'}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <BasicForm
                initialValues={formValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({ errors, touched, handleChange, values, setFieldValue }) => (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <CustomSelectField
                        name="studentId"
                        label="Student"
                        options={studentOptions}
                        icon={FaUser}
                        required
                        value={values.studentId}
                        onChange={handleChange}
                        error={errors.studentId}
                        touched={touched.studentId}
                      />
                      
                      <CustomSelectField
                        name="classId"
                        label="Class"
                        options={classOptions}
                        icon={FaBook}
                        required
                        value={values.classId}
                        onChange={handleChange}
                        error={errors.classId}
                        touched={touched.classId}
                      />
                      
                      <CustomSelectField
                        name="cardType"
                        label="Card Type"
                        options={cardTypes.map(type => ({ value: type.value, label: type.label }))}
                        icon={FaTicketAlt}
                        required
                        value={values.cardType}
                        onChange={handleChange}
                        error={errors.cardType}
                        touched={touched.cardType}
                      />
                      
                      <CustomTextField
                        name="validFrom"
                        label="Valid From"
                        type="date"
                        icon={FaCalendar}
                        required
                        value={values.validFrom}
                        onChange={handleChange}
                        error={errors.validFrom}
                        touched={touched.validFrom}
                      />
                      
                      <CustomTextField
                        name="validUntil"
                        label="Valid Until"
                        type="date"
                        icon={FaCalendar}
                        required
                        value={values.validUntil}
                        onChange={handleChange}
                        error={errors.validUntil}
                        touched={touched.validUntil}
                      />
                    </div>
                    
                    <CustomTextField
                      name="reason"
                      label="Reason (required for free/half cards)"
                      type="text"
                      icon={FaGift}
                      placeholder="e.g., Scholarship, Special discount, etc."
                      value={values.reason}
                      onChange={handleChange}
                      error={errors.reason}
                      touched={touched.reason}
                    />
                    
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <CustomButton type="submit">
                        {editingCard ? 'Update Card' : 'Add Card'}
                      </CustomButton>
                    </div>
                  </>
                )}
              </BasicForm>
            </div>
          </div>
        )}

        <BasicAlertBox {...alertBox} />
      </div>
    </DashboardLayout>
  );
};

export default StudentCardManagement; 