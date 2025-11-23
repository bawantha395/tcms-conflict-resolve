import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import CustomButton2 from '../../../components/CustomButton2';
import { FaCcVisa, FaCcMastercard, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createPayment, processPayment } from '../../../api/payments';
import { createPayHerePayment } from '../../../api/payhere';
import { getUserData } from '../../../api/apiUtils';
import api from '../../../api/axiosConfig';

// REMINDER: Add this to your public/index.html
// <script type="text/javascript" src="https://www.payhere.lk/lib/payhere.js"></script>

const Invoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;
  const [agreed, setAgreed] = useState(false);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debug: Log the received data
  console.log('📄 Invoice received data:', data);
  console.log('📄 Payment data:', data?.paymentData);

  if (!data) {
    return <div className="p-8 text-center text-gray-500">No invoice data. Please complete checkout first.</div>;
  }

  // PayHere integration - Using Backend API
  const handlePayHere = async () => {
    if (!agreed) {
      alert('Please agree to the privacy policy and terms first.');
      return;
    }

    setLoading(true);
    
    try {
      console.log('💳 Starting PayHere payment process...');
      console.log('📊 Invoice data:', data);
      
      // Get logged-in student data
      const userData = getUserData();
      if (!userData || !userData.userid) {
        alert('No logged-in user found. Please login again.');
        setLoading(false);
        return;
      }
      
      const studentId = userData.userid;
      console.log('🔍 Processing payment for logged-in student:', studentId);
      
      let transactionId = data.transactionId;
      console.log('🔍 Current transactionId:', transactionId);
      
      // If no transactionId exists, we'll create the payment later with student details
      if (!transactionId && !data.paymentData) {
        console.error('❌ Payment data is missing:', data);
        alert('Payment data is missing. Please try again.');
        setLoading(false);
        return;
      }

      // Fetch actual student details from student backend
      let studentDetails = null;
      try {
        console.log('🔍 Fetching student details for user ID:', userData.userid);
        const studentResponse = await fetch(`http://localhost:8086/routes.php/get_with_id/${userData.userid}`);
        const studentResult = await studentResponse.json();
        console.log('🔍 Student API response:', studentResult);
        if (studentResult && studentResult.user_id) {
          studentDetails = studentResult;
          console.log('✅ Student details fetched successfully:', studentDetails);
        } else {
          console.warn('⚠️ Student details not found or invalid response');
        }
      } catch (e) {
        console.error('❌ Error fetching student details:', e);
      }

      // Prefer numeric student ID from profile if available to ensure backend stores correctly
      const finalStudentId = (studentDetails?.user_id ?? userData.userid);

      // Create PayHere payment data
      const payHereData = {
        order_id: transactionId,
        amount: data.amount || data.finalAmount || data.basePrice, // Use the total amount that includes all fees
        currency: 'LKR',
        first_name: studentDetails?.first_name || userData.firstName || userData.name?.split(' ')[0] || 'Student',
        last_name: studentDetails?.last_name || userData.lastName || userData.name?.split(' ').slice(1).join(' ') || 'User',
        email: studentDetails?.email || userData.email || 'student@example.com',
        phone: studentDetails?.mobile || userData.phone || '+94123456789',
        address: studentDetails?.address || userData.address || 'Student Address',
        city: studentDetails?.district || userData.city || 'Colombo',
        country: 'Sri Lanka',
        items: `${data.className} - ${data.isStudyPack ? 'Study Pack' : (data.subject || 'Course')}`,
        // Custom fields for tracking (student_id should be numeric when possible)
        student_id: data.paymentData?.studentId || String(userData.userid),
        class_id: data.paymentData?.classId || data.classId
      };

      console.log('💳 Creating PayHere payment:', payHereData);
      console.log('💰 Amount breakdown:', {
        basePrice: data.basePrice,
        finalAmount: data.finalAmount,
        amount: data.amount,
        speedPostFee: data.speedPostFee,
        discount: data.discount,
        usedAmount: payHereData.amount
      });

      // Create or update the payment record in our database with student details
      const paymentRecordData = {
        studentId: String(finalStudentId),
        studentName: `${studentDetails?.first_name || ''} ${studentDetails?.last_name || ''}`.trim() || 'Student',
        classId: data.paymentData?.classId || data.classId,
        amount: payHereData.amount,
        paymentMethod: 'online',
        // CRITICAL FIX: Use notes from paymentData (contains renewal info) or create default notes
        notes: data.paymentData?.notes || `Promo: ${data.discount || 0}, Theory Discount: 0, Speed Post: ${data.speedPostFee || 0}`,
        // CRITICAL FIX: Include isRenewal flag for renewal payments
        isRenewal: data.isRenewal || false, // Pass renewal flag to backend
        isStudyPack: data.isStudyPack || false,
        className: data.className,
        // Include student details for database storage
        firstName: studentDetails?.first_name,
        lastName: studentDetails?.last_name,
        email: studentDetails?.email,
        mobile: studentDetails?.mobile_number,
        address: studentDetails?.address,
        district: studentDetails?.district,
        medium: data.medium, // Include tute medium for delivery tracking
      };

      console.log('💾 Creating payment record with student details:', paymentRecordData);
      console.log('🔄 Renewal payment flag:', data.isRenewal);
      console.log('📝 Payment notes:', paymentRecordData.notes);
      
      let paymentRecordResponse;
      if (transactionId) {
        // If we already have a transactionId, update the existing payment
        console.log('🔄 Updating existing payment with transactionId:', transactionId);
        paymentRecordResponse = await processPayment(transactionId, paymentRecordData);
      } else {
        // Create new payment record
        paymentRecordResponse = await createPayment(paymentRecordData);
      }
      
      if (!paymentRecordResponse.success) {
        throw new Error(paymentRecordResponse.message || 'Failed to create/update payment record');
      }

      console.log('✅ Payment record created/updated:', paymentRecordResponse);
      
      // Update transactionId if it was generated
      if (paymentRecordResponse.data && paymentRecordResponse.data.transactionId) {
        transactionId = paymentRecordResponse.data.transactionId;
        payHereData.order_id = transactionId;
      }

      // Call PayHere API using the proper function
      const payHereResponse = await createPayHerePayment(payHereData);
      
      if (!payHereResponse.success) {
        throw new Error(payHereResponse.message || 'Failed to create PayHere payment');
      }

      console.log('✅ PayHere payment created:', payHereResponse);



      // Redirect to PayHere checkout
      const paymentData = payHereResponse.data;
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://sandbox.payhere.lk/pay/checkout';
      
      Object.entries(paymentData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      
    } catch (err) {
      console.error('PayHere payment error:', err);
      const errorMessage = err.message || 'Network or server error';
      alert('PayHere payment failed: ' + errorMessage);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Aperio', 15, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('NO 44/11/C Henati Kubura Road', 15, 28);
    doc.text('Thalangama Noth, Sri Lanka', 15, 34);
    doc.text('+94 70 424 4444', 15, 40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`INVOICE INV:${data.transactionId || data.invoiceId || 'N/A'}`, 195, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Date Issued: ${data.date}`, 195, 28, { align: 'right' });

    // Line
    doc.setDrawColor(180);
    doc.line(15, 46, 195, 46);

    // Student details
    let y = 54;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Student Details :', 15, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Name: ${data.fullName || data.lastName}${data.studentId ? '-' + data.studentId : ''}`, 15, y);
    y += 6;
    doc.text(`Address: ${data.address || '-'}`, 15, y);
    y += 6;
    doc.text(`Email: ${data.email}`, 15, y);
    y += 6;
    doc.text(`Mobile: ${data.mobile}${data.otherMobile ? ' | Other Mobile: ' + data.otherMobile : ''}`, 15, y);
    y += 6;
    doc.text(`Paid By: ${data.paymentMethod || 'Online'} - ${paid ? 'Paid' : 'Unpaid'}`, 15, y);

    // Item and summary table
    y += 10;
    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qty', 'Price']],
      body: [
        [data.className, '1', `LKR ${data.basePrice?.toLocaleString()}`],
        [
          { content: 'Sub Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
          `LKR ${data.basePrice?.toLocaleString()}`
        ],
        [
          { content: 'Discount', colSpan: 2, styles: { halign: 'right' } },
          `LKR ${data.discount?.toLocaleString()}`
        ],
        [
          { content: 'Speed Post', colSpan: 2, styles: { halign: 'right' } },
          `LKR ${data.speedPostFee?.toLocaleString()}`
        ],
        [
          { content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `LKR ${data.amount?.toLocaleString()}`, styles: { fontStyle: 'bold' } }
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [42, 157, 143], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 11, cellPadding: 3 },
      margin: { left: 20, right: 20 }
    });

    // Note
    let noteY = doc.lastAutoTable.finalY + 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('NOTE: The above amount is charged only for your order. (Once paid, your classes and orders cannot be changed.)', 15, noteY, { maxWidth: 180 });

    doc.save(`invoice_${data.transactionId || data.invoiceId || 'unknown'}.pdf`);
  };

  return (
    <DashboardLayout userRole="Student" sidebarItems={studentSidebarSections}>
      <div className="min-h-screen bg-[#fafaf6] flex flex-col items-center py-8">
        <div className="bg-white rounded-xl shadow p-8 w-full max-w-4xl flex flex-col md:flex-row gap-8">
          {/* Left: Logo and Address */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl font-bold">Ⓔ</span>
              <span className="text-xl font-bold">APEIRO</span>
            </div>
            <div className="text-sm text-gray-700 mb-2">NO 44/11/C Henati Kubura Road<br/>Thalangama Noth,Sri Lanka<br/>+94 70 424 4444</div>
          </div>
          {/* Right: Invoice Info and Payment */}
          <div className="w-full md:w-80 flex flex-col items-end">
            <div className="text-right mb-2">
              <div className="font-bold">INVOICE INV-{data.transactionId || data.invoiceId || '751989'}</div>
              <div className="text-xs text-gray-500">Date Issued: {data.date || (new Date()).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center mb-2">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="accent-pink-600 mr-2" id="agree" />
              <label htmlFor="agree" className="text-xs">I agree to <span className="text-pink-600 underline">privacy policy & terms</span></label>
            </div>
            <CustomButton2
              type="button"
              color={paid ? 'danger' : 'mint'}
              className={`w-full mb-2 ${paid ? 'bg-gray-400 hover:bg-gray-500 text-white' : ''}`}
              onClick={handlePayHere}
              disabled={!agreed || paid || loading}
            >
              {loading ? 'Processing Payment...' : paid ? 'Payment Successful!' : 'Confirm and Pay Now'}
            </CustomButton2>
            
            <div className="flex items-center gap-2 mb-2">
              <FaCcVisa className="text-3xl text-blue-700" />
              <FaCcMastercard className="text-3xl text-red-600" />
              
            </div>
            
          </div>
        </div>
        {/* Student Details and Items */}
        <div className="bg-white rounded-xl shadow p-8 w-full max-w-4xl mt-6">
          <div className="mb-4">
            <div className="font-semibold mb-2">Student Details:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="font-bold">Name:</span> {data.fullName || data.lastName}</div>
              <div><span className="font-bold">Address:</span> {data.address || '-'}</div>
              <div><span className="font-bold">Email:</span> {data.email}</div>
              <div><span className="font-bold">Mobile:</span> {data.mobile}</div>
              <div><span className="font-bold">Medium:</span> {data.medium}</div>
              <div><span className="font-bold">Invoice Status:</span> <span className={`px-2 py-1 rounded text-xs ${paid ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{paid ? 'Paid' : 'Unpaid'}</span></div>
            </div>
          </div>
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-12 text-xs font-bold text-gray-500 mb-2">
              <div className="col-span-7">ITEM</div>
              <div className="col-span-2 text-center">QTY</div>
              <div className="col-span-3 text-right">PRICE</div>
            </div>
            <div className="grid grid-cols-12 text-sm mb-2">
              <div className="col-span-7">{data.className}</div>
              <div className="col-span-2 text-center">1</div>
              <div className="col-span-3 text-right">LKR {data.basePrice?.toLocaleString()}</div>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-end text-xs text-green-600 mb-1">Promo Applied: - LKR {data.discount.toLocaleString()}</div>
            )}
            {data.speedPostFee > 0 && (
              <div className="flex justify-end text-xs text-red-600 mb-1">Speed Post: + LKR {data.speedPostFee.toLocaleString()}</div>
            )}
            <div className="flex justify-end font-bold mt-2">Total: LKR {data.amount?.toLocaleString()}</div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <span className="font-bold">Note:</span> ඉහත සඳහන් මුදල සම්පූර්ණයෙන්ම අය කරනු ලබන්නේ ඔබගේ ඇනවුම සදහා පමණි. (මුදල් once paid ඇතුළු ඔබගේ පන්ති හා ඇනවුම් වෙනස් කල නොහැක.)
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Invoice; 