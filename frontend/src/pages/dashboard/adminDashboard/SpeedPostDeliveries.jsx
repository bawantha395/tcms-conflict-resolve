import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import BasicTable from '../../../components/BasicTable';
import adminSidebarSections from './AdminDashboardSidebar';
import { FaTruck, FaSearch, FaFilter, FaCheckCircle, FaClock, FaMapMarkerAlt, FaUser, FaPhone, FaEnvelope, FaBook, FaCalendar, FaDownload, FaPrint, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import axios from 'axios';

const SpeedPostDeliveries = ({ onLogout }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, processing, delivered
  const [refreshing, setRefreshing] = useState(false);

  // Fetch speed post deliveries from payment backend
  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all payments that include speed post
      const paymentsResponse = await axios.get('http://localhost:8090/routes.php/get_all_payments');
      
      if (paymentsResponse.data.success) {
        const allPayments = paymentsResponse.data.data || [];
        
        // Filter payments that have Speed Post in notes
        const speedPostPayments = allPayments.filter(payment => {
          if (!payment.notes) return false;
          
          // Check if notes contain "Speed Post: <amount>" and amount > 0
          const speedPostMatch = payment.notes.match(/Speed Post:\s*(\d+)/i);
          if (speedPostMatch) {
            const speedPostFee = parseInt(speedPostMatch[1]);
            return speedPostFee > 0;
          }
          return false;
        });

        // Parse payment notes to extract delivery details
        const deliveryData = speedPostPayments.map(payment => {
          const notes = payment.notes || '';
          
          // Extract details from notes
          const extractField = (fieldName) => {
            const regex = new RegExp(`${fieldName}:\\s*([^,|]+)`, 'i');
            const match = notes.match(regex);
            return match ? match[1].trim() : '';
          };

          const speedPostMatch = notes.match(/Speed Post:\s*(\d+)/i);
          const speedPostFee = speedPostMatch ? parseInt(speedPostMatch[1]) : 0;

          return {
            id: payment.id,
            transactionId: payment.transaction_id,
            studentId: payment.user_id,
            studentName: payment.person_name,
            classId: payment.class_id,
            className: payment.class_name,
            amount: payment.amount,
            speedPostFee: speedPostFee,
            paymentDate: payment.date || payment.created_at,
            paymentStatus: payment.status,
            // Extract from notes
            firstName: extractField('First Name'),
            lastName: extractField('Last Name'),
            email: extractField('Email'),
            mobile: extractField('Mobile'),
            address: extractField('Address'),
            district: extractField('District'),
            tuteMedium: extractField('Tute Medium'),
            // Delivery status (stored separately or default to pending)
            deliveryStatus: payment.delivery_status || 'pending', // pending, processing, delivered
            notes: notes
          };
        });

        // Sort by payment date (newest first)
        deliveryData.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

        setDeliveries(deliveryData);
      } else {
        setError('Failed to fetch delivery data');
      }
    } catch (err) {
      console.error('Error fetching speed post deliveries:', err);
      setError('Failed to load speed post deliveries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh deliveries
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  };

  // Update delivery status
  const updateDeliveryStatus = async (transactionId, newStatus) => {
    try {
      console.log('Updating delivery status:', { transactionId, newStatus });
      
      // Update in payment backend
      const response = await axios.post('http://localhost:8090/routes.php/update_delivery_status', {
        transaction_id: transactionId,
        delivery_status: newStatus
      });

      console.log('Update response:', response.data);

      if (response.data.success) {
        // Update local state
        setDeliveries(prev => prev.map(d => 
          d.transactionId === transactionId 
            ? { ...d, deliveryStatus: newStatus }
            : d
        ));
        
        // Show success message (optional)
        console.log(`✅ Delivery status updated to: ${newStatus}`);
      } else {
        throw new Error(response.data.message || 'Failed to update delivery status');
      }
    } catch (err) {
      console.error('Error updating delivery status:', err);
      alert('Failed to update delivery status: ' + (err.response?.data?.message || err.message));
      
      // Refresh to show correct status from backend
      await fetchDeliveries();
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const filteredData = getFilteredDeliveries();
    
    const csvContent = [
      ['Transaction ID', 'Student ID', 'Student Name', 'Mobile', 'Email', 'Address', 'District', 'Class Name', 'Tute Medium', 'Speed Post Fee', 'Payment Date', 'Delivery Status'],
      ...filteredData.map(d => [
        d.transactionId,
        d.studentId,
        d.studentName,
        d.mobile,
        d.email,
        d.address,
        d.district,
        d.className,
        d.tuteMedium || 'Not specified',
        d.speedPostFee,
        new Date(d.paymentDate).toLocaleDateString(),
        d.deliveryStatus
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speed_post_deliveries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Print delivery list - Only pending deliveries as letter addresses
  const handlePrint = () => {
    // Filter only pending deliveries
    const pendingDeliveries = deliveries.filter(d => d.deliveryStatus === 'pending');
    
    if (pendingDeliveries.length === 0) {
      alert('No pending deliveries to print');
      return;
    }

    // Create print window
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Speed Post Delivery Addresses</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            padding: 15mm;
            color: #000;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            margin-bottom: 20mm;
            border-bottom: 2px solid #000;
            padding-bottom: 5mm;
          }
          .header h1 {
            margin: 0;
            font-size: 22pt;
            font-weight: bold;
          }
          .header p {
            margin: 3mm 0 0 0;
            font-size: 11pt;
          }
          .address-container {
            page-break-inside: avoid;
            margin-bottom: 15mm;
            border: 2px solid #000;
            padding: 8mm;
            background: #fff;
          }
          .address-number {
            font-weight: bold;
            font-size: 10pt;
            color: #666;
            margin-bottom: 5mm;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 2mm;
          }
          .address-to {
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 3mm;
            text-decoration: underline;
          }
          .name {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 2mm;
          }
          .student-id {
            font-size: 10pt;
            color: #555;
            margin-bottom: 4mm;
          }
          .address-line {
            font-size: 12pt;
            margin: 2mm 0;
            padding-left: 5mm;
          }
          .district {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 3mm;
            padding-left: 5mm;
          }
          .contact-info {
            margin-top: 5mm;
            padding-top: 3mm;
            border-top: 1px solid #ccc;
            font-size: 10pt;
          }
          .contact-info div {
            margin: 1mm 0;
          }
          .contact-label {
            display: inline-block;
            width: 25mm;
            font-weight: bold;
          }
          .additional-info {
            margin-top: 4mm;
            padding: 3mm;
            background: #f5f5f5;
            border-left: 3px solid #333;
            font-size: 10pt;
          }
          .medium-badge {
            display: inline-block;
            padding: 1mm 3mm;
            background: #000;
            color: #fff;
            font-weight: bold;
            font-size: 9pt;
            margin-left: 5mm;
          }
          @media print {
            body {
              padding: 10mm;
            }
            .address-container {
              page-break-inside: avoid;
              margin-bottom: 10mm;
            }
            @page {
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📮 SPEED POST DELIVERY ADDRESSES</h1>
          <p>Date: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })} | Total: ${pendingDeliveries.length} Deliveries</p>
        </div>
        
        ${pendingDeliveries.map((delivery, index) => `
          <div class="address-container">
            <div class="address-number">Delivery #${index + 1}</div>
            
            <div class="address-to">TO:</div>
            
            <div class="name">${delivery.studentName}</div>
            <div class="student-id">Student ID: ${delivery.studentId}</div>
            
            <div class="address-line">${delivery.address || 'Address not provided'}</div>
            <div class="district">${delivery.district || 'District not specified'}</div>
            
            <div class="contact-info">
              <div>
                <span class="contact-label">Mobile:</span>
                <span>${delivery.mobile || 'N/A'}</span>
              </div>
              ${delivery.email ? `
              <div>
                <span class="contact-label">Email:</span>
                <span>${delivery.email}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="additional-info">
              <strong>Class:</strong> ${delivery.className}
              <span class="medium-badge">${delivery.tuteMedium || 'Medium Not Specified'}</span>
            </div>
          </div>
        `).join('')}
        
        <script>
          window.onload = function() {
            window.print();
            // Optionally close the window after printing
            // window.onafterprint = function() { window.close(); };
          }
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  // Filter deliveries based on search and status
  const getFilteredDeliveries = () => {
    return deliveries.filter(delivery => {
      // Status filter
      if (statusFilter !== 'all' && delivery.deliveryStatus !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          delivery.studentName?.toLowerCase().includes(search) ||
          delivery.studentId?.toLowerCase().includes(search) ||
          delivery.className?.toLowerCase().includes(search) ||
          delivery.transactionId?.toLowerCase().includes(search) ||
          delivery.mobile?.includes(search) ||
          delivery.address?.toLowerCase().includes(search) ||
          delivery.district?.toLowerCase().includes(search)
        );
      }

      return true;
    });
  };

  const filteredDeliveries = getFilteredDeliveries();

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1">
            <FaClock size={12} /> Pending
          </span>
        );
      case 'processing':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
            <FaTruck size={12} /> Processing
          </span>
        );
      case 'delivered':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300 flex items-center gap-1">
            <FaCheckCircle size={12} /> Delivered
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">
            Unknown
          </span>
        );
    }
  };

  // Get statistics
  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.deliveryStatus === 'pending').length,
    processing: deliveries.filter(d => d.deliveryStatus === 'processing').length,
    delivered: deliveries.filter(d => d.deliveryStatus === 'delivered').length,
    totalRevenue: deliveries.reduce((sum, d) => sum + (d.speedPostFee || 0), 0)
  };

  if (loading) {
    return (
      <DashboardLayout sidebarItems={adminSidebarSections} onLogout={onLogout}>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading deliveries...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarSections} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FaTruck className="text-blue-600" />
                Speed Post Deliveries
              </h1>
              <p className="text-gray-600 mt-1">Manage study material deliveries for students</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <FaSync className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FaDownload />
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <FaPrint />
                Print
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-600">
              <div className="text-sm text-gray-600">Total Deliveries</div>
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-600">
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-600">
              <div className="text-sm text-gray-600">Processing</div>
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-600">
              <div className="text-sm text-gray-600">Delivered</div>
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-600">
              <div className="text-sm text-gray-600">Total Revenue</div>
              <div className="text-xl font-bold text-purple-600">LKR {stats.totalRevenue.toLocaleString()}</div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID, class, mobile, address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-600" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <FaExclamationTriangle />
            {error}
          </div>
        )}

        {/* Deliveries List */}
        <BasicTable
          columns={[
            {
              key: 'transaction',
              label: 'Transaction',
              render: (delivery) => (
                <div>
                  <div className="text-sm font-mono text-gray-900">{delivery.transactionId}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <FaCalendar size={10} />
                    {new Date(delivery.paymentDate).toLocaleDateString()}
                  </div>
                </div>
              )
            },
            {
              key: 'student',
              label: 'Student Details',
              render: (delivery) => (
                <div>
                  <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                    <FaUser size={12} className="text-blue-600" />
                    {delivery.studentName}
                  </div>
                  <div className="text-xs text-gray-600">ID: {delivery.studentId}</div>
                  <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                    <FaPhone size={10} />
                    {delivery.mobile}
                  </div>
                  {delivery.email && (
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <FaEnvelope size={10} />
                      {delivery.email}
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'address',
              label: 'Delivery Address',
              render: (delivery) => (
                <div className="flex items-start gap-2">
                  <FaMapMarkerAlt className="text-red-600 mt-1" size={12} />
                  <div>
                    <div className="text-sm text-gray-900 max-w-xs">{delivery.address || 'Not provided'}</div>
                    <div className="text-xs text-gray-600 font-semibold">{delivery.district || 'Not specified'}</div>
                  </div>
                </div>
              )
            },
            {
              key: 'className',
              label: 'Class',
              render: (delivery) => (
                <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <FaBook size={12} className="text-purple-600" />
                  {delivery.className}
                </div>
              )
            },
            {
              key: 'tuteMedium',
              label: 'Medium',
              render: (delivery) => (
                <div className="text-sm font-medium text-blue-700">
                  {delivery.tuteMedium || 'Not specified'}
                </div>
              )
            },
            {
              key: 'speedPostFee',
              label: 'Fee',
              render: (delivery) => (
                <div className="text-sm font-bold text-green-600">
                  LKR {delivery.speedPostFee?.toLocaleString()}
                </div>
              )
            },
            {
              key: 'paymentDate',
              label: 'Date',
              render: (delivery) => (
                <div className="text-sm text-gray-700">
                  {new Date(delivery.paymentDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              )
            },
            {
              key: 'deliveryStatus',
              label: 'Status',
              render: (delivery) => getStatusBadge(delivery.deliveryStatus)
            }
          ]}
          data={filteredDeliveries}
          actions={(delivery) => (
            <select
              value={delivery.deliveryStatus}
              onChange={(e) => updateDeliveryStatus(delivery.transactionId, e.target.value)}
              className="text-sm px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
            </select>
          )}
          loading={loading}
          emptyMessage={
            searchTerm || statusFilter !== 'all' 
              ? 'No deliveries match your search criteria.' 
              : 'No students have selected speed post delivery yet.'
          }
        />
      </div>
    </DashboardLayout>
  );
};

export default SpeedPostDeliveries;
